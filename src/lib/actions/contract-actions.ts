"use server";

import type { ContractStatus, Prisma } from "@prisma/client";
import type { ContractActionState } from "@/lib/actions/contract-action-state";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { createContractSchema } from "@/lib/validation/contract";
import { buildContractNotificationVariables } from "@/lib/notifications/event-variables";
import { checkContractReservationAvailability } from "@/lib/contracts/reservation-availability";
import { dispatchOwnerNotification } from "@/lib/notifications/owner-notification-dispatcher";
import { dispatchCustomerSmsNotification } from "@/lib/notifications/customer-notification-dispatcher";
import { createAuditLog, sanitizeAuditPayload } from "@/lib/audit/audit-log-service";
import { buildAuditMessage, buildStatusChangeMessage, getAuditActorName } from "@/lib/audit/audit-log-messages";
import { contractStatusLabels } from "@/lib/contracts/display";
import { parseDateLikeToDate, toDateOnlyString } from "@/lib/date/jalali";


const contractIdSchema = z.object({
  contractId: z.string().trim().min(1, "شناسه قرارداد معتبر نیست.").max(128, "شناسه قرارداد معتبر نیست."),
});

const contractStatuses = [
  "DRAFT",
  "RESERVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
] as const satisfies readonly ContractStatus[];


const totalModeSchema = z.enum(["AUTO", "MANUAL"]).catch("AUTO");
const editLineItemTypes = ["PACKAGE", "SERVICE", "MENU", "DRINK", "DESSERT"] as const;
const editPricingTypes = ["FIXED", "PER_GUEST", "PER_HOUR", "PER_ITEM", "CUSTOM"] as const;

const editContractLineItemSchema = z.object({
  id: z.string().trim().max(128).optional().nullable(),
  type: z.enum(editLineItemTypes),
  pricingType: z.enum(editPricingTypes).optional().nullable(),
  sourceId: z.string().trim().max(128).optional().nullable(),
  category: z.string().trim().max(150).optional().nullable(),
  name: z.string().trim().min(1, "نام آیتم قرارداد الزامی است.").max(150),
  quantity: z.coerce.number().int().positive("تعداد آیتم قرارداد معتبر نیست."),
  unitLabel: z.string().trim().max(50).optional().nullable(),
  unitPrice: z.coerce.number().nonnegative("قیمت واحد معتبر نیست."),
  totalPrice: z.coerce.number().nonnegative("جمع آیتم معتبر نیست."),
  note: z.string().trim().max(500).optional().nullable(),
});

function parseManualMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[٬،,\s]/g, "");
  const parsed = Number(normalized || "0");
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function parseTotalMode(value: FormDataEntryValue | null) {
  return value === "MANUAL" ? "MANUAL" as const : "AUTO" as const;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : undefined;
}

function parseOptionalId(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized !== "none" ? normalized : undefined;
}

function parsePositiveInteger(value: FormDataEntryValue | null) {
  const parsed = parseManualMoney(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function parseEditDate(value: FormDataEntryValue | null) {
  return parseDateLikeToDate(String(value ?? ""));
}

function parseEditTime(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(normalized)
    ? normalized.padStart(5, "0")
    : "";
}

function parseEditLineItems(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

const editContractSchema = z.object({
  contractId: z.string().trim().min(1, "شناسه قرارداد معتبر نیست.").max(128, "شناسه قرارداد معتبر نیست."),
  salutation: z.string().trim().max(40).optional(),
  customerName: z.string().trim().min(1, "نام مشتری الزامی است.").max(120),
  customerMobile: z.string().trim().min(10, "شماره همراه مشتری معتبر نیست.").max(30),
  nationalCode: z.string().trim().max(20).optional(),
  address: z.string().trim().max(500).optional(),
  eventTypeId: z.string().trim().max(128).optional(),
  customEventType: z.string().trim().max(80).optional(),
  eventDate: z.date(),
  eventStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت شروع معتبر نیست."),
  eventEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت پایان معتبر نیست."),
  guestCount: z.number().int().positive("تعداد مهمان معتبر نیست."),
  hallId: z.string().trim().max(128).optional(),
  salonId: z.string().trim().max(128).optional(),
  status: z.enum(contractStatuses),
  notes: z.string().trim().max(1000).optional(),
  editReason: z.string().trim().max(500).optional(),
  servicesTotalMode: totalModeSchema,
  servicesManualTotal: z.number().finite().nonnegative(),
  menuTotalMode: totalModeSchema,
  menuManualTotal: z.number().finite().nonnegative(),
  finalTotalMode: totalModeSchema,
  finalManualTotal: z.number().finite().nonnegative(),
  remainingAmountMode: totalModeSchema,
  remainingManualAmount: z.number().finite().nonnegative(),
  discountAmount: z.number().finite().nonnegative(),
  depositAmount: z.number().finite().nonnegative(),
  lineItems: z.array(editContractLineItemSchema),
}).superRefine((value, context) => {
  if (!value.eventTypeId && !value.customEventType) {
    context.addIssue({
      code: "custom",
      path: ["eventTypeId"],
      message: "نوع مراسم باید انتخاب یا وارد شود.",
    });
  }

  const start = value.eventStartTime.split(":").map(Number);
  const end = value.eventEndTime.split(":").map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  const normalizedEnd = endMinutes < startMinutes ? endMinutes + 24 * 60 : endMinutes;

  if (normalizedEnd <= startMinutes) {
    context.addIssue({
      code: "custom",
      path: ["eventEndTime"],
      message: "ساعت پایان باید بعد از ساعت شروع باشد.",
    });
  }
});

function parseEditContractForm(formData: FormData) {
  return editContractSchema.safeParse({
    contractId: formData.get("contractId"),
    salutation: parseOptionalText(formData.get("salutation")),
    customerName: String(formData.get("customerName") ?? ""),
    customerMobile: String(formData.get("customerMobile") ?? ""),
    nationalCode: parseOptionalText(formData.get("nationalCode")),
    address: parseOptionalText(formData.get("address")),
    eventTypeId: parseOptionalId(formData.get("eventTypeId")),
    customEventType: parseOptionalText(formData.get("customEventType")),
    eventDate: parseEditDate(formData.get("eventDate")),
    eventStartTime: parseEditTime(formData.get("eventStartTime")),
    eventEndTime: parseEditTime(formData.get("eventEndTime")),
    guestCount: parsePositiveInteger(formData.get("guestCount")),
    hallId: parseOptionalId(formData.get("hallId")),
    salonId: parseOptionalId(formData.get("salonId")),
    status: String(formData.get("status") ?? ""),
    notes: parseOptionalText(formData.get("notes")),
    editReason: parseOptionalText(formData.get("editReason")),
    servicesTotalMode: parseTotalMode(formData.get("servicesTotalMode")),
    servicesManualTotal: parseManualMoney(formData.get("servicesManualTotal")),
    menuTotalMode: parseTotalMode(formData.get("menuTotalMode")),
    menuManualTotal: parseManualMoney(formData.get("menuManualTotal")),
    finalTotalMode: parseTotalMode(formData.get("finalTotalMode")),
    finalManualTotal: parseManualMoney(formData.get("finalManualTotal")),
    remainingAmountMode: parseTotalMode(formData.get("remainingAmountMode")),
    remainingManualAmount: parseManualMoney(formData.get("remainingManualAmount")),
    discountAmount: parseManualMoney(formData.get("discountAmount")),
    depositAmount: parseManualMoney(formData.get("depositAmount")),
    lineItems: parseEditLineItems(formData.get("lineItems")),
  });
}

function calculatePaidAmountForContract(payments: { amount: { toString(): string } | string | number; type?: string | null; status?: string | null }[], depositAmount: number) {
  const paymentsTotal = payments.reduce((sum, payment) => {
    if (!hasActiveReceiptStatus(payment.status)) {
      return sum;
    }

    const amount = toNumber(payment.amount);
    return sum + (payment.type === "REFUND" ? -amount : amount);
  }, 0);

  return paymentsTotal > 0 ? paymentsTotal : depositAmount;
}

const inactivePaymentStatuses = new Set(["CANCELED", "CANCELLED", "RETURNED", "VOID"]);

function hasActiveReceiptStatus(status: string | null | undefined) {
  return !inactivePaymentStatuses.has(String(status ?? "").toUpperCase());
}

function getRemainingAmountAfterReceipts(input: {
  finalTotal: { toString(): string } | string | number | null | undefined;
  depositAmount: { toString(): string } | string | number | null | undefined;
  payments: { amount: { toString(): string } | string | number; type?: string | null; status?: string | null }[];
}) {
  const finalTotal = toNumber(input.finalTotal);
  const paidAmount = calculatePaidAmountForContract(input.payments, toNumber(input.depositAmount));

  return Math.max(0, finalTotal - paidAmount);
}

function getClosedCancellationFinancialPatch() {
  return {
    remainingAmount: "0",
    remainingAmountManual: false,
  };
}

function toNumber(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

type AuditJsonValue = string | number | boolean | null | AuditJsonValue[] | { [key: string]: AuditJsonValue };

function isDecimalLike(value: unknown): value is { toNumber?: () => number; toString: () => string } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { constructor?: { name?: string }; toNumber?: () => number; toString?: () => string };
  return candidate.constructor?.name === "Decimal" && typeof candidate.toString === "function";
}

function toAuditJsonSafe(value: unknown, seen = new WeakSet<object>()): AuditJsonValue | undefined {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (isDecimalLike(value)) {
    const numericValue = typeof value.toNumber === "function" ? value.toNumber() : Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : value.toString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => toAuditJsonSafe(item, seen))
      .filter((item): item is AuditJsonValue => item !== undefined);
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);
    const output: Record<string, AuditJsonValue> = {};

    for (const [key, child] of Object.entries(value)) {
      if (key === "constructor") {
        continue;
      }

      const safeChild = toAuditJsonSafe(child, seen);
      if (safeChild !== undefined) {
        output[key] = safeChild;
      }
    }

    seen.delete(value);
    return output;
  }

  return null;
}

function toAuditJson(value: unknown): Prisma.InputJsonValue {
  return (toAuditJsonSafe(value) ?? null) as Prisma.InputJsonValue;
}

function normalizeAuditComparable(value: unknown) {
  if (value instanceof Date) {
    return toDateOnlyString(value);
  }

  if (value && typeof value === "object" && "toString" in value && value.constructor?.name === "Decimal") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => sanitizeAuditPayload(item)));
  }

  return value ?? null;
}

function buildChangedFields(changes: { label: string; before: unknown; after: unknown }[]) {
  return changes.filter((change) => {
    const beforeValue = normalizeAuditComparable(change.before);
    const afterValue = normalizeAuditComparable(change.after);
    return JSON.stringify(beforeValue) !== JSON.stringify(afterValue);
  }).map((change) => ({
    field: change.label,
    before: normalizeAuditComparable(change.before),
    after: normalizeAuditComparable(change.after),
  }));
}

