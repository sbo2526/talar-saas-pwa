"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toLatinDigits } from "@/lib/date/jalali";
import { getMonthlyCloseLockForEventDate, getMonthlyCloseRedirectSuffix, recordMonthlyCloseBlockedAttempt } from "@/lib/monthly-close/monthly-close-lock";
import { getPrisma } from "@/lib/prisma";

const lockedInvoiceStatuses = ["SETTLED", "CANCELED"] as const;

function readString(formData: FormData, key: string, max = 900) {
  const value = formData.get(key);
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, max);
}

function readPositiveInt(formData: FormData, key: string, fallback = 1) {
  const raw = toLatinDigits(readString(formData, key)).replace(/[,،\s]/g, "");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.floor(parsed));
}

function readMoney(formData: FormData, key: string) {
  const raw = toLatinDigits(readString(formData, key)).replace(/[,،\s]/g, "");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
  return Math.round(parsed);
}

function asMoney(value: number) {
  return Math.max(0, Math.round(value)).toFixed(2);
}

function asSignedMoney(value: number) {
  return Math.round(value).toFixed(2);
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function createInvoiceAdjustmentRequestAction(formData: FormData) {
  const membership = await requireTenantPermission("invoices.adjust");
  const db = await getPrisma();
  const invoiceId = readString(formData, "invoiceId", 80);

  if (!invoiceId) {
    redirect("/dashboard/invoices?adjustment=invalid");
  }

  const title = readString(formData, "title", 180);
  const reason = readString(formData, "reason", 1200);
  const description = readString(formData, "description", 900) || null;
  const adjustmentMode = readString(formData, "adjustmentMode", 40) === "SET_FINAL_TOTAL" ? "SET_FINAL_TOTAL" : "ADD_LINE";

  if (!title || !reason) {
    redirect(`/dashboard/invoices/${invoiceId}/adjustments?error=invalid-input`);
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId: membership.tenantId },
    select: {
      id: true,
      invoiceNo: true,
      status: true,
      contractId: true,
      subtotal: true,
      payableAmount: true,
      paidAmountAtIssue: true,
      contract: { select: { contractNo: true, eventDate: true, customer: { select: { fullName: true } } } },
    },
  });

  if (!invoice) {
    redirect("/dashboard/invoices?adjustment=not-found");
  }

  if (lockedInvoiceStatuses.includes(invoice.status as (typeof lockedInvoiceStatuses)[number])) {
    redirect(`/dashboard/invoices/${invoice.id}/adjustments?error=locked-invoice`);
  }

  let unitLabel = readString(formData, "unitLabel", 40) || "مورد";
  let quantity = readPositiveInt(formData, "quantity", 1);
  let unitPrice = readMoney(formData, "unitPrice");
  let totalPrice = Number.isFinite(unitPrice) ? quantity * unitPrice : Number.NaN;
  let requestedFinalSubtotal: number | null = null;

  if (adjustmentMode === "SET_FINAL_TOTAL") {
    requestedFinalSubtotal = readMoney(formData, "finalSubtotal");
    const beforeSubtotal = toNumber(invoice.subtotal);
    quantity = 1;
    unitLabel = "اصلاح";
    totalPrice = Number.isFinite(requestedFinalSubtotal) ? requestedFinalSubtotal - beforeSubtotal : Number.NaN;
    unitPrice = totalPrice;
  }

  if (!Number.isFinite(unitPrice) || !Number.isFinite(totalPrice) || totalPrice === 0) {
    redirect(`/dashboard/invoices/${invoice.id}/adjustments?error=invalid-input`);
  }

  const closeLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: invoice.contract.eventDate,
  });

  if (closeLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: membership.tenantId,
      userId: membership.userId,
      lock: closeLock,
      action: "MONTHLY_CLOSE_BLOCKED_INVOICE_ADJUSTMENT_REQUEST",
      entityType: "INVOICE_ADJUSTMENT_REQUEST",
      entityId: invoice.id,
      title: "جلوگیری از ثبت درخواست اصلاح فاکتور در ماه بسته‌شده",
      message: `ثبت درخواست اصلاح برای صورتحساب ${invoice.invoiceNo} متوقف شد، چون دوره ${closeLock.periodLabel} قفل شده است.`,
      href: `/dashboard/invoices/${invoice.id}/adjustments`,
      metadata: { sourceAction: "createInvoiceAdjustmentRequestAction" },
    });
    redirect(`/dashboard/invoices/${invoice.id}/adjustments?error=monthly-locked&${getMonthlyCloseRedirectSuffix(closeLock)}`);
  }

  const request = await db.$transaction(async (tx) => {
    const created = await tx.invoiceAdjustmentRequest.create({
      data: {
        tenantId: membership.tenantId,
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        requestedByUserId: membership.userId,
        status: "PENDING",
        title,
        description,
        reason,
        quantity,
        unitLabel,
        unitPrice: adjustmentMode === "SET_FINAL_TOTAL" ? asSignedMoney(unitPrice) : asMoney(unitPrice),
        minUnitPrice: asMoney(0),
        totalPrice: adjustmentMode === "SET_FINAL_TOTAL" ? asSignedMoney(totalPrice) : asMoney(totalPrice),
        beforeSubtotal: invoice.subtotal,
        beforePayable: invoice.payableAmount,
      },
      select: { id: true },
    });

    const ownerMembers = await tx.tenantMember.findMany({
      where: { tenantId: membership.tenantId, role: "OWNER" },
      select: { userId: true },
    });

    if (ownerMembers.length > 0) {
      await tx.inAppNotification.createMany({
        data: ownerMembers.map((member) => ({
          tenantId: membership.tenantId,
          userId: member.userId,
          type: "INVOICE_OWNER_ADJUSTMENT",
          severity: "WARNING",
          title: "درخواست اصلاح فاکتور نیازمند تأیید مالک",
          message: `درخواست اصلاح ${title} برای صورتحساب ${invoice.invoiceNo} ثبت شد.`,
          href: `/dashboard/invoices/${invoice.id}/adjustments`,
          entityType: "INVOICE_ADJUSTMENT_REQUEST",
          entityId: created.id,
          fingerprint: `invoice-adjustment-request-${created.id}-${member.userId}`,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "INVOICE_ADJUSTMENT_REQUEST_CREATED",
        entityType: "INVOICE_ADJUSTMENT_REQUEST",
        entityId: created.id,
        title: "ثبت درخواست اصلاح فاکتور",
        message: `درخواست اصلاح برای صورتحساب ${invoice.invoiceNo} ثبت شد و بدون تأیید مالک اعمال نمی‌شود.`,
        afterData: {
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          contractNo: invoice.contract.contractNo,
          customerName: invoice.contract.customer.fullName,
          title,
          reason,
          quantity,
          unitPrice,
          totalPrice,
          adjustmentMode,
          requestedFinalSubtotal,
          status: "PENDING",
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35",
          manualPriceCorrection: adjustmentMode === "SET_FINAL_TOTAL",
          ownerApprovalRequired: true,
          directInvoiceMutationByOperator: false,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${invoice.id}/adjustments`,
      },
    });

    return created;
  });

  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath(`/dashboard/invoices/${invoice.id}/adjustments`);
  revalidatePath("/dashboard/owner-financial-audit");
  redirect(`/dashboard/invoices/${invoice.id}/adjustments?created=${request.id}`);
}

export async function applyInvoiceAdjustmentRequestAction(formData: FormData) {
  const membership = await requireTenantPermission("invoices.owner_approval");
  const db = await getPrisma();
  const requestId = readString(formData, "requestId", 80);
  const ownerDecisionNote = readString(formData, "ownerDecisionNote", 1200) || null;

  if (!requestId) {
    redirect("/dashboard/invoices?adjustment=invalid");
  }

  const request = await db.invoiceAdjustmentRequest.findFirst({
    where: { id: requestId, tenantId: membership.tenantId },
    include: {
      invoice: {
        include: {
          contract: { select: { contractNo: true, eventDate: true, customer: { select: { fullName: true } } } },
        },
      },
      requestedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!request) {
    redirect("/dashboard/invoices?adjustment=not-found");
  }

  if (request.status !== "PENDING") {
    redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?error=not-pending`);
  }

  if (lockedInvoiceStatuses.includes(request.invoice.status as (typeof lockedInvoiceStatuses)[number])) {
    redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?error=locked-invoice`);
  }

  const closeLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: request.invoice.contract.eventDate,
  });

  if (closeLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: membership.tenantId,
      userId: membership.userId,
      lock: closeLock,
      action: "MONTHLY_CLOSE_BLOCKED_INVOICE_ADJUSTMENT_APPLY",
      entityType: "INVOICE_ADJUSTMENT_REQUEST",
      entityId: request.id,
      title: "جلوگیری از اعمال اصلاح فاکتور در ماه بسته‌شده",
      message: `اعمال اصلاح ${request.title} روی صورتحساب ${request.invoice.invoiceNo} متوقف شد، چون دوره ${closeLock.periodLabel} قفل شده است.`,
      href: `/dashboard/invoices/${request.invoiceId}/adjustments`,
      metadata: { sourceAction: "applyInvoiceAdjustmentRequestAction" },
    });
    redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?error=monthly-locked&${getMonthlyCloseRedirectSuffix(closeLock)}`);
  }

  const unitPrice = toNumber(request.unitPrice);
  const totalPrice = toNumber(request.totalPrice);
  const quantity = Math.max(1, request.quantity);

  if (totalPrice === 0) {
    redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?error=invalid-money`);
  }

  const applied = await db.$transaction(async (tx) => {
    const latestInvoice = await tx.invoice.findFirstOrThrow({
      where: { id: request.invoiceId, tenantId: membership.tenantId },
      select: { id: true, invoiceNo: true, subtotal: true, payableAmount: true, paidAmountAtIssue: true, contractId: true },
    });

    const sortOrder = await tx.invoiceLine.count({ where: { invoiceId: request.invoiceId } });
    const beforeSubtotal = toNumber(latestInvoice.subtotal);
    const beforePayable = toNumber(latestInvoice.payableAmount);
    const afterSubtotal = beforeSubtotal + totalPrice;
    const afterPayable = Math.max(0, afterSubtotal - toNumber(latestInvoice.paidAmountAtIssue));

    if (afterSubtotal < 0) {
      throw new Error("INVALID_NEGATIVE_INVOICE_TOTAL");
    }

    const line = await tx.invoiceLine.create({
      data: {
        tenantId: membership.tenantId,
        invoiceId: request.invoiceId,
        contractLineItemId: null,
        sourceType: "OWNER_ADJUSTMENT",
        name: request.title,
        description: request.description || request.reason,
        quantity,
        unitLabel: request.unitLabel || "مورد",
        unitPrice: asSignedMoney(unitPrice),
        minUnitPrice: asMoney(0),
        totalPrice: asSignedMoney(totalPrice),
        isLocked: true,
        sortOrder: 950 + sortOrder,
        metadata: {
          source: "owner_approved_invoice_adjustment",
          adjustmentRequestId: request.id,
          ownerApprovedByUserId: membership.userId,
          manualPriceCorrection: true,
          signedDelta: totalPrice,
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    await tx.invoice.update({
      where: { id: request.invoiceId },
      data: {
        subtotal: asMoney(afterSubtotal),
        payableAmount: asMoney(afterPayable),
        status: "ISSUED",
        sentAt: null,
        approvedByUserId: membership.userId,
        approvedAt: new Date(),
      },
    });

    await tx.invoiceAdjustmentRequest.update({
      where: { id: request.id },
      data: {
        status: "APPLIED",
        approvedByUserId: membership.userId,
        approvedAt: new Date(),
        appliedLineId: line.id,
        beforeSubtotal: asMoney(beforeSubtotal),
        beforePayable: asMoney(beforePayable),
        afterSubtotal: asMoney(afterSubtotal),
        afterPayable: asMoney(afterPayable),
        ownerDecisionNote,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "INVOICE_ADJUSTMENT_OWNER_APPLIED",
        entityType: "INVOICE_ADJUSTMENT_REQUEST",
        entityId: request.id,
        title: "اعمال اصلاح فاکتور توسط مالک",
        message: `اصلاح ${request.title} روی صورتحساب ${request.invoice.invoiceNo} اعمال شد.`,
        beforeData: {
          invoiceId: request.invoiceId,
          subtotal: beforeSubtotal,
          payableAmount: beforePayable,
          status: request.invoice.status,
        } satisfies Prisma.InputJsonValue,
        afterData: {
          invoiceId: request.invoiceId,
          appliedLineId: line.id,
          subtotal: afterSubtotal,
          payableAmount: afterPayable,
          status: "ISSUED",
          requestStatus: "APPLIED",
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35",
          ownerApprovalRequired: true,
          customerResendRequired: true,
          manualPriceCorrectionCanIncreaseOrDecrease: true,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${request.invoiceId}`,
      },
    });

    if (request.requestedByUserId !== membership.userId) {
      await tx.inAppNotification.create({
        data: {
          tenantId: membership.tenantId,
          userId: request.requestedByUserId,
          type: "INVOICE_OWNER_ADJUSTMENT",
          severity: "SUCCESS",
          title: "درخواست اصلاح فاکتور تأیید و اعمال شد",
          message: `درخواست ${request.title} برای صورتحساب ${request.invoice.invoiceNo} توسط مالک اعمال شد.`,
          href: `/dashboard/invoices/${request.invoiceId}`,
          entityType: "INVOICE_ADJUSTMENT_REQUEST",
          entityId: request.id,
          fingerprint: `invoice-adjustment-applied-${request.id}-${request.requestedByUserId}`,
        },
      });
    }

    return line;
  });

  revalidatePath(`/dashboard/invoices/${request.invoiceId}`);
  revalidatePath(`/dashboard/invoices/${request.invoiceId}/adjustments`);
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/owner-financial-audit");
  revalidatePath("/dashboard/owner-settlements");
  redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?applied=${applied.id}`);
}

export async function rejectInvoiceAdjustmentRequestAction(formData: FormData) {
  const membership = await requireTenantPermission("invoices.owner_approval");
  const db = await getPrisma();
  const requestId = readString(formData, "requestId", 80);
  const ownerDecisionNote = readString(formData, "ownerDecisionNote", 1200);

  if (!requestId) {
    redirect("/dashboard/invoices?adjustment=invalid");
  }

  const request = await db.invoiceAdjustmentRequest.findFirst({
    where: { id: requestId, tenantId: membership.tenantId },
    include: { invoice: { select: { id: true, invoiceNo: true } } },
  });

  if (!request) {
    redirect("/dashboard/invoices?adjustment=not-found");
  }

  if (request.status !== "PENDING") {
    redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?error=not-pending`);
  }

  await db.$transaction(async (tx) => {
    await tx.invoiceAdjustmentRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        rejectedByUserId: membership.userId,
        rejectedAt: new Date(),
        ownerDecisionNote: ownerDecisionNote || "رد شده توسط مالک",
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "INVOICE_ADJUSTMENT_OWNER_REJECTED",
        entityType: "INVOICE_ADJUSTMENT_REQUEST",
        entityId: request.id,
        title: "رد درخواست اصلاح فاکتور توسط مالک",
        message: `درخواست اصلاح ${request.title} برای صورتحساب ${request.invoice.invoiceNo} رد شد.`,
        afterData: {
          invoiceId: request.invoiceId,
          invoiceNo: request.invoice.invoiceNo,
          requestStatus: "REJECTED",
          ownerDecisionNote: ownerDecisionNote || null,
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_INVOICE_ADJUSTMENT_AND_OWNER_APPROVAL_35",
          directInvoiceMutationByOperator: false,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${request.invoiceId}/adjustments`,
      },
    });
  });

  revalidatePath(`/dashboard/invoices/${request.invoiceId}`);
  revalidatePath(`/dashboard/invoices/${request.invoiceId}/adjustments`);
  redirect(`/dashboard/invoices/${request.invoiceId}/adjustments?rejected=${request.id}`);
}
