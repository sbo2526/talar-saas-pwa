"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantRole } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { parseIsoDateOnly } from "@/lib/date/jalali";
import {
  calculateOwnerSettlementTotals,
  getAgreementPercentSnapshots,
  getPaymentAwareStatus,
  parsePositivePaymentAmount,
  parseSettlementYearMonth,
  toNumber,
} from "@/lib/owner-settlements/rules";

function text(value: FormDataEntryValue | null) {
  const result = String(value ?? "").trim();
  return result.length > 0 ? result : null;
}

async function audit(input: {
  tenantId: string;
  userId: string;
  action: string;
  entityId?: string | null;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  href?: string;
}) {
  const db = await getPrisma();
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      action: input.action,
      entityType: "OWNER_MONTHLY_SETTLEMENT",
      entityId: input.entityId ?? null,
      title: input.title,
      message: input.message,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonObject) : undefined,
      href: input.href ?? null,
    },
  });
}

async function getLockedSourceIds(tenantId: string) {
  const db = await getPrisma();
  const lockedEntries = await db.ownerMonthlySettlementEntry.findMany({
    where: {
      tenantId,
      settlement: { status: "LOCKED" },
    },
    select: { invoiceId: true, offInvoiceReportId: true, contractId: true, entryType: true },
  });

  return {
    invoiceIds: new Set(lockedEntries.map((entry) => entry.invoiceId).filter(Boolean) as string[]),
    offInvoiceReportIds: new Set(lockedEntries.map((entry) => entry.offInvoiceReportId).filter(Boolean) as string[]),
    cancellationContractIds: new Set(
      lockedEntries
        .filter((entry) => entry.entryType === "CANCELLATION")
        .map((entry) => entry.contractId)
        .filter(Boolean) as string[],
    ),
  };
}