function summarizeLineItemsForAudit(items: { type: string; name: string; quantity: number; unitPrice: unknown; totalPrice: unknown; note?: string | null }[]) {
  return items.map((item) => ({
    type: item.type,
    name: item.name,
    quantity: item.quantity,
    unitPrice: toNumber(item.unitPrice as { toString(): string } | string | number),
    totalPrice: toNumber(item.totalPrice as { toString(): string } | string | number),
    note: item.note ?? null,
  }));
}

async function fetchContractForNotification(
  db: Awaited<ReturnType<typeof getPrisma>>,
  tenantId: string,
  contractId: string,
) {
  return db.contract.findFirst({
    where: { id: contractId, tenantId },
    select: {
      id: true,
      customerId: true,
      contractNo: true,
      status: true,
      eventTypeName: true,
      eventDate: true,
      eventStartTime: true,
      eventEndTime: true,
      guestCount: true,
      packageName: true,
      notes: true,
      finalTotal: true,
      depositAmount: true,
      remainingAmount: true,
      payments: {
        select: {
          amount: true,
          type: true,
          status: true,
        },
      },
      lineItems: {
        select: {
          type: true,
          name: true,
          quantity: true,
          unitLabel: true,
          totalPrice: true,
          note: true,
        },
        orderBy: { createdAt: "asc" },
      },
      customer: {
        select: {
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      hall: { select: { name: true, city: true, address: true, phone: true } },
      salon: { select: { name: true } },
    },
  });
}

async function dispatchContractTelegramNotificationSafely(input: {
  db: Awaited<ReturnType<typeof getPrisma>>;
  tenantId: string;
  tenant: { name?: string | null };
  contractId: string;
  eventType: "CONTRACT_CREATED" | "CONTRACT_UPDATED" | "CONTRACT_STATUS_CHANGED" | "CONTRACT_CANCELED";
  actorName?: string;
  sendCustomerWelcome?: boolean;
}) {
  try {
    const contract = await fetchContractForNotification(input.db, input.tenantId, input.contractId);

    if (!contract) {
      return;
    }

    const variables = {
      ...buildContractNotificationVariables(contract, input.tenant),
      operatorName: input.actorName ?? "سامانه",
      userName: input.actorName ?? "سامانه",
    };

    await dispatchOwnerNotification({
      tenantId: input.tenantId,
      eventType: input.eventType,
      variables,
      relatedContractId: contract.id,
      relatedCustomerId: contract.customerId,
    });

    if (input.eventType === "CONTRACT_CREATED") {
      if (input.sendCustomerWelcome) {
        await dispatchCustomerSmsNotification({
          tenantId: input.tenantId,
          eventType: "CUSTOMER_CREATED",
          customerMobile: contract.customer?.phone,
          customerName: contract.customer?.fullName,
          variables,
          relatedContractId: contract.id,
          relatedCustomerId: contract.customerId,
        });
      }

      await dispatchCustomerSmsNotification({
        tenantId: input.tenantId,
        eventType: "CONTRACT_CREATED",
        customerMobile: contract.customer?.phone,
        customerName: contract.customer?.fullName,
        variables,
        relatedContractId: contract.id,
        relatedCustomerId: contract.customerId,
      });
    }

    if (input.eventType === "CONTRACT_CANCELED") {
      await dispatchCustomerSmsNotification({
        tenantId: input.tenantId,
        eventType: "CONTRACT_CANCELED",
        customerMobile: contract.customer?.phone,
        customerName: contract.customer?.fullName,
        variables,
        relatedContractId: contract.id,
        relatedCustomerId: contract.customerId,
      });
    }

    if (input.eventType === "CONTRACT_STATUS_CHANGED" && String(contract.status).toUpperCase() === "COMPLETED") {
      await dispatchCustomerSmsNotification({
        tenantId: input.tenantId,
        eventType: "CONTRACT_STATUS_CHANGED",
        customerMobile: contract.customer?.phone,
        customerName: contract.customer?.fullName,
        variables,
        relatedContractId: contract.id,
        relatedCustomerId: contract.customerId,
      });
    }
  } catch {
    // اعلان مدیریتی best-effort است و نباید عملیات اصلی قرارداد را شکست دهد.
  }
}

async function dispatchCustomerContractFinalizedSmsSafely(input: {
  db: Awaited<ReturnType<typeof getPrisma>>;
  tenantId: string;
  tenant: { name?: string | null };
  contractId: string;
  actorName?: string;
}) {
  try {
    const contract = await fetchContractForNotification(input.db, input.tenantId, input.contractId);

    if (!contract || String(contract.status).toUpperCase() !== "COMPLETED") {
      return;
    }

    const variables = {
      ...buildContractNotificationVariables(contract, input.tenant),
      operatorName: input.actorName ?? "سامانه",
      userName: input.actorName ?? "سامانه",
    };

    await dispatchCustomerSmsNotification({
      tenantId: input.tenantId,
      eventType: "CONTRACT_STATUS_CHANGED",
      customerMobile: contract.customer?.phone,
      customerName: contract.customer?.fullName,
      variables,
      relatedContractId: contract.id,
      relatedCustomerId: contract.customerId,
    });
  } catch {
    // پیام مشتری best-effort است و نباید تسویه نهایی قرارداد را شکست دهد.
  }
}

function getCatalogPrice(item: {
  pricingType: "FIXED" | "PER_GUEST" | "PER_HOUR" | "PER_ITEM" | "CUSTOM";
  price: { toString(): string } | string | number;
  basePrice?: { toString(): string } | string | number | null;
}) {
  if (item.pricingType === "FIXED") {
    return item.basePrice === null || item.basePrice === undefined
      ? toNumber(item.price)
      : toNumber(item.basePrice);
  }

  return toNumber(item.price);
}


function isManualContractLineType(
  type: "PACKAGE" | "SERVICE" | "MENU" | "DRINK" | "DESSERT",
  servicesTotalMode: "AUTO" | "MANUAL",
  menuTotalMode: "AUTO" | "MANUAL",
) {
  if (type === "PACKAGE") {
    return false;
  }

  return type === "SERVICE"
    ? servicesTotalMode === "MANUAL"
    : menuTotalMode === "MANUAL";
}

function getMenuLineType(category: string | null) {
  const normalizedCategory = category ?? "";

  if (normalizedCategory.includes("نوشیدنی")) {
    return "DRINK" as const;
  }

  if (normalizedCategory.includes("دسر")) {
    return "DESSERT" as const;
  }

  return "MENU" as const;
}


function parseDraftLineItems(value: FormDataEntryValue | null) {
  const parsed = parseEditLineItems(value);
  const result = z.array(editContractLineItemSchema).safeParse(parsed ?? []);
  return result.success ? result.data : [];
}

function parseDraftDateOrToday(value: FormDataEntryValue | null) {
  const parsed = parseEditDate(value);
  return parsed ?? new Date();
}

function parseDraftTimeOrNull(value: FormDataEntryValue | null) {
  const parsed = parseEditTime(value);
  return parsed || null;
}

async function buildUniqueDraftContractNo(
  tx: Prisma.TransactionClient,
  tenantId: string,
) {
  for (let index = 0; index < 5; index += 1) {
    const suffix = `${Date.now().toString(36).toUpperCase()}${index ? `-${index}` : ""}`;
    const contractNo = `DRAFT-${suffix}`;
    const existing = await tx.contract.findFirst({
      where: { tenantId, contractNo },
      select: { id: true },
    });

    if (!existing) {
      return contractNo;
    }
  }

  return `DRAFT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function getDraftMoney(formData: FormData, autoLineItems: { type: string; totalPrice: number }[]) {
  const packageTotalMode = parseTotalMode(formData.get("packageTotalMode"));
  const servicesTotalMode = parseTotalMode(formData.get("servicesTotalMode"));
  const menuTotalMode = parseTotalMode(formData.get("menuTotalMode"));
  const finalTotalMode = parseTotalMode(formData.get("finalTotalMode"));
  const autoPackageTotal = autoLineItems
    .filter((item) => item.type === "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoServicesTotal = autoLineItems
    .filter((item) => item.type === "SERVICE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoMenuTotal = autoLineItems
    .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const packageTotal = packageTotalMode === "MANUAL"
    ? parseManualMoney(formData.get("packageManualTotal"))
    : autoPackageTotal;
  const servicesTotal = servicesTotalMode === "MANUAL"
    ? parseManualMoney(formData.get("servicesManualTotal"))
    : autoServicesTotal;
  const menuTotal = menuTotalMode === "MANUAL"
    ? parseManualMoney(formData.get("menuManualTotal"))
    : autoMenuTotal;
  const safePackageTotal = Number.isFinite(packageTotal) ? packageTotal : 0;
  const safeServicesTotal = Number.isFinite(servicesTotal) ? servicesTotal : 0;
  const safeMenuTotal = Number.isFinite(menuTotal) ? menuTotal : 0;
  const discountAmount = parseManualMoney(formData.get("discountAmount"));
  const depositAmount = parseManualMoney(formData.get("depositAmount"));
  const safeDiscountAmount = Number.isFinite(discountAmount) ? Math.max(0, discountAmount) : 0;
  const safeDepositAmount = Number.isFinite(depositAmount) ? Math.max(0, depositAmount) : 0;
  const subtotal = safePackageTotal + safeServicesTotal + safeMenuTotal;
  const autoFinalTotal = Math.max(0, subtotal - Math.min(safeDiscountAmount, subtotal));
  const manualFinalTotal = parseManualMoney(formData.get("finalManualTotal"));
  const finalTotal = finalTotalMode === "MANUAL" && Number.isFinite(manualFinalTotal)
    ? Math.max(0, manualFinalTotal)
    : autoFinalTotal;
  const remainingAmount = Math.max(0, finalTotal - Math.min(safeDepositAmount, finalTotal));

  return {
    packageTotalMode,
    servicesTotalMode,
    menuTotalMode,
    finalTotalMode,
    packageTotal: safePackageTotal,
    servicesTotal: safeServicesTotal,
    menuTotal: safeMenuTotal,
    discountAmount: Math.min(safeDiscountAmount, subtotal),
    depositAmount: Math.min(safeDepositAmount, finalTotal),
    finalTotal,
    remainingAmount,
  };
}

function parseContractForm(formData: FormData) {
  return createContractSchema.safeParse({
    customerId: formData.get("customerId"),
    salutation: formData.get("salutation"),
    customerName: formData.get("customerName"),
    customerMobile: formData.get("customerMobile"),
    nationalCode: formData.get("nationalCode"),
    address: formData.get("address"),
    eventTypeId: formData.get("eventTypeId"),
    customEventType: formData.get("customEventType"),
    eventDate: formData.get("eventDate"),
    eventStartTime: formData.get("eventStartTime"),
    eventEndTime: formData.get("eventEndTime"),
    guestCount: formData.get("guestCount"),
    hallId: formData.get("hallId"),
    salonId: formData.get("salonId"),
    packageId: formData.get("packageId"),
    packageTotalMode: formData.get("packageTotalMode"),
    packageManualTotal: formData.get("packageManualTotal"),
    servicesTotalMode: formData.get("servicesTotalMode"),
    servicesManualTotal: formData.get("servicesManualTotal"),
    menuTotalMode: formData.get("menuTotalMode"),
    menuManualTotal: formData.get("menuManualTotal"),
    finalTotalMode: formData.get("finalTotalMode"),
    finalManualTotal: formData.get("finalManualTotal"),
    discountAmount: formData.get("discountAmount"),
    depositAmount: formData.get("depositAmount"),
    lineItems: formData.get("lineItems"),
  });
}


export async function saveContractServerDraftAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.create");
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const rawLineItems = parseDraftLineItems(formData.get("lineItems"));
  const lineItems = rawLineItems.map((item) => ({
    type: item.type,
    pricingType: item.pricingType,
    category: item.category ?? (item.type === "SERVICE" ? "خدمات مراسم" : "آیتم قرارداد"),
    name: item.name,
    sourceId: item.sourceId || null,
    quantity: Math.max(1, Math.trunc(item.quantity || 1)),
    unitLabel: item.unitLabel ?? "مورد",
    unitPrice: Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : 0,
    totalPrice: Number.isFinite(Number(item.totalPrice)) ? Number(item.totalPrice) : 0,
    note: item.note || null,
  }));
  const money = getDraftMoney(formData, lineItems);
  const customerId = parseOptionalId(formData.get("customerId"));
  const customerName = parseOptionalText(formData.get("customerName")) ?? "مشتری پیش‌نویس";
  const customerMobile = parseOptionalText(formData.get("customerMobile")) ?? `draft-${Date.now().toString(36)}`;
  const salutation = parseOptionalText(formData.get("salutation")) ?? "آقا";
  const nationalCode = parseOptionalText(formData.get("nationalCode"));
  const address = parseOptionalText(formData.get("address"));
  const customEventType = parseOptionalText(formData.get("customEventType"));
  const eventTypeIdInput = parseOptionalId(formData.get("eventTypeId"));
  const hallId = parseOptionalId(formData.get("hallId"));
  const salonId = parseOptionalId(formData.get("salonId"));
  const packageId = parseOptionalId(formData.get("packageId"));
  const eventDate = parseDraftDateOrToday(formData.get("eventDate"));
  const eventStartTime = parseDraftTimeOrNull(formData.get("eventStartTime"));
  const eventEndTime = parseDraftTimeOrNull(formData.get("eventEndTime"));
  const guestCountRaw = parsePositiveInteger(formData.get("guestCount"));
  const guestCount = Number.isFinite(guestCountRaw) ? guestCountRaw : 1;
  const notes = parseOptionalText(formData.get("notes"));

  let createdContractId = "";

  try {
    const created = await db.$transaction(async (tx) => {
      let customer;

      if (customerId) {
        const existingCustomer = await tx.customer.findFirst({
          where: { id: customerId, tenantId },
          select: { id: true },
        });

        if (!existingCustomer) {
          throw new Error("INVALID_CUSTOMER");
        }

        const updateData: Prisma.CustomerUpdateInput = {};
        if (customerName.trim() && customerName !== "مشتری پیش‌نویس") {
          updateData.fullName = customerName;
        }
        if (customerMobile.trim() && !customerMobile.startsWith("draft-")) {
          updateData.phone = customerMobile;
        }
        if (salutation.trim()) {
          updateData.salutation = salutation;
        }
        if (nationalCode !== undefined) {
          updateData.nationalCode = nationalCode;
          updateData.nationalId = nationalCode;
        }
        if (address !== undefined) {
          updateData.address = address;
        }

        customer = Object.keys(updateData).length
          ? await tx.customer.update({ where: { id: existingCustomer.id }, data: updateData })
          : await tx.customer.findUniqueOrThrow({ where: { id: existingCustomer.id } });
      } else {
        customer = await tx.customer.create({
          data: {
            tenantId,
            salutation,
            fullName: customerName,
            phone: customerMobile,
            nationalCode,
            nationalId: nationalCode,
            address,
            notes: customerMobile.startsWith("draft-")
              ? "این مشتری برای ذخیره پیش‌نویس سروری ایجاد شده و باید قبل از ثبت نهایی تکمیل شود."
              : undefined,
          },
        });
      }

      let eventTypeId: string | null = null;
      let eventTypeName = customEventType ?? "مراسم پیش‌نویس";

      if (!customEventType && eventTypeIdInput) {
        const eventType = await tx.contractEventType.findFirst({
          where: { id: eventTypeIdInput, tenantId, isActive: true },
          select: { id: true, name: true },
        });
        if (eventType) {
          eventTypeId = eventType.id;
          eventTypeName = eventType.name;
        }
      }

      if (hallId) {
        const hall = await tx.hall.findFirst({
          where: { id: hallId, tenantId, isActive: true },
          select: { id: true },
        });
        if (!hall) {
          throw new Error("INVALID_HALL");
        }
      }

      if (salonId) {
        const salon = await tx.salon.findFirst({
          where: {
            id: salonId,
            tenantId,
            isActive: true,
            ...(hallId ? { hallId } : {}),
          },
          select: { id: true },
        });
        if (!salon) {
          throw new Error("INVALID_SALON");
        }
      }

      const selectedPackage = packageId
        ? await tx.ceremonyPackage.findFirst({
            where: { id: packageId, tenantId, isActive: true },
            select: {
              id: true,
              title: true,
              code: true,
              description: true,
              pricePerGuest: true,
              serviceIds: true,
              menuIds: true,
              includedItemsNote: true,
            },
          })
        : null;

      const draftNo = await buildUniqueDraftContractNo(tx, tenantId);
      const draftNoteParts = [
        notes,
        "پیش‌نویس رسمی سروری؛ شماره قرارداد رسمی از شمارنده اصلی مصرف نشده است.",
      ].filter(Boolean);

      const contract = await tx.contract.create({
        data: {
          tenantId,
          customerId: customer.id,
          contractNo: draftNo,
          title: `${eventTypeName} - ${customer.fullName}`,
          notes: draftNoteParts.join("\n"),
          status: "DRAFT",
          eventTypeId,
          eventTypeName,
          eventDate,
          eventStartTime,
          eventEndTime,
          guestCount,
          hallId: hallId ?? null,
          salonId: salonId ?? null,
          packageId: selectedPackage?.id ?? null,
          packageName: selectedPackage?.title ?? null,
          packageTotal: String(money.packageTotal),
          packageTotalManual: money.packageTotalMode === "MANUAL",
          packagePricePerGuest: String(selectedPackage ? toNumber(selectedPackage.pricePerGuest) : 0),
          packageSnapshot: selectedPackage
            ? {
                id: selectedPackage.id,
                title: selectedPackage.title,
                code: selectedPackage.code,
                description: selectedPackage.description,
                pricePerGuest: toNumber(selectedPackage.pricePerGuest),
                serviceIds: selectedPackage.serviceIds,
                menuIds: selectedPackage.menuIds,
                includedItemsNote: selectedPackage.includedItemsNote,
              } as Prisma.InputJsonValue
            : undefined,
          servicesTotal: String(money.servicesTotal),
          servicesTotalManual: money.servicesTotalMode === "MANUAL",
          menuTotal: String(money.menuTotal),
          menuTotalManual: money.menuTotalMode === "MANUAL",
          discountAmount: String(money.discountAmount),
          depositAmount: String(money.depositAmount),
          finalTotal: String(money.finalTotal),
          finalTotalManual: money.finalTotalMode === "MANUAL",
          remainingAmount: String(money.remainingAmount),
          remainingAmountManual: false,
          totalAmount: String(money.finalTotal),
          lineItems: lineItems.length
            ? {
                create: lineItems.map((item) => ({
                  tenantId,
                  type: item.type,
                  pricingType: item.pricingType,
                  category: item.category,
                  name: item.name,
                  sourceId: item.sourceId,
                  quantity: item.quantity,
                  unitLabel: item.unitLabel,
                  unitPrice: String(item.unitPrice),
                  totalPrice: String(item.totalPrice),
                  note: item.note,
                })),
              }
            : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: membership.userId,
          action: "CREATE",
          entityType: "CONTRACT",
          entityId: contract.id,
          title: "ذخیره پیش‌نویس سروری قرارداد",
          message: `پیش‌نویس سروری قرارداد ${contract.contractNo} توسط ${getAuditActorName(membership.user)} ذخیره شد.`,
          afterData: toAuditJson(contract),
          metadata: toAuditJson({ source: "CONTRACT_CREATE_SERVER_DRAFT_STEP_09" }),
          href: `/dashboard/contracts/${contract.id}/edit`,
        },
      });

      return contract;
    });

    createdContractId = created.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    redirect(`/dashboard/contracts/new?serverDraftError=${encodeURIComponent(reason)}`);
  }

  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${createdContractId}`);
  revalidatePath(`/dashboard/contracts/${createdContractId}/edit`);
  revalidatePath("/dashboard/settings/activity");
  redirect(`/dashboard/contracts/${createdContractId}/edit?serverDraft=1`);
}

export async function createContractAction(
  _previousState: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const membership = await requireTenantPermission("contracts.create");
  const parsed = parseContractForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات قرارداد معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const input = parsed.data;
  const db = await getPrisma();
  const tenantId = membership.tenantId;

  const selectedPackage = input.packageId
    ? await db.ceremonyPackage.findFirst({
        where: { id: input.packageId, tenantId, isActive: true },
        select: {
          id: true,
          title: true,
          code: true,
          description: true,
          pricePerGuest: true,
          serviceIds: true,
          menuIds: true,
          includedItemsNote: true,
          allowPriceOverride: true,
        },
      })
    : null;

  if (input.packageId && !selectedPackage) {
    return {
      ok: false,
      message: "پکیج اختصاصی انتخاب‌شده معتبر نیست یا غیرفعال شده است.",
    };
  }

  const selectedPackageServiceIds = new Set(selectedPackage?.serviceIds ?? []);
  const selectedPackageMenuIds = new Set(selectedPackage?.menuIds ?? []);
  const packageSnapshot = selectedPackage
    ? {
        id: selectedPackage.id,
        title: selectedPackage.title,
        code: selectedPackage.code,
        description: selectedPackage.description,
        pricePerGuest: toNumber(selectedPackage.pricePerGuest),
        serviceIds: selectedPackage.serviceIds,
        menuIds: selectedPackage.menuIds,
        includedItemsNote: selectedPackage.includedItemsNote,
      }
    : null;

  const serviceSourceIds = Array.from(
    new Set(
      input.lineItems
        .filter((item) => item.type === "SERVICE" && item.sourceId)
        .map((item) => item.sourceId as string),
    ),
  );
  const menuSourceIds = Array.from(
    new Set(
      input.lineItems
        .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE" && item.sourceId)
        .map((item) => item.sourceId as string),
    ),
  );

  const [serviceDefinitions, menuDefinitions] = await Promise.all([
    serviceSourceIds.length
      ? db.service.findMany({
          where: {
            tenantId,
            isActive: true,
            id: { in: serviceSourceIds },
          },
          select: {
            id: true,
            title: true,
            category: true,
            pricingType: true,
            unit: true,
            price: true,
            basePrice: true,
            allowPriceOverride: true,
          },
        })
      : Promise.resolve([]),
    menuSourceIds.length
      ? db.menu.findMany({
          where: {
            tenantId,
            isActive: true,
            id: { in: menuSourceIds },
          },
          select: {
            id: true,
            title: true,
            category: true,
            pricingType: true,
            unit: true,
            pricePerGuest: true,
            basePrice: true,
            allowPriceOverride: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (
    serviceDefinitions.length !== serviceSourceIds.length ||
    menuDefinitions.length !== menuSourceIds.length
  ) {
    return {
      ok: false,
      message:
        "برخی خدمات یا منوهای انتخاب‌شده به فضای کاری فعلی شما تعلق ندارند.",
    };
  }

  const serviceMap = new Map(
    serviceDefinitions.map((service) => [service.id, service]),
  );
  const menuMap = new Map(menuDefinitions.map((menu) => [menu.id, menu]));

  const invalidCustomLineItem = input.lineItems.find(
    (item) => !item.sourceId && (item.pricingType !== "CUSTOM" || item.totalPrice <= 0),
  );

  if (invalidCustomLineItem) {
    return {
      ok: false,
      message: "آیتم اضافی قرارداد باید نام و مبلغ معتبر داشته باشد.",
    };
  }

  const normalizedLineItems = input.lineItems.map((item) => {
    if (item.type === "PACKAGE") {
      if (!selectedPackage || item.sourceId !== selectedPackage.id) {
        throw new Error("INVALID_PACKAGE_SOURCE");
      }

      const catalogUnitPrice = toNumber(selectedPackage.pricePerGuest);
      const useManualPackageTotal = input.packageTotalMode === "MANUAL";
      const packageTotal = useManualPackageTotal
        ? input.packageManualTotal
        : input.guestCount * catalogUnitPrice;
      const unitPrice = useManualPackageTotal
        ? packageTotal
        : selectedPackage.allowPriceOverride
          ? toNumber(item.unitPrice)
          : catalogUnitPrice;
      const totalPrice = useManualPackageTotal ? packageTotal : input.guestCount * unitPrice;
      const packageDetails = [
        selectedPackage.serviceIds.length ? `خدمات زیرمجموعه: ${selectedPackage.serviceIds.length} مورد` : "",
        selectedPackage.menuIds.length ? `منوهای زیرمجموعه: ${selectedPackage.menuIds.length} مورد` : "",
        selectedPackage.includedItemsNote ? `توضیحات: ${selectedPackage.includedItemsNote}` : "",
      ].filter(Boolean).join(" | ");

      return {
        type: "PACKAGE" as const,
        pricingType: useManualPackageTotal ? "CUSTOM" as const : "PER_GUEST" as const,
        category: "پکیج اختصاصی مراسم",
        name: selectedPackage.title,
        sourceId: selectedPackage.id,
        quantity: useManualPackageTotal ? 1 : input.guestCount,
        unitLabel: useManualPackageTotal ? "پکیج" : "نفر",
        unitPrice,
        totalPrice,
        note: item.note || packageDetails || undefined,
      };
    }

    if (!item.sourceId) {
      const manualLine = isManualContractLineType(
        item.type,
        input.servicesTotalMode,
        input.menuTotalMode,
      );
      const note = manualLine
        ? item.note
          ? `${item.note} | مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.`
          : "مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است."
        : item.note;

      return {
        type: item.type,
        pricingType: "CUSTOM" as const,
        category: item.category ?? (item.type === "SERVICE" ? "خدمات سفارشی" : "آیتم‌های اضافی منو"),
        name: item.name,
        sourceId: null,
        quantity: Math.max(1, Math.trunc(item.quantity || 1)),
        unitLabel: item.unitLabel ?? "مورد",
        unitPrice: manualLine ? 0 : toNumber(item.unitPrice),
        totalPrice: manualLine ? 0 : toNumber(item.totalPrice),
        note,
      };
    }

    if (item.type === "SERVICE") {
      const source = serviceMap.get(item.sourceId);

      if (!source) {
        throw new Error("INVALID_LINE_ITEM_SOURCE");
      }

      const pricingType = source.pricingType;
      const isPackageSubItem = selectedPackageServiceIds.has(source.id);
      const manualLine = isPackageSubItem || isManualContractLineType(
        "SERVICE",
        input.servicesTotalMode,
        input.menuTotalMode,
      );
      const catalogPrice = getCatalogPrice({
        pricingType,
        price: source.price,
        basePrice: source.basePrice,
      });
      const baseUnitPrice =
        pricingType === "CUSTOM" || source.allowPriceOverride
          ? toNumber(item.unitPrice)
          : catalogPrice;
      const quantity =
        pricingType === "PER_GUEST"
          ? input.guestCount
          : pricingType === "PER_ITEM" || pricingType === "PER_HOUR"
            ? Math.max(1, Math.trunc(item.quantity))
            : 1;
      const baseTotalPrice =
        pricingType === "FIXED" || pricingType === "CUSTOM"
          ? baseUnitPrice
          : quantity * baseUnitPrice;
      const unitPrice = manualLine ? 0 : baseUnitPrice;
      const totalPrice = manualLine ? 0 : baseTotalPrice;
      const zeroReason = isPackageSubItem
        ? "این خدمت زیرمجموعه پکیج انتخاب‌شده است و مبلغ جداگانه ندارد."
        : "مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.";
      const note = manualLine
        ? item.note
          ? `${item.note} | ${zeroReason}`
          : zeroReason
        : item.note;

      return {
        type: "SERVICE" as const,
        pricingType,
        category: source.category ?? "خدمات مراسم",
        name: source.title,
        sourceId: source.id,
        quantity,
        unitLabel: source.unit,
        unitPrice,
        totalPrice,
        note,
      };
    }

    const source = menuMap.get(item.sourceId);

    if (!source) {
      throw new Error("INVALID_LINE_ITEM_SOURCE");
    }

    const pricingType = source.pricingType;
    const lineType = getMenuLineType(source.category);
    const isPackageSubItem = selectedPackageMenuIds.has(source.id);
    const manualLine = isPackageSubItem || isManualContractLineType(
      lineType,
      input.servicesTotalMode,
      input.menuTotalMode,
    );
    const catalogPrice = getCatalogPrice({
      pricingType,
      price: source.pricePerGuest,
      basePrice: source.basePrice,
    });
    const baseUnitPrice =
      pricingType === "CUSTOM" || source.allowPriceOverride
        ? toNumber(item.unitPrice)
        : catalogPrice;
    const quantity =
      pricingType === "PER_GUEST"
        ? input.guestCount
        : pricingType === "PER_ITEM" || pricingType === "PER_HOUR"
          ? Math.max(1, Math.trunc(item.quantity))
          : 1;
    const baseTotalPrice =
      pricingType === "FIXED" || pricingType === "CUSTOM"
        ? baseUnitPrice
        : quantity * baseUnitPrice;
    const unitPrice = manualLine ? 0 : baseUnitPrice;
    const totalPrice = manualLine ? 0 : baseTotalPrice;
    const zeroReason = isPackageSubItem
      ? "این آیتم زیرمجموعه پکیج انتخاب‌شده است و مبلغ جداگانه ندارد."
      : "مبلغ ردیف به‌دلیل جمع دستی دسته صفر شده است.";
    const note = manualLine
      ? item.note
        ? `${item.note} | ${zeroReason}`
        : zeroReason
      : item.note;

    return {
      type: lineType,
      pricingType,
      category: source.category ?? "منوی پذیرایی",
      name: source.title,
      sourceId: source.id,
      quantity,
      unitLabel: source.unit,
      unitPrice,
      totalPrice,
      note,
    };
  });

  const isZeroedPackageSubItem = (item: (typeof normalizedLineItems)[number]) =>
    item.totalPrice === 0 &&
    typeof item.note === "string" &&
    item.note.includes("زیرمجموعه پکیج");

  const missingPriceItem = normalizedLineItems.find(
    (item) =>
      !isZeroedPackageSubItem(item) &&
      !isManualContractLineType(item.type, input.servicesTotalMode, input.menuTotalMode) &&
      item.pricingType !== "CUSTOM" &&
      item.unitPrice <= 0,
  );

  if (missingPriceItem) {
    return {
      ok: false,
      message:
        missingPriceItem.type === "SERVICE"
          ? "قیمت این خدمت در تعاریف پایه ثبت نشده است."
          : "قیمت این آیتم در تعاریف پایه ثبت نشده است.",
    };
  }

  const missingCustomPriceItem = normalizedLineItems.find(
    (item) =>
      !isZeroedPackageSubItem(item) &&
      !isManualContractLineType(item.type, input.servicesTotalMode, input.menuTotalMode) &&
      item.pricingType === "CUSTOM" &&
      item.totalPrice <= 0,
  );

  if (missingCustomPriceItem) {
    return {
      ok: false,
      message: "برای آیتم‌های توافقی، مبلغ قرارداد را وارد کنید.",
    };
  }

  if (input.hallId) {
    const hall = await db.hall.findFirst({
      where: {
        id: input.hallId,
        tenantId,
      },
      select: { id: true },
    });

    if (!hall) {
      return {
        ok: false,
        message: "تالار انتخاب‌شده معتبر نیست.",
      };
    }
  }

  if (input.salonId) {
    const salon = await db.salon.findFirst({
      where: {
        id: input.salonId,
        tenantId,
        ...(input.hallId ? { hallId: input.hallId } : {}),
      },
      select: { id: true, hallId: true },
    });

    if (!salon) {
      return {
        ok: false,
        message: "سالن انتخاب‌شده معتبر نیست یا به تالار انتخاب‌شده تعلق ندارد.",
      };
    }
  }

  const autoPackageTotal = normalizedLineItems
    .filter((item) => item.type === "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoServicesTotal = normalizedLineItems
    .filter((item) => item.type === "SERVICE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const autoMenuTotal = normalizedLineItems
    .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
    .reduce((sum, item) => sum + item.totalPrice, 0);
  const packageTotal = input.packageTotalMode === "MANUAL"
    ? input.packageManualTotal
    : autoPackageTotal;
  const servicesTotal = input.servicesTotalMode === "MANUAL"
    ? input.servicesManualTotal
    : autoServicesTotal;
  const menuTotal = input.menuTotalMode === "MANUAL"
    ? input.menuManualTotal
    : autoMenuTotal;
  const subtotal = packageTotal + servicesTotal + menuTotal;

  if (input.discountAmount > subtotal) {
    return {
      ok: false,
      message: "تخفیف نمی‌تواند بیشتر از جمع قرارداد باشد.",
    };
  }

  const autoFinalTotal = Math.max(0, subtotal - input.discountAmount);
  const finalTotal = input.finalTotalMode === "MANUAL"
    ? input.finalManualTotal
    : autoFinalTotal;

  if (input.depositAmount > finalTotal) {
    return {
      ok: false,
      message: "بیعانه نمی‌تواند بیشتر از مبلغ نهایی باشد.",
    };
  }

  const remainingAmount = Math.max(0, finalTotal - input.depositAmount);

  if (input.salonId && input.eventStartTime && input.eventEndTime) {
    const availability = await checkContractReservationAvailability({
      db,
      tenantId,
      eventDate: input.eventDate as Date,
      salonId: input.salonId,
      eventStartTime: input.eventStartTime,
      eventEndTime: input.eventEndTime,
    });

    if (!availability.available) {
      const conflictSummary = availability.conflicts
        .slice(0, 3)
        .map((contract) => `${contract.contractNo} - ${contract.customerName}`)
        .join("، ");

      return {
        ok: false,
        message: conflictSummary
          ? `این سالن در تاریخ و ساعت انتخاب‌شده با قرارداد ${conflictSummary} تداخل دارد.`
          : "این سالن در تاریخ و ساعت انتخاب‌شده قبلاً رزرو شده است.",
      };
    }
  }

  let createdContractId = "";

  try {
    const contract = await db.$transaction(async (tx) => {
      let eventTypeId = input.eventTypeId;
      let eventTypeName = input.customEventType;

      if (input.customEventType) {
        const eventType = await tx.contractEventType.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: input.customEventType,
            },
          },
          update: {
            isActive: true,
          },
          create: {
            tenantId,
            name: input.customEventType,
            isActive: true,
          },
        });
        eventTypeId = eventType.id;
        eventTypeName = eventType.name;
      } else if (eventTypeId) {
        const eventType = await tx.contractEventType.findFirst({
          where: {
            id: eventTypeId,
            tenantId,
            isActive: true,
          },
        });

        if (!eventType) {
          throw new Error("INVALID_EVENT_TYPE");
        }

        eventTypeName = eventType.name;
      }

      let customer;

      if (input.customerId) {
        const existingCustomer = await tx.customer.findFirst({
          where: {
            id: input.customerId,
            tenantId,
          },
          select: { id: true },
        });

        if (!existingCustomer) {
          throw new Error("INVALID_CUSTOMER");
        }

        customer = await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            salutation: input.salutation,
            fullName: input.customerName,
            phone: input.customerMobile,
            nationalCode: input.nationalCode,
            nationalId: input.nationalCode,
            address: input.address,
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            tenantId,
            salutation: input.salutation,
            fullName: input.customerName,
            phone: input.customerMobile,
            nationalCode: input.nationalCode,
            nationalId: input.nationalCode,
            address: input.address,
          },
        });
      }

      const settings = await tx.contractSetting.upsert({
        where: { tenantId },
        update: {},
        create: {
          tenantId,
        },
      });
      const paddedNextNumber = String(settings.nextNumber).padStart(4, "0");
      const contractNo = settings.fiscalYear
        ? `${settings.contractPrefix}-${settings.fiscalYear}-${paddedNextNumber}`
        : `${settings.contractPrefix}-${paddedNextNumber}`;

      await tx.contractSetting.update({
        where: { tenantId },
        data: {
          nextNumber: {
            increment: 1,
          },
        },
      });

      if (input.salonId && input.eventStartTime && input.eventEndTime) {
        const availability = await checkContractReservationAvailability({
          db: tx,
          tenantId,
          eventDate: input.eventDate as Date,
          salonId: input.salonId,
          eventStartTime: input.eventStartTime,
          eventEndTime: input.eventEndTime,
        });

        if (!availability.available) {
          throw new Error("RESERVATION_CONFLICT");
        }
      }

      const created = await tx.contract.create({
        data: {
          tenantId,
          customerId: customer.id,
          contractNo,
          title: `${eventTypeName ?? "مراسم"} - ${input.customerName}`,
          status: input.depositAmount > 0 ? "RESERVED" : "DRAFT",
          eventTypeId,
          eventTypeName,
          eventDate: input.eventDate as Date,
          eventStartTime: input.eventStartTime,
          eventEndTime: input.eventEndTime,
          guestCount: input.guestCount,
          hallId: input.hallId,
          salonId: input.salonId,
          packageId: selectedPackage?.id ?? null,
          packageName: selectedPackage?.title ?? null,
          packageTotal: String(packageTotal),
          packageTotalManual: input.packageTotalMode === "MANUAL",
          packagePricePerGuest: String(selectedPackage ? toNumber(selectedPackage.pricePerGuest) : 0),
          packageSnapshot: packageSnapshot as Prisma.InputJsonValue,
          servicesTotal: String(servicesTotal),
          servicesTotalManual: input.servicesTotalMode === "MANUAL",
          menuTotal: String(menuTotal),
          menuTotalManual: input.menuTotalMode === "MANUAL",
          discountAmount: String(input.discountAmount),
          depositAmount: String(input.depositAmount),
          finalTotal: String(finalTotal),
          finalTotalManual: input.finalTotalMode === "MANUAL",
          remainingAmount: String(remainingAmount),
          remainingAmountManual: false,
          totalAmount: String(finalTotal),
          lineItems: {
            create: normalizedLineItems.map((item) => ({
              tenantId,
              type: item.type,
              pricingType: item.pricingType,
              category: item.category,
              name: item.name,
              sourceId: item.sourceId,
              quantity: item.quantity,
              unitLabel: item.unitLabel,
              unitPrice: String(item.unitPrice),
              totalPrice: String(item.totalPrice),
              note: item.note,
            })),
          },
        },
      });

      if (input.depositAmount > 0) {
        await tx.payment.create({
          data: {
            tenantId,
            contractId: created.id,
            amount: String(input.depositAmount),
            paidAt: new Date(),
            reference: "بیعانه اولیه قرارداد",
          },
        });
      }

      return created;
    });

    createdContractId = contract.id;
  } catch (error) {
    if (error instanceof Error && error.message === "RESERVATION_CONFLICT") {
      return {
        ok: false,
        message: "این سالن در تاریخ و ساعت انتخاب‌شده قبلاً رزرو شده است.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_EVENT_TYPE") {
      return {
        ok: false,
        message: "نوع مراسم انتخاب‌شده معتبر نیست.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_CUSTOMER") {
      return {
        ok: false,
        message: "مشتری انتخاب‌شده معتبر نیست یا به فضای کاری فعلی تعلق ندارد.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_PACKAGE_SOURCE") {
      return {
        ok: false,
        message: "پکیج انتخاب‌شده معتبر نیست یا به فضای کاری فعلی تعلق ندارد.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_LINE_ITEM_SOURCE") {
      return {
        ok: false,
        message: "ردیف انتخاب‌شده معتبر نیست یا از تعاریف پایه خوانده نشده است.",
      };
    }

    if (error instanceof Error && error.message === "INVALID_CUSTOM_LINE_ITEM") {
      return {
        ok: false,
        message: "آیتم اضافی قرارداد باید نام و مبلغ معتبر داشته باشد.",
      };
    }

    return {
      ok: false,
      message:
        "ثبت قرارداد با خطا مواجه شد. لطفاً چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  const createdContractForAudit = await db.contract.findFirst({
    where: { id: createdContractId, tenantId },
    include: {
      customer: { select: { fullName: true, phone: true, nationalCode: true } },
      lineItems: true,
      payments: true,
    },
  });

  if (createdContractForAudit) {
    const userName = getAuditActorName(membership.user);
    await createAuditLog({
      tenantId,
      userId: membership.userId,
      action: "CREATE",
      entityType: "CONTRACT",
      entityId: createdContractForAudit.id,
      title: "ثبت قرارداد جدید",
      message: buildAuditMessage({
        entityLabel: "قرارداد",
        recordLabel: createdContractForAudit.contractNo,
        actionLabel: "ثبت",
        userName,
      }),
      afterData: createdContractForAudit,
      href: `/dashboard/contracts/${createdContractForAudit.id}`,
    });

    if (input.depositAmount > 0) {
      const depositPayment = createdContractForAudit.payments[0];
      if (depositPayment) {
        await createAuditLog({
          tenantId,
          userId: membership.userId,
          action: "PAYMENT_RECEIVED",
          entityType: "PAYMENT",
          entityId: depositPayment.id,
          title: "ثبت بیعانه قرارداد",
          message: `دریافت مبلغ ${input.depositAmount.toLocaleString("fa-IR")} ریال برای قرارداد ${createdContractForAudit.contractNo} توسط ${userName} ثبت شد.`,
          afterData: depositPayment,
          href: `/dashboard/payments?contractId=${createdContractForAudit.id}`,
        });
      }
    }
  }

  await dispatchContractTelegramNotificationSafely({
    db,
    tenantId,
    tenant: membership.tenant,
    contractId: createdContractId,
    actorName: getAuditActorName(membership.user),
    eventType: "CONTRACT_CREATED",
    sendCustomerWelcome: !input.customerId,
  });

  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/settings/activity");
  revalidatePath(`/dashboard/contracts/${createdContractId}`);
  revalidatePath(`/dashboard/contracts/${createdContractId}/print`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");

  redirect(`/dashboard/contracts/${createdContractId}?created=1`);
}


export async function updateContractFinancialsAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.edit");
  const parsed = parseEditContractForm(formData);

  if (!parsed.success) {
    redirect("/dashboard/contracts?error=invalid-edit");
  }

  const input = parsed.data;
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  let updatedContractId = input.contractId;

  try {
    await db.$transaction(async (tx) => {
      const beforeContract = await tx.contract.findFirst({
        where: { id: input.contractId, tenantId },
        include: {
          customer: { select: { id: true, salutation: true, fullName: true, phone: true, nationalCode: true, nationalId: true, address: true } },
          hall: { select: { id: true, name: true } },
          salon: { select: { id: true, name: true, hallId: true } },
          lineItems: true,
          payments: { select: { id: true, amount: true, type: true, status: true } },
        },
      });

      if (!beforeContract) {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      let eventTypeId = input.eventTypeId ?? null;
      let eventTypeName = input.customEventType ?? null;

      if (input.customEventType) {
        const eventType = await tx.contractEventType.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: input.customEventType,
            },
          },
          update: { isActive: true },
          create: {
            tenantId,
            name: input.customEventType,
            isActive: true,
          },
        });
        eventTypeId = eventType.id;
        eventTypeName = eventType.name;
      } else if (input.eventTypeId) {
        const eventType = await tx.contractEventType.findFirst({
          where: { id: input.eventTypeId, tenantId, isActive: true },
          select: { id: true, name: true },
        });

        if (!eventType) {
          throw new Error("INVALID_EVENT_TYPE");
        }

        eventTypeId = eventType.id;
        eventTypeName = eventType.name;
      }

      if (input.hallId) {
        const hall = await tx.hall.findFirst({
          where: { id: input.hallId, tenantId, isActive: true },
          select: { id: true },
        });

        if (!hall) {
          throw new Error("INVALID_HALL");
        }
      }

      if (input.salonId) {
        const salon = await tx.salon.findFirst({
          where: {
            id: input.salonId,
            tenantId,
            isActive: true,
            ...(input.hallId ? { hallId: input.hallId } : {}),
          },
          select: { id: true },
        });

        if (!salon) {
          throw new Error("INVALID_SALON");
        }
      }

      const normalizedLineItems = input.lineItems.map((item) => ({
        tenantId,
        type: item.type,
        pricingType: item.pricingType ?? "CUSTOM",
        category: item.category || (item.type === "SERVICE" ? "خدمات قرارداد" : item.type === "PACKAGE" ? "پکیج اختصاصی مراسم" : "منوی قرارداد"),
        name: item.name,
        sourceId: item.sourceId || null,
        quantity: Math.max(1, Math.trunc(item.quantity)),
        unitLabel: item.unitLabel || "مورد",
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
        note: item.note || null,
      }));

      const autoPackageTotal = input.lineItems
        .filter((item) => item.type === "PACKAGE")
        .reduce((sum, item) => sum + item.totalPrice, 0);
      const autoServicesTotal = input.lineItems
        .filter((item) => item.type === "SERVICE")
        .reduce((sum, item) => sum + item.totalPrice, 0);
      const autoMenuTotal = input.lineItems
        .filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE")
        .reduce((sum, item) => sum + item.totalPrice, 0);
      const servicesTotal = input.servicesTotalMode === "MANUAL" ? input.servicesManualTotal : autoServicesTotal;
      const menuTotal = input.menuTotalMode === "MANUAL" ? input.menuManualTotal : autoMenuTotal;
      const subtotal = autoPackageTotal + servicesTotal + menuTotal;

      if (input.discountAmount > subtotal) {
        throw new Error("DISCOUNT_EXCEEDS_TOTAL");
      }

      const autoFinalTotal = Math.max(0, subtotal - input.discountAmount);
      const finalTotal = input.finalTotalMode === "MANUAL" ? input.finalManualTotal : autoFinalTotal;

      if (input.depositAmount > finalTotal) {
        throw new Error("DEPOSIT_EXCEEDS_TOTAL");
      }

      const paidAmount = calculatePaidAmountForContract(beforeContract.payments, input.depositAmount);
      const remainingAmount = input.status === "CANCELED"
        ? 0
        : input.remainingAmountMode === "MANUAL"
          ? input.remainingManualAmount
          : Math.max(0, finalTotal - paidAmount);
      const remainingAmountManual = input.status === "CANCELED"
        ? false
        : input.remainingAmountMode === "MANUAL";

      const updatedCustomer = await tx.customer.update({
        where: { id: beforeContract.customerId },
        data: {
          salutation: input.salutation,
          fullName: input.customerName,
          phone: input.customerMobile,
          nationalCode: input.nationalCode,
          nationalId: input.nationalCode,
          address: input.address,
        },
      });

      await tx.contractLineItem.deleteMany({ where: { tenantId, contractId: beforeContract.id } });

      if (normalizedLineItems.length > 0) {
        await tx.contractLineItem.createMany({
          data: normalizedLineItems.map((item) => ({ ...item, contractId: beforeContract.id })),
        });
      }

      const updatedContract = await tx.contract.update({
        where: { id: beforeContract.id },
        data: {
          title: `${eventTypeName ?? "مراسم"} - ${input.customerName}`,
          notes: input.notes,
          status: input.status,
          eventTypeId,
          eventTypeName,
          eventDate: input.eventDate,
          eventStartTime: input.eventStartTime,
          eventEndTime: input.eventEndTime,
          guestCount: input.guestCount,
          hallId: input.hallId ?? null,
          salonId: input.salonId ?? null,
          servicesTotal: String(servicesTotal),
          servicesTotalManual: input.servicesTotalMode === "MANUAL",
          menuTotal: String(menuTotal),
          menuTotalManual: input.menuTotalMode === "MANUAL",
          discountAmount: String(input.discountAmount),
          depositAmount: String(input.depositAmount),
          finalTotal: String(finalTotal),
          finalTotalManual: input.finalTotalMode === "MANUAL",
          remainingAmount: String(remainingAmount),
          remainingAmountManual,
          totalAmount: String(finalTotal),
        },
        include: {
          customer: { select: { id: true, salutation: true, fullName: true, phone: true, nationalCode: true, nationalId: true, address: true } },
          hall: { select: { id: true, name: true } },
          salon: { select: { id: true, name: true, hallId: true } },
          lineItems: true,
          payments: { select: { id: true, amount: true, type: true, status: true } },
        },
      });
      updatedContractId = updatedContract.id;

      const changedFields = buildChangedFields([
        { label: "عنوان مشتری", before: beforeContract.customer.salutation, after: updatedCustomer.salutation },
        { label: "نام مشتری", before: beforeContract.customer.fullName, after: updatedCustomer.fullName },
        { label: "موبایل مشتری", before: beforeContract.customer.phone, after: updatedCustomer.phone },
        { label: "کد ملی مشتری", before: beforeContract.customer.nationalCode ?? beforeContract.customer.nationalId, after: updatedCustomer.nationalCode ?? updatedCustomer.nationalId },
        { label: "نشانی مشتری", before: beforeContract.customer.address, after: updatedCustomer.address },
        { label: "نوع مراسم", before: beforeContract.eventTypeName, after: updatedContract.eventTypeName },
        { label: "تاریخ مراسم", before: beforeContract.eventDate, after: updatedContract.eventDate },
        { label: "ساعت شروع", before: beforeContract.eventStartTime, after: updatedContract.eventStartTime },
        { label: "ساعت پایان", before: beforeContract.eventEndTime, after: updatedContract.eventEndTime },
        { label: "تعداد مهمان", before: beforeContract.guestCount, after: updatedContract.guestCount },
        { label: "تالار", before: beforeContract.hall?.name ?? beforeContract.hallId, after: updatedContract.hall?.name ?? updatedContract.hallId },
        { label: "سالن", before: beforeContract.salon?.name ?? beforeContract.salonId, after: updatedContract.salon?.name ?? updatedContract.salonId },
        { label: "وضعیت قرارداد", before: contractStatusLabels[beforeContract.status], after: contractStatusLabels[updatedContract.status] },
        { label: "توضیحات قرارداد", before: beforeContract.notes, after: updatedContract.notes },
        { label: "جمع خدمات", before: beforeContract.servicesTotal, after: updatedContract.servicesTotal },
        { label: "جمع خدمات دستی", before: beforeContract.servicesTotalManual, after: updatedContract.servicesTotalManual },
        { label: "جمع منو", before: beforeContract.menuTotal, after: updatedContract.menuTotal },
        { label: "جمع منو دستی", before: beforeContract.menuTotalManual, after: updatedContract.menuTotalManual },
        { label: "تخفیف", before: beforeContract.discountAmount, after: updatedContract.discountAmount },
        { label: "بیعانه", before: beforeContract.depositAmount, after: updatedContract.depositAmount },
        { label: "مبلغ نهایی", before: beforeContract.finalTotal, after: updatedContract.finalTotal },
        { label: "مبلغ نهایی دستی", before: beforeContract.finalTotalManual, after: updatedContract.finalTotalManual },
        { label: "مانده", before: beforeContract.remainingAmount, after: updatedContract.remainingAmount },
        { label: "مانده دستی", before: beforeContract.remainingAmountManual, after: updatedContract.remainingAmountManual },
        { label: "ردیف‌های قرارداد", before: summarizeLineItemsForAudit(beforeContract.lineItems), after: summarizeLineItemsForAudit(updatedContract.lineItems) },
      ]);

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: membership.userId,
          action: "UPDATE",
          entityType: "CONTRACT",
          entityId: updatedContract.id,
          title: "ویرایش جزئیات قرارداد",
          message: `جزئیات قرارداد ${updatedContract.contractNo} توسط ${getAuditActorName(membership.user)} ویرایش شد.`,
          beforeData: toAuditJson(beforeContract),
          afterData: toAuditJson(updatedContract),
          metadata: toAuditJson({
            editReason: input.editReason ?? null,
            changedFields,
            changedFieldCount: changedFields.length,
          }),
          href: `/dashboard/contracts/${updatedContract.id}`,
        },
      });
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    redirect(`/dashboard/contracts/${input.contractId}/edit?error=${encodeURIComponent(reason)}`);
  }

  await dispatchContractTelegramNotificationSafely({
    db,
    tenantId,
    tenant: membership.tenant,
    contractId: updatedContractId,
    actorName: getAuditActorName(membership.user),
    eventType: "CONTRACT_UPDATED",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${updatedContractId}`);
  revalidatePath(`/dashboard/contracts/${updatedContractId}/print`);
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");

  redirect(`/dashboard/contracts/${updatedContractId}?updated=1`);
}


export async function updateContractStatusAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.status.manage");
  const db = await getPrisma();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as ContractStatus;
  const returnTo = String(formData.get("returnTo") ?? "/dashboard/contracts");

  if (!contractId || !contractStatuses.includes(status)) {
    redirect("/dashboard/contracts?error=invalid-status");
  }

  const beforeContract = await db.contract.findFirst({
    where: { id: contractId, tenantId: membership.tenantId },
    include: {
      customer: { select: { fullName: true, phone: true } },
      payments: { select: { amount: true, type: true, status: true } },
    },
  });

  if (!beforeContract) {
    redirect("/dashboard/contracts?error=not-found");
  }

  const statusFinancialPatch = status === "CANCELED"
    ? getClosedCancellationFinancialPatch()
    : beforeContract.status === "CANCELED" && !beforeContract.remainingAmountManual
      ? {
          remainingAmount: String(getRemainingAmountAfterReceipts(beforeContract)),
          remainingAmountManual: false,
        }
      : {};

  const updatedContract = await db.contract.update({
    where: { id: beforeContract.id },
    data: { status, ...statusFinancialPatch },
    include: { customer: { select: { fullName: true, phone: true } } },
  });

  const userName = getAuditActorName(membership.user);
  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: status === "CANCELED" ? "CANCEL" : "STATUS_CHANGE",
    entityType: "CONTRACT",
    entityId: updatedContract.id,
    title: status === "CANCELED" ? "لغو قرارداد" : "تغییر وضعیت قرارداد",
    message: buildStatusChangeMessage({
      entityLabel: "قرارداد",
      recordLabel: updatedContract.contractNo,
      oldStatus: contractStatusLabels[beforeContract.status],
      newStatus: contractStatusLabels[updatedContract.status],
      userName,
    }),
    beforeData: beforeContract,
    afterData: updatedContract,
    href: `/dashboard/contracts/${updatedContract.id}`,
  });

  await dispatchContractTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    contractId,
    actorName: getAuditActorName(membership.user),
    eventType: status === "CANCELED" ? "CONTRACT_CANCELED" : "CONTRACT_STATUS_CHANGED",
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath(`/dashboard/contracts/${contractId}/print`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  revalidatePath("/dashboard/settings/activity");

  redirect(returnTo.startsWith("/dashboard/contracts") ? returnTo : "/dashboard/contracts");
}



export async function cancelContractAction(formData: FormData) {
  const membership = await requireTenantPermission("contracts.status.manage");
  const db = await getPrisma();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const returnToRaw = String(formData.get("returnTo") ?? "/dashboard/contracts");
  const returnTo = returnToRaw.startsWith("/dashboard/contracts") ? returnToRaw : "/dashboard/contracts";
  const cancellationAmount = parseManualMoney(formData.get("cancellationAmount"));
  const cancellationNote = String(formData.get("cancellationNote") ?? "").trim().slice(0, 500);

  if (!contractId || !Number.isFinite(cancellationAmount) || cancellationAmount < 0) {
    redirect(buildActionRedirectUrl(returnTo, { error: "invalid-cancellation-amount" }));
  }

  try {
    await db.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: contractId, tenantId: membership.tenantId },
        include: {
          customer: { select: { id: true, fullName: true, phone: true, nationalCode: true, nationalId: true } },
          postEventConfirmation: { select: { id: true, status: true, cancellationAmount: true, cancellationAmountManual: true } },
        },
      });

      if (!contract) {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      const now = new Date();
      const beforeData = toAuditJson({
        contractId: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customer.fullName,
        status: contract.status,
        postEventConfirmation: contract.postEventConfirmation,
      });

      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "CANCELED",
          ...getClosedCancellationFinancialPatch(),
        },
        include: { customer: { select: { id: true, fullName: true, phone: true } } },
      });

      const confirmation = await tx.postEventConfirmation.upsert({
        where: { contractId: contract.id },
        create: {
          tenantId: membership.tenantId,
          contractId: contract.id,
          confirmedByUserId: membership.userId,
          status: "NOT_HELD",
          source: "DASHBOARD_GATE",
          note: cancellationNote || "کنسلی نهایی قرارداد از صفحه جزئیات قرارداد.",
          invoiceRequired: false,
          cancellationRequired: true,
          cancellationAmount: Math.round(cancellationAmount).toFixed(2),
          cancellationAmountManual: true,
          confirmedAt: now,
        },
        update: {
          confirmedByUserId: membership.userId,
          status: "NOT_HELD",
          source: "DASHBOARD_GATE",
          note: cancellationNote || "کنسلی نهایی قرارداد از صفحه جزئیات قرارداد.",
          invoiceRequired: false,
          cancellationRequired: true,
          cancellationAmount: Math.round(cancellationAmount).toFixed(2),
          cancellationAmountManual: true,
          confirmedAt: now,
        },
        select: { id: true, status: true, cancellationAmount: true, cancellationAmountManual: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId: membership.tenantId,
          userId: membership.userId,
          action: "CANCEL",
          entityType: "CONTRACT",
          entityId: contract.id,
          title: "کنسل نهایی قرارداد",
          message: `قرارداد ${contract.contractNo} مربوط به ${contract.customer.fullName} با مبلغ کنسلی ${Math.round(cancellationAmount).toLocaleString("fa-IR")} ریال توسط ${getAuditActorName(membership.user)} کنسل شد.`,
          beforeData,
          afterData: toAuditJson({
            contractId: updatedContract.id,
            contractNo: updatedContract.contractNo,
            customerName: updatedContract.customer.fullName,
            status: updatedContract.status,
            cancellationAmount: Math.round(cancellationAmount),
            cancellationNote: cancellationNote || null,
            postEventConfirmation: confirmation,
          }),
          metadata: toAuditJson({
            sourceAction: "cancelContractAction",
            cancellationAmount: Math.round(cancellationAmount),
            cancellationAmountManual: true,
            cancellationNote: cancellationNote || null,
            confirmedAt: now.toISOString(),
          }),
          href: `/dashboard/contracts/${updatedContract.id}`,
        },
      });
    });

    await dispatchContractTelegramNotificationSafely({
      db,
      tenantId: membership.tenantId,
      tenant: membership.tenant,
      contractId,
      actorName: getAuditActorName(membership.user),
      eventType: "CONTRACT_CANCELED",
    });
  } catch {
    redirect(buildActionRedirectUrl(returnTo, { error: "cancel-failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
  revalidatePath(`/dashboard/contracts/${contractId}/print`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/owner-financial-overview");
  revalidatePath("/dashboard/owner-settlements");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/activity");

  redirect(buildActionRedirectUrl(returnTo, { canceled: "1" }));
}


function buildActionRedirectUrl(base: string, params: Record<string, string>) {
  const [path, query = ""] = base.split("?");
  const search = new URLSearchParams(query);
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }
  const next = search.toString();
  return next ? `${path}?${next}` : path;
}

function calculateSettlementFinancials(contract: {
  status?: ContractStatus | string;
  finalTotal: { toString(): string } | string | number;
  depositAmount: { toString(): string } | string | number;
  remainingAmount: { toString(): string } | string | number;
  payments: { amount: { toString(): string } | string | number; type?: string | null; status?: string | null }[];
}) {
  const finalTotal = toNumber(contract.finalTotal);
  const receivedAmount = calculatePaidAmountForContract(contract.payments, toNumber(contract.depositAmount));
  const computedRemaining = Math.max(0, finalTotal - receivedAmount);
  const storedRemaining = Math.max(0, toNumber(contract.remainingAmount));
  const alreadySettled = contract.status === "COMPLETED" && storedRemaining <= 0;

  return {
    finalTotal,
    receivedAmount,
    storedRemaining,
    computedRemaining: alreadySettled ? 0 : computedRemaining,
    autoSettlementAmount: alreadySettled ? 0 : Math.max(computedRemaining, storedRemaining),
    alreadySettled,
  };
}

export async function finalizeContractSettlementAction(input: FormData | string) {
  const membership = await requireTenantPermission("contracts.status.manage");
  const db = await getPrisma();
  const contractId = typeof input === "string" ? input : input.get("contractId");
  const returnToRaw = typeof input === "string" ? "/dashboard/contracts" : String(input.get("returnTo") ?? "/dashboard/contracts");
  const parsed = contractIdSchema.safeParse({ contractId });
  const returnTo = returnToRaw.startsWith("/dashboard/contracts") ? returnToRaw : "/dashboard/contracts";

  if (!parsed.success) {
    redirect(buildActionRedirectUrl(returnTo, { error: "invalid-settlement" }));
  }

  const settlementResult: { mode: "created-payment" | "status-only" | "already-settled" } = { mode: "status-only" };

  try {
    await db.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({
        where: { id: parsed.data.contractId, tenantId: membership.tenantId },
        include: {
          customer: { select: { id: true, fullName: true, phone: true, nationalCode: true, nationalId: true } },
          hall: { select: { id: true, name: true } },
          salon: { select: { id: true, name: true } },
          payments: { select: { id: true, amount: true, type: true, status: true, paidAt: true } },
        },
      });

      if (!contract) {
        throw new Error("CONTRACT_NOT_FOUND");
      }

      const beforeFinancials = calculateSettlementFinancials(contract);

      if (beforeFinancials.alreadySettled) {
        settlementResult.mode = "already-settled";
        return;
      }

      let createdPaymentId: string | null = null;

      if (beforeFinancials.autoSettlementAmount > 0) {
        const payment = await tx.payment.create({
          data: {
            tenantId: membership.tenantId,
            contractId: contract.id,
            customerId: contract.customerId,
            type: "FINAL_SETTLEMENT",
            status: "CONFIRMED",
            amount: String(beforeFinancials.autoSettlementAmount),
            paidAt: new Date(),
            reference: "تسویه نهایی خودکار قرارداد",
            note: "تسویه نهایی خودکار قرارداد",
          },
          select: { id: true },
        });
        createdPaymentId = payment.id;
        settlementResult.mode = "created-payment";
      }

      const updatedContract = await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "COMPLETED",
          remainingAmount: "0",
          remainingAmountManual: false,
        },
        include: {
          customer: { select: { id: true, fullName: true, phone: true, nationalCode: true, nationalId: true } },
          hall: { select: { id: true, name: true } },
          salon: { select: { id: true, name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: membership.tenantId,
          userId: membership.userId,
          action: "FINAL_SETTLEMENT",
          entityType: "CONTRACT",
          entityId: contract.id,
          title: "تسویه نهایی قرارداد",
          message: `قرارداد ${contract.contractNo} مربوط به ${contract.customer.fullName} توسط ${getAuditActorName(membership.user)} تسویه نهایی شد.`,
          beforeData: toAuditJson({
            contractId: contract.id,
            contractNo: contract.contractNo,
            customerName: contract.customer.fullName,
            status: contract.status,
            finalTotal: beforeFinancials.finalTotal,
            receivedAmountBeforeSettlement: beforeFinancials.receivedAmount,
            remainingAmountBeforeSettlement: beforeFinancials.computedRemaining,
            storedRemainingAmountBeforeSettlement: beforeFinancials.storedRemaining,
            payments: contract.payments,
          }),
          afterData: toAuditJson({
            contractId: updatedContract.id,
            contractNo: updatedContract.contractNo,
            customerName: updatedContract.customer.fullName,
            previousStatus: contract.status,
            newStatus: updatedContract.status,
            remainingAmount: 0,
            createdPaymentId,
          }),
          metadata: toAuditJson({
            settlementAuditRetention: "AUDIT_LOG_IS_NOT_DELETED_BY_CONTRACT_SETTLEMENT",
            operationDescription: "تسویه نهایی خودکار قرارداد",
            contractId: contract.id,
            contractNo: contract.contractNo,
            customerName: contract.customer.fullName,
            settledAt: new Date().toISOString(),
            actorUserId: membership.userId,
            actorName: getAuditActorName(membership.user),
            finalTotal: beforeFinancials.finalTotal,
            receivedAmountBeforeSettlement: beforeFinancials.receivedAmount,
            remainingAmountBeforeSettlement: beforeFinancials.computedRemaining,
            autoSettledAmount: beforeFinancials.autoSettlementAmount,
            previousStatus: contract.status,
            newStatus: updatedContract.status,
            paymentCreated: Boolean(createdPaymentId),
            createdPaymentId,
            eventSummary: {
              eventTypeName: contract.eventTypeName,
              eventDate: contract.eventDate,
              eventStartTime: contract.eventStartTime,
              eventEndTime: contract.eventEndTime,
              guestCount: contract.guestCount,
              hallName: contract.hall?.name ?? null,
              salonName: contract.salon?.name ?? null,
            },
          }),
          href: `/dashboard/contracts/${contract.id}`,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTRACT_NOT_FOUND") {
      redirect(buildActionRedirectUrl(returnTo, { error: "not-found" }));
    }

    redirect(buildActionRedirectUrl(returnTo, { error: "settlement-failed" }));
  }

  if (settlementResult.mode !== "already-settled") {
    await dispatchCustomerContractFinalizedSmsSafely({
      db,
      tenantId: membership.tenantId,
      tenant: membership.tenant,
      contractId: parsed.data.contractId,
      actorName: getAuditActorName(membership.user),
    });
  }

  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${parsed.data.contractId}`);
  revalidatePath(`/dashboard/contracts/${parsed.data.contractId}/print`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/settings/activity");

  redirect(buildActionRedirectUrl(returnTo, { settled: settlementResult.mode === "created-payment" ? "1" : settlementResult.mode === "already-settled" ? "already" : "zero" }));
}

export async function deleteContractAction(input: FormData | string) {
  const membership = await requireTenantPermission("contracts.delete");
  const db = await getPrisma();
  const contractId = typeof input === "string" ? input : input.get("contractId");
  const returnToRaw = typeof input === "string" ? "/dashboard/contracts" : String(input.get("returnTo") ?? "/dashboard/contracts");
  const deleteReason = typeof input === "string" ? undefined : parseOptionalText(input.get("deleteReason"));
  const parsed = contractIdSchema.safeParse({ contractId });
  const returnTo = returnToRaw.startsWith("/dashboard/contracts") ? returnToRaw : "/dashboard/contracts";

  if (!parsed.success) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=invalid-delete`);
  }

  const contract = await db.contract.findFirst({
    where: { id: parsed.data.contractId, tenantId: membership.tenantId },
    include: {
      customer: { select: { id: true, fullName: true, phone: true, nationalCode: true, nationalId: true, address: true } },
      hall: { select: { id: true, name: true } },
      salon: { select: { id: true, name: true } },
      lineItems: true,
      payments: {
        include: {
          paymentMethod: { select: { title: true, type: true } },
          installments: true,
          cheques: true,
        },
      },
      paymentInstallments: true,
      paymentCheques: true,
      expenses: {
        include: {
          financialCategory: { select: { title: true, type: true } },
          paymentMethod: { select: { title: true, type: true } },
          cheques: true,
        },
      },
    },
  });

  if (!contract) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}error=not-found`);
  }

  const receivedAmount = calculatePaidAmountForContract(contract.payments, toNumber(contract.depositAmount));
  const paidOutAmount = contract.expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const financialSnapshot = {
    contractId: contract.id,
    contractNo: contract.contractNo,
    customerName: contract.customer.fullName,
    customerPhone: contract.customer.phone,
    status: contract.status,
    financialStatusBeforeDelete: toNumber(contract.remainingAmount) <= 0 && toNumber(contract.finalTotal) > 0 ? "PAID" : receivedAmount > 0 ? "PARTIAL" : "UNPAID",
    finalTotal: toNumber(contract.finalTotal),
    receivedAmount,
    paidOutAmount,
    depositAmount: toNumber(contract.depositAmount),
    discountAmount: toNumber(contract.discountAmount),
    remainingAmount: toNumber(contract.remainingAmount),
  };
  const deletionSummary = {
    contract: {
      id: contract.id,
      contractNo: contract.contractNo,
      title: contract.title,
      eventTypeName: contract.eventTypeName,
      eventDate: contract.eventDate,
      eventStartTime: contract.eventStartTime,
      eventEndTime: contract.eventEndTime,
      guestCount: contract.guestCount,
      hallName: contract.hall?.name ?? null,
      salonName: contract.salon?.name ?? null,
      notes: contract.notes ?? null,
    },
    customer: {
      id: contract.customer.id,
      fullName: contract.customer.fullName,
      phone: contract.customer.phone,
      nationalCode: contract.customer.nationalCode ?? contract.customer.nationalId ?? null,
      address: contract.customer.address ?? null,
    },
    financialSnapshot,
    dependentRecords: {
      lineItems: contract.lineItems.length,
      payments: contract.payments.length,
      paymentInstallments: contract.paymentInstallments.length,
      paymentCheques: contract.paymentCheques.length,
      expenses: contract.expenses.length,
      expenseCheques: contract.expenses.reduce((sum, expense) => sum + expense.cheques.length, 0),
    },
    deleteReason: deleteReason ?? null,
  };
  const contractDeletionAuditSnapshot = {
    id: contract.id,
    tenantId: contract.tenantId,
    customerId: contract.customerId,
    contractNo: contract.contractNo,
    title: contract.title,
    status: contract.status,
    eventTypeId: contract.eventTypeId ?? null,
    eventTypeName: contract.eventTypeName ?? null,
    eventDate: contract.eventDate,
    eventStartTime: contract.eventStartTime ?? null,
    eventEndTime: contract.eventEndTime ?? null,
    guestCount: contract.guestCount,
    hallId: contract.hallId ?? null,
    hallName: contract.hall?.name ?? null,
    salonId: contract.salonId ?? null,
    salonName: contract.salon?.name ?? null,
    packageId: contract.packageId ?? null,
    packageName: contract.packageName ?? null,
    packageTotal: toNumber(contract.packageTotal),
    packageTotalManual: contract.packageTotalManual,
    packagePricePerGuest: toNumber(contract.packagePricePerGuest),
    packageSnapshot: contract.packageSnapshot ?? null,
    servicesTotal: toNumber(contract.servicesTotal),
    servicesTotalManual: contract.servicesTotalManual,
    menuTotal: toNumber(contract.menuTotal),
    menuTotalManual: contract.menuTotalManual,
    discountAmount: toNumber(contract.discountAmount),
    depositAmount: toNumber(contract.depositAmount),
    finalTotal: toNumber(contract.finalTotal),
    finalTotalManual: contract.finalTotalManual,
    remainingAmount: toNumber(contract.remainingAmount),
    remainingAmountManual: contract.remainingAmountManual,
    totalAmount: toNumber(contract.totalAmount),
    notes: contract.notes ?? null,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    customer: deletionSummary.customer,
    financialSnapshot,
    lineItems: contract.lineItems.map((item) => ({
      id: item.id,
      type: item.type,
      pricingType: item.pricingType ?? null,
      category: item.category ?? null,
      name: item.name,
      sourceId: item.sourceId ?? null,
      quantity: item.quantity,
      unitLabel: item.unitLabel ?? null,
      unitPrice: toNumber(item.unitPrice),
      totalPrice: toNumber(item.totalPrice),
      note: item.note ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    payments: contract.payments.map((payment) => ({
      id: payment.id,
      customerId: payment.customerId ?? null,
      paymentMethodId: payment.paymentMethodId ?? null,
      paymentMethodTitle: payment.paymentMethod?.title ?? null,
      paymentMethodType: payment.paymentMethod?.type ?? null,
      type: payment.type,
      status: payment.status,
      amount: toNumber(payment.amount),
      paidAt: payment.paidAt,
      reference: payment.reference ?? null,
      referenceNumber: payment.referenceNumber ?? null,
      trackingCode: payment.trackingCode ?? null,
      chequeNumber: payment.chequeNumber ?? null,
      chequeDueDate: payment.chequeDueDate ?? null,
      note: payment.note ?? null,
      installments: payment.installments.map((installment) => ({
        id: installment.id,
        installmentNumber: installment.installmentNumber,
        amount: toNumber(installment.amount),
        dueDate: installment.dueDate,
        paidAt: installment.paidAt ?? null,
        status: installment.status,
        notes: installment.notes ?? null,
      })),
      cheques: payment.cheques.map((cheque) => ({
        id: cheque.id,
        chequeNumber: cheque.chequeNumber,
        bankName: cheque.bankName ?? null,
        branchName: cheque.branchName ?? null,
        ownerName: cheque.ownerName ?? null,
        amount: toNumber(cheque.amount),
        dueDate: cheque.dueDate,
        status: cheque.status,
        notes: cheque.notes ?? null,
      })),
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })),
    paymentInstallments: contract.paymentInstallments.map((installment) => ({
      id: installment.id,
      paymentId: installment.paymentId,
      installmentNumber: installment.installmentNumber,
      amount: toNumber(installment.amount),
      dueDate: installment.dueDate,
      paidAt: installment.paidAt ?? null,
      status: installment.status,
      notes: installment.notes ?? null,
      createdAt: installment.createdAt,
      updatedAt: installment.updatedAt,
    })),
    paymentCheques: contract.paymentCheques.map((cheque) => ({
      id: cheque.id,
      paymentId: cheque.paymentId,
      chequeNumber: cheque.chequeNumber,
      bankName: cheque.bankName ?? null,
      branchName: cheque.branchName ?? null,
      ownerName: cheque.ownerName ?? null,
      amount: toNumber(cheque.amount),
      dueDate: cheque.dueDate,
      status: cheque.status,
      notes: cheque.notes ?? null,
      createdAt: cheque.createdAt,
      updatedAt: cheque.updatedAt,
    })),
    expenses: contract.expenses.map((expense) => ({
      id: expense.id,
      customerId: expense.customerId ?? null,
      hallId: expense.hallId ?? null,
      salonId: expense.salonId ?? null,
      financialCategoryId: expense.financialCategoryId ?? null,
      financialCategoryTitle: expense.financialCategory?.title ?? null,
      financialCategoryType: expense.financialCategory?.type ?? null,
      paymentMethodId: expense.paymentMethodId ?? null,
      paymentMethodTitle: expense.paymentMethod?.title ?? null,
      paymentMethodType: expense.paymentMethod?.type ?? null,
      title: expense.title,
      amount: toNumber(expense.amount),
      occurredAt: expense.occurredAt,
      status: expense.status,
      description: expense.description,
      vendorName: expense.vendorName ?? null,
      referenceNumber: expense.referenceNumber ?? null,
      note: expense.note ?? null,
      cheques: expense.cheques.map((cheque) => ({
        id: cheque.id,
        chequeNumber: cheque.chequeNumber,
        bankName: cheque.bankName ?? null,
        branchName: cheque.branchName ?? null,
        recipientName: cheque.recipientName ?? null,
        amount: toNumber(cheque.amount),
        dueDate: cheque.dueDate,
        status: cheque.status,
        notes: cheque.notes ?? null,
      })),
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    })),
    deleteReason: deleteReason ?? null,
  };

  await db.$transaction(async (tx) => {
    const expenseIds = contract.expenses.map((expense) => expense.id);

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "DELETE",
        entityType: "CONTRACT",
        entityId: contract.id,
        title: "حذف کامل قرارداد",
        message: `قرارداد ${contract.contractNo} مربوط به ${contract.customer.fullName} توسط ${getAuditActorName(membership.user)} حذف شد. اطلاعات پایه مشتری باقی ماند.`,
        beforeData: toAuditJson(contractDeletionAuditSnapshot),
        metadata: toAuditJson({
          deletionAuditRetention: "AUDIT_LOG_IS_NOT_DELETED_BY_CONTRACT_DELETE",
          deletionSummary,
          financialSnapshot,
        }),
        href: "/dashboard/settings/activity",
      },
    });

    if (expenseIds.length > 0) {
      await tx.expenseCheque.deleteMany({ where: { tenantId: membership.tenantId, expenseId: { in: expenseIds } } });
    }

    await tx.paymentCheque.deleteMany({ where: { tenantId: membership.tenantId, contractId: contract.id } });
    await tx.paymentInstallment.deleteMany({ where: { tenantId: membership.tenantId, contractId: contract.id } });
    await tx.payment.deleteMany({ where: { tenantId: membership.tenantId, contractId: contract.id } });
    await tx.expense.deleteMany({ where: { tenantId: membership.tenantId, contractId: contract.id } });
    await tx.contractLineItem.deleteMany({ where: { tenantId: membership.tenantId, contractId: contract.id } });
    await tx.contract.delete({ where: { id: contract.id } });
  });

  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/settings/activity");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}deleted=1`);
}
