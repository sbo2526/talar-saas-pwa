"use server";

import type { Prisma } from "@prisma/client";
import type { PaymentActionState } from "@/lib/actions/payment-state";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { paymentFormSchema, paymentIdSchema } from "@/lib/validation/payment";
import { getEffectivePaidAmount, toNumber } from "@/lib/payments/display";
import { buildPaymentNotificationVariables } from "@/lib/notifications/event-variables";
import { dispatchOwnerNotification } from "@/lib/notifications/owner-notification-dispatcher";
import { dispatchCustomerSmsNotification } from "@/lib/notifications/customer-notification-dispatcher";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { buildAuditMessage, buildPaymentReceivedMessage, getAuditActorName } from "@/lib/audit/audit-log-messages";
import { getContractFinancialState } from "@/lib/finance/contract-financial-state";

const activePaymentStatuses = ["RECORDED", "CONFIRMED"];
const receiptMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);
const maxReceiptBytes = 5 * 1024 * 1024;

function maskChequeNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const normalized = value.trim();
  if (normalized.length <= 4) return normalized;
  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

async function fetchPaymentForNotification(
  db: Awaited<ReturnType<typeof getPrisma>>,
  tenantId: string,
  paymentId: string,
) {
  return db.payment.findFirst({
    where: { id: paymentId, tenantId },
    select: {
      id: true,
      contractId: true,
      customerId: true,
      amount: true,
      type: true,
      status: true,
      paidAt: true,
      trackingCode: true,
      referenceNumber: true,
      reference: true,
      paymentMethod: { select: { title: true, type: true } },
      customer: {
        select: {
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      contract: {
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
          finalTotal: true,
          depositAmount: true,
          remainingAmount: true,
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
      },
    },
  });
}

async function dispatchPaymentTelegramNotificationSafely(input: {
  db: Awaited<ReturnType<typeof getPrisma>>;
  tenantId: string;
  tenant: { name?: string | null };
  paymentId: string;
  eventType: "PAYMENT_CREATED" | "PAYMENT_UPDATED" | "PAYMENT_CANCELED";
  actorName?: string;
}) {
  try {
    const payment = await fetchPaymentForNotification(input.db, input.tenantId, input.paymentId);

    if (!payment) {
      return;
    }

    const variables = {
      ...buildPaymentNotificationVariables(payment, payment.contract, payment.customer, input.tenant),
      operatorName: input.actorName ?? "سامانه",
      userName: input.actorName ?? "سامانه",
    };
    const customer = payment.customer ?? payment.contract?.customer ?? null;

    await dispatchOwnerNotification({
      tenantId: input.tenantId,
      eventType: input.eventType,
      variables,
      relatedPaymentId: payment.id,
      relatedContractId: payment.contractId,
      relatedCustomerId: payment.customerId,
    });

    if (input.eventType === "PAYMENT_CREATED") {
      await dispatchCustomerSmsNotification({
        tenantId: input.tenantId,
        eventType: "PAYMENT_CREATED",
        customerMobile: customer?.phone,
        customerName: customer?.fullName,
        variables,
        relatedPaymentId: payment.id,
        relatedContractId: payment.contractId,
        relatedCustomerId: payment.customerId,
      });
    }
  } catch {
    // اعلان مدیریتی best-effort است و نباید عملیات اصلی دریافت را شکست دهد.
  }
}

function parsePaymentForm(formData: FormData) {
  const installmentAmounts = formData.getAll("installmentAmount");
  const installmentDueDates = formData.getAll("installmentDueDate");
  const installmentStatuses = formData.getAll("installmentStatus");
  const installmentNotes = formData.getAll("installmentNotes");
  const installments = installmentAmounts.map((amount, index) => ({
    amount,
    dueDate: installmentDueDates[index],
    status: installmentStatuses[index] || "PENDING",
    notes: installmentNotes[index],
  }));

  return paymentFormSchema.safeParse({
    paymentId: formData.get("paymentId"),
    contractId: formData.get("contractId"),
    customerId: formData.get("customerId"),
    paymentMethodId: formData.get("paymentMethodId"),
    type: formData.get("type"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    finalSettlement: formData.get("finalSettlement"),
    paidAt: formData.get("paidAt"),
    referenceNumber: formData.get("referenceNumber"),
    trackingCode: formData.get("trackingCode"),
    chequeNumber: formData.get("chequeNumber"),
    chequeDueDate: formData.get("chequeDueDate"),
    chequeBankName: formData.get("chequeBankName"),
    chequeBranchName: formData.get("chequeBranchName"),
    chequeOwnerName: formData.get("chequeOwnerName"),
    chequeAmount: formData.get("chequeAmount"),
    chequeStatus: formData.get("chequeStatus"),
    installmentCount: formData.get("installmentCount"),
    installmentTotalAmount: formData.get("installmentTotalAmount"),
    installmentStartDate: formData.get("installmentStartDate"),
    installmentIntervalDays: formData.get("installmentIntervalDays"),
    installments,
    note: formData.get("note"),
  });
}

function revalidatePaymentPaths(contractId?: string | null) {
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/reports");

  if (contractId) {
    revalidatePath(`/dashboard/contracts/${contractId}`);
  }
}

function isReceiptFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

async function saveReceiptFile(file: File) {
  const extension = receiptMimeTypes.get(file.type);

  if (!extension || file.size > maxReceiptBytes) {
    throw new Error("INVALID_RECEIPT_FILE");
  }

  const directory = path.join(process.cwd(), "public", "uploads", "payment-receipts");
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const key = `payment-receipts/${filename}`;
  const publicUrl = `/uploads/${key}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);

  return { key, publicUrl };
}

async function ensurePaymentMethod(
  tx: Prisma.TransactionClient,
  tenantId: string,
  paymentMethodId: string,
  options?: { existingPaymentId?: string },
) {
  const method = await tx.paymentMethod.findFirst({
    where: { id: paymentMethodId, tenantId },
    select: { id: true, type: true, isActive: true },
  });

  if (!method) {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  if (method.isActive) {
    return method;
  }

  if (options?.existingPaymentId) {
    const currentPayment = await tx.payment.findFirst({
      where: {
        id: options.existingPaymentId,
        tenantId,
        paymentMethodId,
      },
      select: { id: true },
    });

    if (currentPayment) {
      return method;
    }
  }

  throw new Error("INVALID_PAYMENT_METHOD");
}

async function resolveContractAndCustomer(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contractId: string | undefined,
  customerId: string | undefined,
) {
  if (contractId) {
    const contract = await tx.contract.findFirst({
      where: { id: contractId, tenantId },
      select: { id: true, customerId: true },
    });

    if (!contract) {
      throw new Error("INVALID_CONTRACT");
    }

    return { contractId: contract.id, customerId: contract.customerId };
  }

  if (customerId) {
    const customer = await tx.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });

    if (!customer) {
      throw new Error("INVALID_CUSTOMER");
    }

    return { contractId: null, customerId: customer.id };
  }

  throw new Error("INVALID_CONTRACT");
}

async function syncContractFinancials(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contractId: string | null | undefined,
) {
  if (!contractId) {
    return;
  }

  const contract = await tx.contract.findFirst({
    where: { id: contractId, tenantId },
    select: { id: true, status: true, finalTotal: true, depositAmount: true, remainingAmountManual: true },
  });

  if (!contract) {
    return;
  }

  if (contract.status === "CANCELED") {
    await tx.contract.update({
      where: { id: contract.id },
      data: { remainingAmount: 0, remainingAmountManual: false },
    });
    return;
  }

  if (contract.remainingAmountManual) {
    return;
  }

  const payments = await tx.payment.findMany({
    where: {
      tenantId,
      contractId,
      status: { in: activePaymentStatuses },
    },
    select: { amount: true, type: true, status: true },
  });
  const paidFromRecords = getEffectivePaidAmount(payments);
  const paidAmount = paidFromRecords > 0 ? paidFromRecords : toNumber(contract.depositAmount);
  const remainingAmount = Math.max(0, toNumber(contract.finalTotal) - paidAmount);

  await tx.contract.update({
    where: { id: contract.id },
    data: { remainingAmount },
  });
}


function getPaymentErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "ثبت دریافت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
  }

  if (error.message === "INVALID_PAYMENT_METHOD") {
    return "روش دریافت انتخاب‌شده معتبر نیست.";
  }

  if (error.message === "INVALID_CONTRACT") {
    return "قرارداد انتخاب‌شده معتبر نیست.";
  }

  if (error.message === "INVALID_CUSTOMER") {
    return "مشتری انتخاب‌شده معتبر نیست.";
  }

  if (error.message === "INVALID_RECEIPT_FILE") {
    return "فایل رسید معتبر نیست. فقط JPG، PNG، WebP یا PDF تا ۵ مگابایت مجاز است.";
  }

  if (error.message === "CONTRACT_SETTLED") {
    return "این قرارداد قبلاً تسویه شده است و امکان ثبت دریافت جدید برای آن وجود ندارد.";
  }

  if (error.message === "CONTRACT_CANCELED") {
    return "این قرارداد لغو شده است و امکان ثبت دریافت برای آن وجود ندارد.";
  }

  if (error.message === "AMOUNT_EXCEEDS_REMAINING") {
    return "مبلغ دریافتی از مانده قرارداد بیشتر است.";
  }

  if (error.message === "CONTRACT_OVER_RECEIVED") {
    return "این قرارداد اضافه دریافت دارد و امکان ثبت دریافت جدید برای آن وجود ندارد.";
  }

  if (error.message === "CONTRACT_NEUTRAL") {
    return "این قرارداد مبلغ نهایی قابل دریافت ندارد و امکان ثبت دریافت برای آن وجود ندارد.";
  }

  if (error.message === "INVALID_CHEQUE") {
    return "اطلاعات چک را کامل و معتبر وارد کنید.";
  }

  if (error.message === "PAYMENT_NOT_FOUND") {
    return "دریافت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.";
  }

  return "ثبت دریافت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

export async function createPaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const membership = await requireTenantPermission("payments.create");
  const parsed = parsePaymentForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات دریافت معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const receiptFile = formData.get("receiptFile");
  let createdPaymentId = "";
  let linkedContractId: string | null = null;

  try {
    const receipt = isReceiptFile(receiptFile) ? await saveReceiptFile(receiptFile) : null;

    await db.$transaction(async (tx) => {
      const paymentMethod = await ensurePaymentMethod(tx, membership.tenantId, parsed.data.paymentMethodId);
      const chequeNumber = paymentMethod.type === "CHECK" ? parsed.data.chequeNumber : null;
      const chequeDueDate = paymentMethod.type === "CHECK" ? parsed.data.chequeDueDate ?? null : null;
      const relation = await resolveContractAndCustomer(
        tx,
        membership.tenantId,
        parsed.data.contractId,
        parsed.data.customerId,
      );
      linkedContractId = relation.contractId;

      const isFinalSettlement = Boolean(parsed.data.finalSettlement && relation.contractId && parsed.data.type !== "REFUND");

      if (relation.contractId) {
        const financialState = await getContractFinancialState(membership.tenantId, relation.contractId, tx);
        if (financialState.state === "CANCELED") throw new Error("CONTRACT_CANCELED");
        if (financialState.state === "SETTLED" && parsed.data.type !== "REFUND") throw new Error("CONTRACT_SETTLED");
        if (financialState.state === "NEGATIVE" && parsed.data.type !== "REFUND") throw new Error("CONTRACT_OVER_RECEIVED");
        if (financialState.state === "NEUTRAL" && parsed.data.type !== "REFUND") throw new Error("CONTRACT_NEUTRAL");
        if (isFinalSettlement) {
          parsed.data.amount = Math.max(0, Math.round(financialState.remainingAmount));
        }
        if (parsed.data.amount > financialState.remainingAmount && parsed.data.type !== "REFUND") throw new Error("AMOUNT_EXCEEDS_REMAINING");
      }

      if (paymentMethod.type === "CHECK" && (!parsed.data.chequeNumber || !parsed.data.chequeDueDate || !parsed.data.chequeAmount)) {
        throw new Error("INVALID_CHEQUE");
      }

      const payment = await tx.payment.create({
        data: {
          tenantId: membership.tenantId,
          contractId: relation.contractId,
          customerId: relation.customerId,
          paymentMethodId: parsed.data.paymentMethodId,
          type: parsed.data.type,
          status: parsed.data.status,
          amount: parsed.data.amount,
          paidAt: parsed.data.paidAt,
          reference: parsed.data.trackingCode ?? parsed.data.referenceNumber ?? null,
          referenceNumber: parsed.data.referenceNumber,
          trackingCode: parsed.data.trackingCode,
          chequeNumber,
          chequeDueDate,
          receiptImageUrl: receipt?.publicUrl,
          receiptImageKey: receipt?.key,
          note: parsed.data.finalSettlement
            ? [parsed.data.note, "تسویه نهایی قرارداد"].filter(Boolean).join(" - ")
            : parsed.data.note,
        },
        select: { id: true },
      });
      createdPaymentId = payment.id;

      if (paymentMethod.type === "CHECK") {
        await tx.paymentCheque.create({
          data: {
            tenantId: membership.tenantId,
            paymentId: payment.id,
            contractId: relation.contractId,
            chequeNumber: parsed.data.chequeNumber ?? "",
            bankName: parsed.data.chequeBankName,
            branchName: parsed.data.chequeBranchName,
            ownerName: parsed.data.chequeOwnerName,
            amount: String(parsed.data.chequeAmount ?? parsed.data.amount),
            dueDate: parsed.data.chequeDueDate ?? parsed.data.paidAt,
            status: parsed.data.chequeStatus ?? "PENDING",
            notes: parsed.data.note,
          },
        });
      }

      if (parsed.data.type === "INSTALLMENT" && parsed.data.installments?.length) {
        await tx.paymentInstallment.createMany({
          data: parsed.data.installments.map((installment, index) => ({
            tenantId: membership.tenantId,
            paymentId: payment.id,
            contractId: relation.contractId,
            installmentNumber: index + 1,
            amount: String(installment.amount),
            dueDate: installment.dueDate,
            paidAt: installment.status === "PAID" ? parsed.data.paidAt : null,
            status: installment.status,
            notes: installment.notes ?? null,
          })),
        });
      }

      await syncContractFinancials(tx, membership.tenantId, relation.contractId);

      if (isFinalSettlement && relation.contractId) {
        await tx.contract.update({
          where: { id: relation.contractId },
          data: {
            status: "COMPLETED",
            remainingAmount: "0",
            remainingAmountManual: false,
          },
        });
      }
    });
  } catch (error) {
    return { ok: false, message: getPaymentErrorMessage(error) };
  }

  const createdPaymentForAudit = await db.payment.findFirst({
    where: { id: createdPaymentId, tenantId: membership.tenantId },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      paymentMethod: { select: { title: true, type: true } },
      installments: { select: { id: true, installmentNumber: true, amount: true, dueDate: true, status: true } },
      cheques: { select: { id: true, chequeNumber: true, amount: true, dueDate: true, status: true } },
    },
  });

  if (createdPaymentForAudit) {
    const userName = getAuditActorName(membership.user);
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "PAYMENT_RECEIVED",
      entityType: "PAYMENT",
      entityId: createdPaymentForAudit.id,
      title: "ثبت دریافت",
      message: buildPaymentReceivedMessage({
        amount: createdPaymentForAudit.amount,
        contractNo: createdPaymentForAudit.contract?.contractNo,
        userName,
      }),
      afterData: createdPaymentForAudit,
      metadata: {
        installmentCount: createdPaymentForAudit.installments.length || undefined,
        chequeNumber: maskChequeNumber(createdPaymentForAudit.cheques[0]?.chequeNumber),
      },
      href: `/dashboard/payments/${createdPaymentForAudit.id}`,
    });
  }

  await dispatchPaymentTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    paymentId: createdPaymentId,
    actorName: getAuditActorName(membership.user),
    eventType: "PAYMENT_CREATED",
  });

  revalidatePaymentPaths(linkedContractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/payments/${createdPaymentId}?created=1`);
}

export async function updatePaymentAction(
  _previousState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const membership = await requireTenantPermission("payments.edit");
  const parsed = parsePaymentForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات دریافت معتبر نیست.",
    };
  }

  if (!parsed.data.paymentId) {
    return {
      ok: false,
      message: "شناسه دریافت معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const receiptFile = formData.get("receiptFile");
  let linkedContractId: string | null = null;
  let previousContractId: string | null = null;
  let beforePaymentForAudit: unknown = null;

  try {
    const receipt = isReceiptFile(receiptFile) ? await saveReceiptFile(receiptFile) : null;

    await db.$transaction(async (tx) => {
      const current = await tx.payment.findFirst({
        where: { id: parsed.data.paymentId, tenantId: membership.tenantId },
        include: {
          contract: { select: { id: true, contractNo: true } },
          customer: { select: { fullName: true, phone: true } },
          paymentMethod: { select: { title: true, type: true } },
        },
      });

      if (!current) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      beforePaymentForAudit = current;
      previousContractId = current.contractId;
      const paymentMethod = await ensurePaymentMethod(tx, membership.tenantId, parsed.data.paymentMethodId, {
        existingPaymentId: current.id,
      });
      const chequeNumber = paymentMethod.type === "CHECK" ? parsed.data.chequeNumber : null;
      const chequeDueDate = paymentMethod.type === "CHECK" ? parsed.data.chequeDueDate ?? null : null;
      const relation = await resolveContractAndCustomer(
        tx,
        membership.tenantId,
        parsed.data.contractId,
        parsed.data.customerId,
      );
      linkedContractId = relation.contractId;

      if (paymentMethod.type === "CHECK" && (!parsed.data.chequeNumber || !parsed.data.chequeDueDate || !parsed.data.chequeAmount)) {
        throw new Error("INVALID_CHEQUE");
      }

      await tx.payment.update({
        where: { id: current.id },
        data: {
          contractId: relation.contractId,
          customerId: relation.customerId,
          paymentMethodId: parsed.data.paymentMethodId,
          type: parsed.data.type,
          status: parsed.data.status,
          amount: parsed.data.amount,
          paidAt: parsed.data.paidAt,
          reference: parsed.data.trackingCode ?? parsed.data.referenceNumber ?? null,
          referenceNumber: parsed.data.referenceNumber,
          trackingCode: parsed.data.trackingCode,
          chequeNumber,
          chequeDueDate,
          ...(receipt
            ? {
                receiptImageUrl: receipt.publicUrl,
                receiptImageKey: receipt.key,
              }
            : {}),
          note: parsed.data.note,
        },
      });

      await tx.paymentCheque.deleteMany({ where: { tenantId: membership.tenantId, paymentId: current.id } });
      if (paymentMethod.type === "CHECK") {
        await tx.paymentCheque.create({
          data: {
            tenantId: membership.tenantId,
            paymentId: current.id,
            contractId: relation.contractId,
            chequeNumber: parsed.data.chequeNumber ?? "",
            bankName: parsed.data.chequeBankName,
            branchName: parsed.data.chequeBranchName,
            ownerName: parsed.data.chequeOwnerName,
            amount: String(parsed.data.chequeAmount ?? parsed.data.amount),
            dueDate: parsed.data.chequeDueDate ?? parsed.data.paidAt,
            status: parsed.data.chequeStatus ?? "PENDING",
            notes: parsed.data.note,
          },
        });
      }

      await tx.paymentInstallment.deleteMany({ where: { tenantId: membership.tenantId, paymentId: current.id } });
      if (parsed.data.type === "INSTALLMENT" && parsed.data.installments?.length) {
        await tx.paymentInstallment.createMany({
          data: parsed.data.installments.map((installment, index) => ({
            tenantId: membership.tenantId,
            paymentId: current.id,
            contractId: relation.contractId,
            installmentNumber: index + 1,
            amount: String(installment.amount),
            dueDate: installment.dueDate,
            paidAt: installment.status === "PAID" ? parsed.data.paidAt : null,
            status: installment.status,
            notes: installment.notes ?? null,
          })),
        });
      }

      await syncContractFinancials(tx, membership.tenantId, previousContractId);
      if (linkedContractId !== previousContractId) {
        await syncContractFinancials(tx, membership.tenantId, linkedContractId);
      }
    });
  } catch (error) {
    return { ok: false, message: getPaymentErrorMessage(error) };
  }

  const updatedPaymentForAudit = await db.payment.findFirst({
    where: { id: parsed.data.paymentId, tenantId: membership.tenantId },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
  });

  if (updatedPaymentForAudit) {
    const userName = getAuditActorName(membership.user);
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "UPDATE",
      entityType: "PAYMENT",
      entityId: updatedPaymentForAudit.id,
      title: "ویرایش دریافت",
      message: buildAuditMessage({
        entityLabel: "دریافتی",
        recordLabel: updatedPaymentForAudit.contract?.contractNo ?? updatedPaymentForAudit.customer?.fullName,
        actionLabel: "ویرایش",
        userName,
      }),
      beforeData: beforePaymentForAudit,
      afterData: updatedPaymentForAudit,
      href: `/dashboard/payments/${updatedPaymentForAudit.id}`,
    });
  }

  await dispatchPaymentTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    paymentId: parsed.data.paymentId,
    actorName: getAuditActorName(membership.user),
    eventType: "PAYMENT_UPDATED",
  });

  revalidatePaymentPaths(linkedContractId ?? previousContractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/payments/${parsed.data.paymentId}?updated=1`);
}

export async function cancelPaymentAction(formData: FormData) {
  const membership = await requireTenantPermission("payments.delete");
  const parsed = paymentIdSchema.safeParse({ paymentId: formData.get("paymentId") });
  const rawReturnTo = typeof formData.get("returnTo") === "string"
    ? String(formData.get("returnTo"))
    : "/dashboard/payments";
  const returnTo = rawReturnTo.startsWith("/dashboard/")
    ? rawReturnTo
    : "/dashboard/payments";

  if (!parsed.success) {
    redirect(`${returnTo}?paymentError=invalid`);
  }

  const db = await getPrisma();
  let contractId: string | null = null;
  let canceledPaymentForAudit: unknown = null;
  let beforeCanceledPaymentForAudit: unknown = null;

  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: parsed.data.paymentId, tenantId: membership.tenantId },
      include: {
        contract: { select: { id: true, contractNo: true } },
        customer: { select: { fullName: true, phone: true } },
        paymentMethod: { select: { title: true, type: true } },
      },
    });

    if (!payment) {
      return false;
    }

    contractId = payment.contractId;
    beforeCanceledPaymentForAudit = payment;

    canceledPaymentForAudit = await tx.payment.update({
      where: { id: payment.id },
      data: { status: "CANCELED" },
      include: {
        contract: { select: { id: true, contractNo: true } },
        customer: { select: { fullName: true, phone: true } },
        paymentMethod: { select: { title: true, type: true } },
      },
    });
    await syncContractFinancials(tx, membership.tenantId, payment.contractId);

    return true;
  });

  if (result) {
    const userName = getAuditActorName(membership.user);
    const payment = canceledPaymentForAudit as { id?: string; contract?: { contractNo?: string | null } | null } | null;
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "PAYMENT_CANCELED",
      entityType: "PAYMENT",
      entityId: payment?.id ?? parsed.data.paymentId,
      title: "لغو دریافت",
      message: buildAuditMessage({
        entityLabel: "دریافتی",
        recordLabel: payment?.contract?.contractNo ?? null,
        actionLabel: "لغو",
        userName,
      }),
      beforeData: beforeCanceledPaymentForAudit,
      afterData: canceledPaymentForAudit,
      href: `/dashboard/payments/${parsed.data.paymentId}`,
    });

    await dispatchPaymentTelegramNotificationSafely({
      db,
      tenantId: membership.tenantId,
      tenant: membership.tenant,
      paymentId: parsed.data.paymentId,
      actorName: getAuditActorName(membership.user),
      eventType: "PAYMENT_CANCELED",
    });
  }

  revalidatePaymentPaths(contractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}${result ? "canceled=1" : "paymentError=not-found"}`);
}