export async function calculateOwnerMonthlySettlementAction(formData: FormData) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const operationAgreementId = text(formData.get("operationAgreementId"));
  const period = parseSettlementYearMonth(formData.get("settlementYear"), formData.get("settlementMonth"));

  if (!operationAgreementId || !period) {
    redirect("/dashboard/owner-settlements/new?error=invalid-period");
  }

  const agreement = await db.hallOperationAgreement.findFirst({
    where: {
      id: operationAgreementId,
      tenantId: membership.tenantId,
      status: "ACTIVE",
      effectiveFrom: { lt: period.settlementPeriodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: period.settlementPeriodStart } }],
    },
    include: { hall: { select: { name: true } } },
  });

  if (!agreement) {
    redirect("/dashboard/owner-settlements/new?error=no-agreement");
  }

  const existing = await db.ownerMonthlySettlement.findUnique({
    where: {
      tenantId_operationAgreementId_settlementYear_settlementMonth: {
        tenantId: membership.tenantId,
        operationAgreementId: agreement.id,
        settlementYear: period.year,
        settlementMonth: period.month,
      },
    },
  });

  if (existing?.status === "LOCKED") {
    redirect(`/dashboard/owner-settlements/${existing.id}?error=locked`);
  }

  const lockedSourceIds = await getLockedSourceIds(membership.tenantId);
  const hallScope = agreement.hallId ? { hallId: agreement.hallId } : {};
  const eventSharePercent = toNumber(agreement.ownerEventSharePercent);
  const cancellationSharePercent = toNumber(agreement.ownerCancellationSharePercent);
  const extraServiceSharePercent = toNumber(agreement.ownerExtraServiceSharePercent);

  const invoices = await db.postEventInvoice.findMany({
    where: {
      tenantId: membership.tenantId,
      status: "ISSUED",
      ...hallScope,
      contract: {
        eventDate: { gte: period.settlementPeriodStart, lt: period.settlementPeriodEnd },
      },
    },
    include: {
      contract: { include: { customer: { select: { fullName: true } } } },
    },
    orderBy: { issuedAt: "asc" },
  });

  const eligibleInvoices = invoices.filter((invoice) => !lockedSourceIds.invoiceIds.has(invoice.id));
  const eventInvoiceBaseAmount = eligibleInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.contractFinalAmountSnapshot) + toNumber(invoice.extraGuestAmount),
    0,
  );
  const extraServiceBaseAmount = eligibleInvoices.reduce(
    (sum, invoice) => sum + toNumber(invoice.extraServiceAmount),
    0,
  );

  const cancellationDecisions = await db.postEventDecision.findMany({
    where: {
      tenantId: membership.tenantId,
      decisionStatus: "NOT_HELD_CANCELLATION",
      ...hallScope,
      contract: {
        eventDate: { gte: period.settlementPeriodStart, lt: period.settlementPeriodEnd },
      },
    },
    include: { contract: { include: { customer: { select: { fullName: true } } } } },
    orderBy: { decidedAt: "asc" },
  });

  const eligibleCancellations = cancellationDecisions.filter(
    (decision) => !lockedSourceIds.cancellationContractIds.has(decision.contractId),
  );

  const offInvoiceReports = await db.postEventInvoiceOffInvoiceReport.findMany({
    where: {
      tenantId: membership.tenantId,
      ownerReviewStatus: "CONFIRMED_OFF_INVOICE",
      invoice: {
        status: "ISSUED",
        ...hallScope,
        contract: {
          eventDate: { gte: period.settlementPeriodStart, lt: period.settlementPeriodEnd },
        },
      },
    },
    include: {
      invoice: { select: { invoiceNumber: true } },
      contract: { include: { customer: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const includeApprovedOffInvoice =
    agreement.offInvoiceIncomePolicy === "INCLUDE_WITH_EVENT_PERCENT_AFTER_OWNER_APPROVAL";
  const reviewOnlyOffInvoice =
    agreement.offInvoiceIncomePolicy === "INCLUDE_WITH_CUSTOM_PERCENT_AFTER_OWNER_APPROVAL";
  const eligibleOffInvoiceReports = offInvoiceReports.filter(
    (report) => !lockedSourceIds.offInvoiceReportIds.has(report.id),
  );
  const approvedOffInvoiceBaseAmount = includeApprovedOffInvoice
    ? eligibleOffInvoiceReports.reduce((sum, report) => sum + toNumber(report.amount), 0)
    : 0;

  const totals = calculateOwnerSettlementTotals({
    operationModel: agreement.operationModel,
    sourceTotals: {
      eventInvoiceBaseAmount,
      cancellationBaseAmount: 0,
      extraServiceBaseAmount,
      approvedOffInvoiceBaseAmount,
    },
    snapshots: getAgreementPercentSnapshots(agreement),
    paidToOwnerAmount: existing ? toNumber(existing.paidToOwnerAmount) : 0,
  });
  const status = getPaymentAwareStatus({
    currentStatus: existing?.status,
    finalPayableToOwnerAmount: totals.finalPayableToOwnerAmount,
    paidToOwnerAmount: totals.paidToOwnerAmount,
  });

  const settlement = existing
    ? await db.ownerMonthlySettlement.update({
        where: { id: existing.id },
        data: {
          hallId: agreement.hallId,
          settlementPeriodStart: period.settlementPeriodStart,
          settlementPeriodEnd: period.settlementPeriodEnd,
          status,
          operationModelSnapshot: agreement.operationModel,
          ownerNameSnapshot: agreement.ownerName,
          operatorNameSnapshot: agreement.operatorName,
          ownerEventSharePercentSnapshot: agreement.ownerEventSharePercent,
          ownerCancellationSharePercentSnapshot: agreement.ownerCancellationSharePercent,
          ownerExtraServiceSharePercentSnapshot: agreement.ownerExtraServiceSharePercent,
          monthlyMinimumGuaranteeAmountSnapshot: agreement.monthlyMinimumGuaranteeAmount,
          monthlyFixedRentAmountSnapshot: agreement.monthlyFixedRentAmount,
          eventInvoiceBaseAmount,
          eventInvoiceOwnerShareAmount: totals.eventInvoiceOwnerShareAmount,
          cancellationBaseAmount: 0,
          cancellationOwnerShareAmount: totals.cancellationOwnerShareAmount,
          extraServiceBaseAmount,
          extraServiceOwnerShareAmount: totals.extraServiceOwnerShareAmount,
          approvedOffInvoiceBaseAmount,
          approvedOffInvoiceOwnerShareAmount: totals.approvedOffInvoiceOwnerShareAmount,
          calculatedOwnerShareAmount: totals.calculatedOwnerShareAmount,
          guaranteeShortfallAmount: totals.guaranteeShortfallAmount,
          fixedRentAmount: totals.fixedRentAmount,
          finalPayableToOwnerAmount: totals.finalPayableToOwnerAmount,
          paidToOwnerAmount: totals.paidToOwnerAmount,
          remainingPayableAmount: totals.remainingPayableAmount,
          calculatedAt: new Date(),
          calculatedByUserId: membership.userId,
          notes: text(formData.get("notes")),
        },
      })
    : await db.ownerMonthlySettlement.create({
        data: {
          tenantId: membership.tenantId,
          hallId: agreement.hallId,
          operationAgreementId: agreement.id,
          settlementYear: period.year,
          settlementMonth: period.month,
          settlementPeriodStart: period.settlementPeriodStart,
          settlementPeriodEnd: period.settlementPeriodEnd,
          status,
          operationModelSnapshot: agreement.operationModel,
          ownerNameSnapshot: agreement.ownerName,
          operatorNameSnapshot: agreement.operatorName,
          ownerEventSharePercentSnapshot: agreement.ownerEventSharePercent,
          ownerCancellationSharePercentSnapshot: agreement.ownerCancellationSharePercent,
          ownerExtraServiceSharePercentSnapshot: agreement.ownerExtraServiceSharePercent,
          monthlyMinimumGuaranteeAmountSnapshot: agreement.monthlyMinimumGuaranteeAmount,
          monthlyFixedRentAmountSnapshot: agreement.monthlyFixedRentAmount,
          eventInvoiceBaseAmount,
          eventInvoiceOwnerShareAmount: totals.eventInvoiceOwnerShareAmount,
          cancellationBaseAmount: 0,
          cancellationOwnerShareAmount: totals.cancellationOwnerShareAmount,
          extraServiceBaseAmount,
          extraServiceOwnerShareAmount: totals.extraServiceOwnerShareAmount,
          approvedOffInvoiceBaseAmount,
          approvedOffInvoiceOwnerShareAmount: totals.approvedOffInvoiceOwnerShareAmount,
          calculatedOwnerShareAmount: totals.calculatedOwnerShareAmount,
          guaranteeShortfallAmount: totals.guaranteeShortfallAmount,
          fixedRentAmount: totals.fixedRentAmount,
          finalPayableToOwnerAmount: totals.finalPayableToOwnerAmount,
          paidToOwnerAmount: totals.paidToOwnerAmount,
          remainingPayableAmount: totals.remainingPayableAmount,
          calculatedAt: new Date(),
          calculatedByUserId: membership.userId,
          notes: text(formData.get("notes")),
        },
      });

  if (existing) {
    await db.ownerMonthlySettlementEntry.deleteMany({ where: { settlementId: settlement.id } });
  }

  const entryData = [];

  for (const invoice of eligibleInvoices) {
    const baseAmount = toNumber(invoice.contractFinalAmountSnapshot) + toNumber(invoice.extraGuestAmount);
    entryData.push({
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      contractId: invoice.contractId,
      invoiceId: invoice.id,
      entryType: "EVENT_INVOICE" as const,
      sourceDate: invoice.contract.eventDate,
      sourceTitle: `ØµÙˆØ±ØªØ­Ø³Ø§Ø¨ ${invoice.invoiceNumber} - ${invoice.contract.customer.fullName}`,
      baseAmount,
      ownerSharePercent: eventSharePercent,
      ownerShareAmount: Math.round((baseAmount * eventSharePercent) / 100),
      includedInSettlement: agreement.operationModel !== "OWNER_DIRECT" && agreement.operationModel !== "FIXED_RENT",
      reviewStatus: agreement.operationModel === "OWNER_DIRECT" || agreement.operationModel === "FIXED_RENT" ? "INFORMATIONAL" as const : "INCLUDED" as const,
      notes: "Ù…Ø¨Ù†Ø§ÛŒ Ø¯ÙˆØ±Ù‡ Ø¨Ø±Ø§ÛŒ Ø¯Ø±Ø¢Ù…Ø¯ Ù…Ø±Ø§Ø³Ù…ØŒ ØªØ§Ø±ÛŒØ® Ù…Ø±Ø§Ø³Ù… Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ Ø§Ø³Øª.",
    });

    if (toNumber(invoice.extraServiceAmount) > 0) {
      const extraBase = toNumber(invoice.extraServiceAmount);
      const includeExtra = agreement.includeExtraServicesInOwnerShare && agreement.operationModel !== "OWNER_DIRECT" && agreement.operationModel !== "FIXED_RENT";
      entryData.push({
        tenantId: membership.tenantId,
        settlementId: settlement.id,
        contractId: invoice.contractId,
        invoiceId: invoice.id,
        entryType: "EXTRA_SERVICE" as const,
        sourceDate: invoice.contract.eventDate,
        sourceTitle: `Ø®Ø¯Ù…Ø§Øª Ø§Ø¶Ø§ÙÙ‡ ØµÙˆØ±ØªØ­Ø³Ø§Ø¨ ${invoice.invoiceNumber}`,
        baseAmount: extraBase,
        ownerSharePercent: includeExtra ? extraServiceSharePercent : null,
        ownerShareAmount: includeExtra ? Math.round((extraBase * extraServiceSharePercent) / 100) : 0,
        includedInSettlement: includeExtra,
        reviewStatus: includeExtra ? "INCLUDED" as const : "EXCLUDED" as const,
        notes: includeExtra ? "Ø®Ø¯Ù…Ø§Øª Ø§Ø¶Ø§ÙÙ‡ Ø·Ø¨Ù‚ ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ù…Ø¯Ù„ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ Ù„Ø­Ø§Ø¸ Ø´Ø¯." : "Ø®Ø¯Ù…Ø§Øª Ø§Ø¶Ø§ÙÙ‡ Ø¯Ø± ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø³Ù‡Ù… Ù…Ø§Ù„Ú© ÙØ¹Ø§Ù„ Ù†ÛŒØ³Øª.",
      });
    }
  }

  for (const decision of eligibleCancellations) {
    entryData.push({
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      contractId: decision.contractId,
      cancellationReferenceId: decision.cancellationReferenceId,
      entryType: "CANCELLATION" as const,
      sourceDate: decision.contract.eventDate,
      sourceTitle: `Ú©Ù†Ø³Ù„ÛŒ Ù‚Ø±Ø§Ø±Ø¯Ø§Ø¯ ${decision.contract.contractNo} - ${decision.contract.customer.fullName}`,
      baseAmount: 0,
      ownerSharePercent: cancellationSharePercent,
      ownerShareAmount: 0,
      includedInSettlement: false,
      reviewStatus: "REVIEW_REQUIRED" as const,
      notes: "Ù…Ø¨Ù„Øº Ù‚Ø·Ø¹ÛŒ Ú©Ù†Ø³Ù„ÛŒ Ø¯Ø± Ù…Ø¯Ù„ ÙØ¹Ù„ÛŒ Ù‚Ø§Ø¨Ù„ Ø§ØªÚ©Ø§ Ù†ÛŒØ³ØªØ› ÙÙ‚Ø· Ø¨Ø±Ø§ÛŒ Ø¨Ø§Ø²Ø¨ÛŒÙ†ÛŒ Ù…Ø¯ÛŒØ±ÛŒØªÛŒ Ø«Ø¨Øª Ø´Ø¯.",
    });
  }

  for (const report of eligibleOffInvoiceReports) {
    const baseAmount = toNumber(report.amount);
    entryData.push({
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      contractId: report.contractId,
      invoiceId: report.invoiceId,
      offInvoiceReportId: report.id,
      entryType: "APPROVED_OFF_INVOICE" as const,
      sourceDate: report.paymentDate ?? report.createdAt,
      sourceTitle: `Ú¯Ø²Ø§Ø±Ø´ Ø®Ø§Ø±Ø¬ Ø§Ø² ÙØ§Ú©ØªÙˆØ± - ${report.serviceTitle}`,
      baseAmount,
      ownerSharePercent: includeApprovedOffInvoice ? eventSharePercent : null,
      ownerShareAmount: includeApprovedOffInvoice ? Math.round((baseAmount * eventSharePercent) / 100) : 0,
      includedInSettlement: includeApprovedOffInvoice,
      reviewStatus: includeApprovedOffInvoice ? "INCLUDED" as const : "REVIEW_REQUIRED" as const,
      notes: reviewOnlyOffInvoice
        ? "Ø³ÛŒØ§Ø³Øª Ø¯Ø±Ø¢Ù…Ø¯ Ø®Ø§Ø±Ø¬ Ø§Ø² ÙØ§Ú©ØªÙˆØ± Ø¯Ø±ØµØ¯ Ø§Ø®ØªØµØ§ØµÛŒ Ù…ÛŒâ€ŒØ®ÙˆØ§Ù‡Ø¯ØŒ Ø§Ù…Ø§ Ø¯Ø±ØµØ¯ Ø§Ø®ØªØµØ§ØµÛŒ Ø¯Ø± Phase 28 Ø°Ø®ÛŒØ±Ù‡ Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª."
        : includeApprovedOffInvoice
          ? "Ú¯Ø²Ø§Ø±Ø´ ØªØ£ÛŒÛŒØ¯Ø´Ø¯Ù‡ Ù…Ø§Ù„Ú© Ø·Ø¨Ù‚ Ø³ÛŒØ§Ø³Øª Ø¯Ø±Ø¢Ù…Ø¯ Ø®Ø§Ø±Ø¬ Ø§Ø² ÙØ§Ú©ØªÙˆØ± Ù„Ø­Ø§Ø¸ Ø´Ø¯."
          : "Ø³ÛŒØ§Ø³Øª ÙØ¹Ù„ÛŒ ÙÙ‚Ø· Ú¯Ø²Ø§Ø±Ø´ Ù…Ø¯ÛŒØ±ÛŒØªÛŒ Ø§Ø³Øª Ùˆ Ø¯Ø± ØªØ³ÙˆÛŒÙ‡ Ø§Ø«Ø± Ù†Ø¯Ø§Ø±Ø¯.",
    });
  }

  if (totals.fixedRentAmount > 0) {
    entryData.push({
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      entryType: "FIXED_RENT" as const,
      sourceDate: period.settlementPeriodStart,
      sourceTitle: "Ø§Ø¬Ø§Ø±Ù‡ Ø«Ø§Ø¨Øª Ù…Ø§Ù‡Ø§Ù†Ù‡",
      baseAmount: totals.fixedRentAmount,
      ownerSharePercent: null,
      ownerShareAmount: totals.fixedRentAmount,
      includedInSettlement: true,
      reviewStatus: "INCLUDED" as const,
      notes: "Ø§Ø¬Ø§Ø±Ù‡ Ø«Ø§Ø¨Øª Ù…Ø§Ù‡Ø§Ù†Ù‡ Ø§Ø² ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ù…Ø¯Ù„ Ø¨Ù‡Ø±Ù‡â€ŒØ¨Ø±Ø¯Ø§Ø±ÛŒ snapshot Ø´Ø¯.",
    });
  }

  if (totals.guaranteeShortfallAmount > 0) {
    entryData.push({
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      entryType: "GUARANTEE_SHORTFALL" as const,
      sourceDate: period.settlementPeriodStart,
      sourceTitle: "Ú©Ø³Ø±ÛŒ Ø­Ø¯Ø§Ù‚Ù„ ØªØ¶Ù…ÛŒÙ† Ù…Ø§Ù‡Ø§Ù†Ù‡",
      baseAmount: totals.guaranteeShortfallAmount,
      ownerSharePercent: null,
      ownerShareAmount: totals.guaranteeShortfallAmount,
      includedInSettlement: true,
      reviewStatus: "INCLUDED" as const,
      notes: "Ø¨Ø±Ø§ÛŒ Ø±Ø³Ø§Ù†Ø¯Ù† Ø³Ù‡Ù… Ù…Ø§Ù„Ú© Ø¨Ù‡ Ø­Ø¯Ø§Ù‚Ù„ ØªØ¶Ù…ÛŒÙ† Ù…Ø§Ù‡Ø§Ù†Ù‡ Ø«Ø¨Øª Ø´Ø¯.",
    });
  }

  if (entryData.length > 0) {
    await db.ownerMonthlySettlementEntry.createMany({ data: entryData });
  }

  await audit({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "OWNER_MONTHLY_SETTLEMENT_CALCULATED",
    entityId: settlement.id,
    title: "ØªØ³ÙˆÛŒÙ‡ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù…Ø§Ù„Ú© Ù…Ø­Ø§Ø³Ø¨Ù‡ Ø´Ø¯",
    message: `ØªØ³ÙˆÛŒÙ‡ Ù…Ø§Ù‡ ${period.year}/${period.month} Ø¨Ø±Ø§ÛŒ Ù…Ø§Ù„Ú© Ù…Ø­Ø§Ø³Ø¨Ù‡ Ø´Ø¯.`,
    metadata: {
      operationAgreementId: agreement.id,
      eventInvoiceCount: eligibleInvoices.length,
      cancellationCount: eligibleCancellations.length,
      offInvoiceReportCount: eligibleOffInvoiceReports.length,
      finalPayableToOwnerAmount: totals.finalPayableToOwnerAmount,
    },
    href: `/dashboard/owner-settlements/${settlement.id}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/owner-settlements");
  redirect(`/dashboard/owner-settlements/${settlement.id}`);
}

export async function registerOwnerSettlementPaymentAction(formData: FormData) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const settlementId = text(formData.get("settlementId"));
  const paidAmount = parsePositivePaymentAmount(formData.get("paidAmount"));
  const paymentDate = parseIsoDateOnly(text(formData.get("paymentDate")));
  const paymentMethod = text(formData.get("paymentMethod"));

  if (!settlementId || !paidAmount || !paymentDate || !paymentMethod) {
    redirect("/dashboard/owner-settlements?error=invalid-payment");
  }

  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id: settlementId, tenantId: membership.tenantId },
    include: { payments: true },
  });

  if (!settlement || settlement.status === "LOCKED" || settlement.status === "CANCELLED") {
    redirect(`/dashboard/owner-settlements/${settlementId}?error=payment-blocked`);
  }

  await db.ownerSettlementPayment.create({
    data: {
      tenantId: membership.tenantId,
      settlementId: settlement.id,
      paidAmount,
      paymentDate,
      paymentMethod,
      referenceNumber: text(formData.get("referenceNumber")),
      receiptFileUrl: null,
      note: text(formData.get("note")),
      createdByUserId: membership.userId,
    },
  });

  const payments = await db.ownerSettlementPayment.findMany({ where: { settlementId: settlement.id } });
  const paidToOwnerAmount = payments.reduce((sum, payment) => sum + toNumber(payment.paidAmount), 0);
  const finalPayableToOwnerAmount = toNumber(settlement.finalPayableToOwnerAmount);
  const status = getPaymentAwareStatus({
    currentStatus: settlement.status,
    finalPayableToOwnerAmount,
    paidToOwnerAmount,
  });

  await db.ownerMonthlySettlement.update({
    where: { id: settlement.id },
    data: {
      paidToOwnerAmount,
      remainingPayableAmount: finalPayableToOwnerAmount - paidToOwnerAmount,
      status,
    },
  });

  await audit({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "OWNER_SETTLEMENT_PAYMENT_REGISTERED",
    entityId: settlement.id,
    title: "Ù¾Ø±Ø¯Ø§Ø®Øª ØªØ³ÙˆÛŒÙ‡ Ù…Ø§Ù„Ú© Ø«Ø¨Øª Ø´Ø¯",
    message: "Ù¾Ø±Ø¯Ø§Ø®Øª Ù…Ø±Ø¨ÙˆØ· Ø¨Ù‡ ØªØ³ÙˆÛŒÙ‡ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù…Ø§Ù„Ú© Ø«Ø¨Øª Ø´Ø¯.",
    metadata: { paidAmount, paymentDate: paymentDate.toISOString(), paymentMethod },
    href: `/dashboard/owner-settlements/${settlement.id}`,
  });

  revalidatePath(`/dashboard/owner-settlements/${settlement.id}`);
  redirect(`/dashboard/owner-settlements/${settlement.id}`);
}

export async function lockOwnerSettlementAction(formData: FormData) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const settlementId = text(formData.get("settlementId"));

  if (!settlementId) {
    redirect("/dashboard/owner-settlements?error=missing-settlement");
  }

  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id: settlementId, tenantId: membership.tenantId },
  });

  if (!settlement || settlement.status === "LOCKED" || settlement.status === "CANCELLED") {
    redirect(`/dashboard/owner-settlements/${settlementId}?error=lock-blocked`);
  }

  await db.ownerMonthlySettlement.update({
    where: { id: settlement.id },
    data: { status: "LOCKED", lockedAt: new Date(), lockedByUserId: membership.userId },
  });

  await audit({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "OWNER_MONTHLY_SETTLEMENT_LOCKED",
    entityId: settlement.id,
    title: "ØªØ³ÙˆÛŒÙ‡ Ù…Ø§Ù‡Ø§Ù†Ù‡ Ù…Ø§Ù„Ú© Ù‚ÙÙ„ Ø´Ø¯",
    message: "ØªØ³ÙˆÛŒÙ‡ Ø§ÛŒÙ† Ù…Ø§Ù‡ Ù‚ÙÙ„ Ø´Ø¯ Ùˆ ØªØºÛŒÛŒØ±Ø§Øª Ø¨Ø¹Ø¯ÛŒ Ø¨Ø§ÛŒØ¯ Ø¯Ø± Ù…Ø±Ø§Ø­Ù„ Ø¨Ø¹Ø¯ÛŒ Ø¨Ø§ Ø³Ù†Ø¯ Ø§ØµÙ„Ø§Ø­ÛŒ Ø§Ù†Ø¬Ø§Ù… Ø´ÙˆØ¯.",
    href: `/dashboard/owner-settlements/${settlement.id}`,
  });

  revalidatePath(`/dashboard/owner-settlements/${settlement.id}`);
  redirect(`/dashboard/owner-settlements/${settlement.id}`);
}


