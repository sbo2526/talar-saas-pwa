import type { ContractLineItemType, ContractStatus, PaymentMethodType, Prisma, ServicePricingType } from "@prisma/client";
import { parseDateLikeToDate, toLatinDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { SqliteReader, type SqliteTableRow } from "@/lib/backups/sqlite-reader";

type LegacyCustomerRow = {
  legacyId: number;
  userName: string;
  address?: string;
  phone: string;
  eventType?: string;
  ceremonyDate: Date;
  startTime?: string;
  endTime?: string;
  guestCount: number;
  extraServices?: string;
  nationalCode?: string;
  registerDate?: Date;
  depositAmount: number;
  contractDay?: string;
  foodServices?: string;
  servicesTotal: number;
  menuTotal: number;
  discountAmount: number;
  amountTotal: number;
  isCancelled: boolean;
  cancelReason?: string;
  cancelDate?: Date;
  isSettled: boolean;
  receivedAmount: number;
  settleReason?: string;
  settleDate?: Date;
  sahibMajles?: string;
};

type LegacyPaymentRow = {
  legacyId: number;
  customerId: number;
  paidAt: Date;
  amount: number;
  method?: string;
  note?: string;
};

export type LegacyImportResult = {
  totalRows: number;
  importedContracts: number;
  importedCustomers: number;
  importedPayments: number;
  skippedRows: number;
  duplicateRows: number;
  warnings: string[];
};

const MAX_WARNINGS = 25;

function addWarning(warnings: string[], message: string) {
  if (warnings.length < MAX_WARNINGS) {
    warnings.push(message);
  }
}

function rawString(row: SqliteTableRow, key: string) {
  const value = row[key];
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Uint8Array) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function rawNumber(row: SqliteTableRow, key: string) {
  return parseLegacyAmount(rawString(row, key));
}

function parseLegacyAmount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const normalized = toLatinDigits(String(value))
    .replace(/[٬،,\s]/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizePhone(value: string | undefined) {
  const normalized = value ? toLatinDigits(value).replace(/[\s\-()]/g, "") : "";
  if (!normalized) {
    return "بدون-شماره";
  }

  return normalized;
}

function normalizeNationalCode(value: string | undefined) {
  const normalized = value ? toLatinDigits(value).replace(/[^0-9]/g, "") : "";
  return normalized.length === 10 ? normalized : undefined;
}

function normalizeTime(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = toLatinDigits(value).trim();
  const match = /^(\d{1,2})(?::(\d{1,2}))?/.exec(normalized);
  if (!match) {
    return undefined;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseLegacyDateTime(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = toLatinDigits(value).trim();
  const match = /^(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/.exec(normalized);
  if (!match) {
    return parseDateLikeToDate(normalized);
  }

  const year = Number(match[1]);
  const datePart = `${match[1]}-${String(Number(match[2])).padStart(2, "0")}-${String(Number(match[3])).padStart(2, "0")}`;
  const date = year >= 1200 && year <= 1600
    ? parseDateLikeToDate(datePart)
    : new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0));

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  if (match[4]) {
    date.setUTCHours(Number(match[4]), Number(match[5] ?? 0), Number(match[6] ?? 0), 0);
  }

  return date;
}

function getContractStatus(row: LegacyCustomerRow): ContractStatus {
  if (row.isCancelled) {
    return "CANCELED";
  }

  if (row.isSettled) {
    return "COMPLETED";
  }

  if (row.depositAmount > 0 || row.receivedAmount > 0) {
    return "RESERVED";
  }

  return "DRAFT";
}

function mapPaymentMethodType(method: string | undefined): PaymentMethodType {
  const normalized = method ?? "";

  if (normalized.includes("چک")) {
    return "CHECK";
  }

  if (normalized.includes("کارت")) {
    return "CARD";
  }

  if (normalized.includes("واریز") || normalized.includes("بانک") || normalized.includes("حواله")) {
    return "BANK_TRANSFER";
  }

  if (normalized.includes("آنلاین") || normalized.toLowerCase().includes("online")) {
    return "ONLINE";
  }

  if (normalized.includes("نقد")) {
    return "CASH";
  }

  return "OTHER";
}

function buildLegacyNote(row: LegacyCustomerRow) {
  const parts = [
    `شناسه قدیمی: ${row.legacyId}`,
    row.contractDay ? `روز قرارداد در نرم‌افزار قبلی: ${row.contractDay}` : null,
    row.sahibMajles ? `صاحب مجلس: ${row.sahibMajles}` : null,
    row.cancelReason ? `علت لغو: ${row.cancelReason}` : null,
    row.cancelDate ? `تاریخ لغو: ${row.cancelDate.toISOString()}` : null,
    row.settleReason ? `توضیح تسویه: ${row.settleReason}` : null,
    row.settleDate ? `تاریخ تسویه: ${row.settleDate.toISOString()}` : null,
  ].filter(Boolean);

  return parts.join(" | ");
}

function toLegacyCustomerRow(row: SqliteTableRow, warnings: string[]): LegacyCustomerRow | null {
  const legacyId = Number(row.Id ?? 0);
  const userName = rawString(row, "UserName") ?? "مشتری بدون نام";
  const ceremonyDate = parseLegacyDateTime(rawString(row, "CeremonyDate"));

  if (!Number.isInteger(legacyId) || legacyId <= 0) {
    addWarning(warnings, "یک ردیف به دلیل شناسه قدیمی نامعتبر رد شد.");
    return null;
  }

  if (!ceremonyDate) {
    addWarning(warnings, `قرارداد قدیمی ${legacyId} به دلیل تاریخ مراسم نامعتبر رد شد.`);
    return null;
  }

  const amountTotal = rawNumber(row, "AmountTotal");
  const discountAmount = rawNumber(row, "Discount");
  const servicesTotal = rawNumber(row, "TotalServicePrice");
  const menuTotal = rawNumber(row, "FoodTotalPrice");
  const depositAmount = rawNumber(row, "Bayane");

  return {
    legacyId,
    userName,
    address: rawString(row, "Address"),
    phone: normalizePhone(rawString(row, "Phone")),
    eventType: rawString(row, "EventType"),
    ceremonyDate,
    startTime: normalizeTime(rawString(row, "StartTime")),
    endTime: normalizeTime(rawString(row, "EndTime")),
    guestCount: Math.max(1, Number(row.NumberOfPeople ?? 1) || 1),
    extraServices: rawString(row, "ExtraServices"),
    nationalCode: normalizeNationalCode(rawString(row, "CodeMeli")),
    registerDate: parseLegacyDateTime(rawString(row, "RegisterDate")) ?? undefined,
    depositAmount,
    contractDay: rawString(row, "ContractDay"),
    foodServices: rawString(row, "FoodServices"),
    servicesTotal,
    menuTotal,
    discountAmount,
    amountTotal,
    isCancelled: Number(row.IsCancelled ?? 0) === 1,
    cancelReason: rawString(row, "CancelReason"),
    cancelDate: parseLegacyDateTime(rawString(row, "CancelDate")) ?? undefined,
    isSettled: Number(row.IsSettled ?? 0) === 1,
    receivedAmount: rawNumber(row, "ReceivedAmount"),
    settleReason: rawString(row, "SettleReason"),
    settleDate: parseLegacyDateTime(rawString(row, "SettleDate")) ?? undefined,
    sahibMajles: rawString(row, "SahabMajles"),
  };
}

function toLegacyPaymentRow(row: SqliteTableRow, warnings: string[]): LegacyPaymentRow | null {
  const legacyId = Number(row.Id ?? 0);
  const customerId = Number(row.CustomerId ?? 0);
  const paidAt = parseLegacyDateTime(rawString(row, "PayDate"));
  const amount = rawNumber(row, "Amount");

  if (!Number.isInteger(legacyId) || legacyId <= 0 || !Number.isInteger(customerId) || customerId <= 0 || !paidAt || amount <= 0) {
    addWarning(warnings, `یک ردیف پرداخت قدیمی به دلیل اطلاعات ناقص رد شد.`);
    return null;
  }

  return {
    legacyId,
    customerId,
    paidAt,
    amount,
    method: rawString(row, "Method"),
    note: rawString(row, "Note"),
  };
}

type LegacyLineItem = {
  type: ContractLineItemType;
  pricingType: ServicePricingType;
  category: string;
  name: string;
  quantity: number;
  unitLabel: string;
  unitPrice: string;
  totalPrice: string;
  note?: string;
};

function buildLineItems(row: LegacyCustomerRow, fallbackTotal: number): LegacyLineItem[] {
  const lineItems: LegacyLineItem[] = [];

  if (row.menuTotal > 0 || row.foodServices) {
    lineItems.push({
      type: "MENU",
      pricingType: "CUSTOM",
      category: "ایمپورت بکاپ قدیمی",
      name: "خدمات غذایی نرم‌افزار قبلی",
      quantity: Math.max(1, row.guestCount),
      unitLabel: "قرارداد",
      unitPrice: String(row.menuTotal),
      totalPrice: String(row.menuTotal),
      note: row.foodServices ?? "ثبت‌شده از بکاپ قدیمی",
    });
  }

  if (row.servicesTotal > 0 || row.extraServices) {
    lineItems.push({
      type: "SERVICE",
      pricingType: "CUSTOM",
      category: "ایمپورت بکاپ قدیمی",
      name: "خدمات اضافه نرم‌افزار قبلی",
      quantity: 1,
      unitLabel: "قرارداد",
      unitPrice: String(row.servicesTotal),
      totalPrice: String(row.servicesTotal),
      note: row.extraServices ?? "ثبت‌شده از بکاپ قدیمی",
    });
  }

  const explicitTotal = row.menuTotal + row.servicesTotal;
  if (fallbackTotal > 0 && explicitTotal <= 0) {
    lineItems.push({
      type: "SERVICE",
      pricingType: "CUSTOM",
      category: "ایمپورت بکاپ قدیمی",
      name: "جمع مالی قرارداد نرم‌افزار قبلی",
      quantity: 1,
      unitLabel: "قرارداد",
      unitPrice: String(fallbackTotal),
      totalPrice: String(fallbackTotal),
      note: buildLegacyNote(row) || "مبلغ کل از ستون AmountTotal بکاپ قدیمی خوانده شد.",
    });
  }

  if (lineItems.length === 0) {
    lineItems.push({
      type: "SERVICE",
      pricingType: "CUSTOM",
      category: "ایمپورت بکاپ قدیمی",
      name: "مبلغ کل قرارداد نرم‌افزار قبلی",
      quantity: 1,
      unitLabel: "قرارداد",
      unitPrice: String(fallbackTotal),
      totalPrice: String(fallbackTotal),
      note: buildLegacyNote(row) || "ثبت‌شده از بکاپ قدیمی",
    });
  }

  return lineItems;
}

async function getOrCreatePaymentMethod(
  tx: Prisma.TransactionClient,
  tenantId: string,
  method: string | undefined,
) {
  const title = method?.trim() || "دریافت ایمپورت‌شده";

  return tx.paymentMethod.upsert({
    where: {
      tenantId_title: {
        tenantId,
        title,
      },
    },
    update: {
      isActive: true,
    },
    create: {
      tenantId,
      title,
      code: `LEGACY-${title}`.slice(0, 64),
      type: mapPaymentMethodType(title),
      description: "ایجادشده هنگام بازگردانی بکاپ نرم‌افزار قدیمی",
      isActive: true,
    },
  });
}

async function findOrCreateCustomer(
  tx: Prisma.TransactionClient,
  tenantId: string,
  row: LegacyCustomerRow,
) {
  const identityFilters = [
    row.nationalCode ? { nationalCode: row.nationalCode } : undefined,
    row.phone && row.phone !== "بدون-شماره" ? { phone: row.phone } : undefined,
  ].filter(Boolean) as Prisma.CustomerWhereInput[];

  const existing = identityFilters.length > 0
    ? await tx.customer.findFirst({
        where: {
          tenantId,
          OR: identityFilters,
        },
      })
    : null;

  const legacyNote = buildLegacyNote(row);

  if (existing) {
    return {
      customer: await tx.customer.update({
        where: { id: existing.id },
        data: {
          fullName: existing.fullName || row.userName,
          phone: existing.phone || row.phone,
          nationalCode: existing.nationalCode || row.nationalCode,
          nationalId: existing.nationalId || row.nationalCode,
          address: existing.address || row.address,
          notes: existing.notes || legacyNote || undefined,
          isActive: true,
        },
      }),
      created: false,
    };
  }

  return {
    customer: await tx.customer.create({
      data: {
        tenantId,
        fullName: row.userName,
        phone: row.phone,
        nationalCode: row.nationalCode,
        nationalId: row.nationalCode,
        address: row.address,
        notes: legacyNote || undefined,
        isActive: true,
        createdAt: row.registerDate ?? undefined,
      },
    }),
    created: true,
  };
}

export async function importLegacySqliteBackup(input: {
  tenantId: string;
  userId: string;
  fileBytes: Uint8Array;
  fileName: string;
}): Promise<LegacyImportResult> {
  const warnings: string[] = [];
  const reader = new SqliteReader(input.fileBytes);

  if (!reader.hasTable("customers")) {
    throw new Error("LEGACY_CUSTOMERS_TABLE_MISSING");
  }

  const rawCustomers = reader.readTable("customers");
  const customers = rawCustomers
    .map((row) => toLegacyCustomerRow(row, warnings))
    .filter((row): row is LegacyCustomerRow => Boolean(row));

  const customerPayments = reader.hasTable("customer_payments")
    ? reader.readTable("customer_payments")
        .map((row) => toLegacyPaymentRow(row, warnings))
        .filter((row): row is LegacyPaymentRow => Boolean(row))
    : [];

  const paymentsByCustomerId = new Map<number, LegacyPaymentRow[]>();
  for (const payment of customerPayments) {
    const list = paymentsByCustomerId.get(payment.customerId) ?? [];
    list.push(payment);
    paymentsByCustomerId.set(payment.customerId, list);
  }

  if (customers.length === 0) {
    throw new Error("NO_IMPORTABLE_LEGACY_CONTRACTS");
  }

  const db = await getPrisma();
  const existingContracts = await db.contract.findMany({
    where: {
      tenantId: input.tenantId,
      contractNo: {
        in: customers.map((row) => `OLD-${row.legacyId}`),
      },
    },
    select: { contractNo: true },
  });
  const existingContractNos = new Set(existingContracts.map((contract) => contract.contractNo));

  const result: LegacyImportResult = {
    totalRows: rawCustomers.length,
    importedContracts: 0,
    importedCustomers: 0,
    importedPayments: 0,
    skippedRows: rawCustomers.length - customers.length,
    duplicateRows: 0,
    warnings,
  };

  await db.$transaction(async (tx) => {
    for (const row of customers) {
      const contractNo = `OLD-${row.legacyId}`;
      if (existingContractNos.has(contractNo)) {
        result.duplicateRows += 1;
        continue;
      }

      const { customer, created } = await findOrCreateCustomer(tx, input.tenantId, row);
      if (created) {
        result.importedCustomers += 1;
      }

      let eventTypeId: string | undefined;
      let eventTypeName = row.eventType || "مراسم ایمپورت‌شده";
      if (eventTypeName) {
        const eventType = await tx.contractEventType.upsert({
          where: {
            tenantId_name: {
              tenantId: input.tenantId,
              name: eventTypeName,
            },
          },
          update: { isActive: true },
          create: {
            tenantId: input.tenantId,
            name: eventTypeName,
            isActive: true,
          },
        });
        eventTypeId = eventType.id;
        eventTypeName = eventType.name;
      }

      const explicitLineTotal = row.servicesTotal + row.menuTotal;
      const grossTotal = row.amountTotal > 0 ? row.amountTotal : explicitLineTotal;
      const servicesTotalForContract = explicitLineTotal > 0 ? row.servicesTotal : grossTotal;
      const menuTotalForContract = explicitLineTotal > 0 ? row.menuTotal : 0;
      const finalTotal = Math.max(0, grossTotal - row.discountAmount);
      const legacyPayments = paymentsByCustomerId.get(row.legacyId) ?? [];
      const extraPaymentsTotal = legacyPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const paidTotal = row.depositAmount + extraPaymentsTotal;
      const remainingAmount = Math.max(0, finalTotal - paidTotal);
      const legacyNote = buildLegacyNote(row);

      const createdContract = await tx.contract.create({
        data: {
          tenantId: input.tenantId,
          customerId: customer.id,
          contractNo,
          title: `${eventTypeName} - ${row.userName}`,
          status: getContractStatus(row),
          eventTypeId,
          eventTypeName,
          eventDate: row.ceremonyDate,
          eventStartTime: row.startTime ?? "00:00",
          eventEndTime: row.endTime ?? "23:59",
          guestCount: row.guestCount,
          servicesTotal: String(servicesTotalForContract),
          menuTotal: String(menuTotalForContract),
          discountAmount: String(row.discountAmount),
          depositAmount: String(row.depositAmount),
          finalTotal: String(finalTotal),
          remainingAmount: String(remainingAmount),
          totalAmount: String(finalTotal),
          createdAt: row.registerDate ?? undefined,
          lineItems: {
            create: buildLineItems(row, grossTotal).map((item) => ({
              tenantId: input.tenantId,
              type: item.type,
              pricingType: item.pricingType,
              category: item.category,
              name: item.name,
              quantity: item.quantity,
              unitLabel: item.unitLabel,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              note: [item.note, legacyNote].filter(Boolean).join(" | ") || undefined,
            })),
          },
        },
      });

      if (row.depositAmount > 0) {
        const paymentMethod = await getOrCreatePaymentMethod(tx, input.tenantId, "بیعانه بکاپ قدیمی");
        await tx.payment.create({
          data: {
            tenantId: input.tenantId,
            contractId: createdContract.id,
            customerId: customer.id,
            paymentMethodId: paymentMethod.id,
            type: "DEPOSIT",
            status: "RECORDED",
            amount: String(row.depositAmount),
            paidAt: row.registerDate ?? new Date(),
            reference: `بیعانه قرارداد قدیمی ${row.legacyId}`,
            note: legacyNote || undefined,
          },
        });
        result.importedPayments += 1;
      }

      for (const legacyPayment of legacyPayments) {
        const paymentMethod = await getOrCreatePaymentMethod(tx, input.tenantId, legacyPayment.method);
        await tx.payment.create({
          data: {
            tenantId: input.tenantId,
            contractId: createdContract.id,
            customerId: customer.id,
            paymentMethodId: paymentMethod.id,
            type: "INSTALLMENT",
            status: "RECORDED",
            amount: String(legacyPayment.amount),
            paidAt: legacyPayment.paidAt,
            reference: `پرداخت قدیمی ${legacyPayment.legacyId} برای قرارداد ${row.legacyId}`,
            note: legacyPayment.note,
          },
        });
        result.importedPayments += 1;
      }

      result.importedContracts += 1;
      existingContractNos.add(contractNo);
    }
  }, { timeout: 60_000 });

  result.skippedRows += result.duplicateRows;
  return result;
}
