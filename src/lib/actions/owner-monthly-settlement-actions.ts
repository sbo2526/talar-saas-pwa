"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toLatinDigits } from "@/lib/date/jalali";
import { calculateOwnerMonthlySettlementPreview, normalizeOwnerSettlementPeriod } from "@/lib/owner-settlements/owner-monthly-settlement";
import { getPrisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readPeriod(formData: FormData) {
  return normalizeOwnerSettlementPeriod({
    year: toLatinDigits(readString(formData, "periodYear")),
    month: toLatinDigits(readString(formData, "periodMonth")),
  });
}

function readId(formData: FormData) {
  return readString(formData, "settlementId");
}

function settlementPath(year: number, month: number, flag?: string) {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  if (flag) query.set(flag, "1");
  return `/dashboard/owner-settlements?${query.toString()}`;
}

export async function generateOwnerMonthlySettlementAction(formData: FormData) {
  const membership = await requireTenantPermission("owner.settlement.manage");
  const db = await getPrisma();
  const period = readPeriod(formData);
  const preview = await calculateOwnerMonthlySettlementPreview({
    tenantId: membership.tenantId,
    year: period.year,
    month: period.month,
  });

  if (!preview.ready || !preview.settlement) {
    redirect(`${settlementPath(period.year, period.month)}&error=setting-required`);
  }

  const existing = preview.existingSettlement;
  if (existing && existing.status !== "DRAFT") {
    await db.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "MONTHLY_CLOSE_BLOCKED_OWNER_SETTLEMENT_REGENERATION",
        entityType: "OWNER_MONTHLY_SETTLEMENT",
        entityId: existing.id,
        title: "انسداد بازسازی تسویه ماه بسته",
        message: `ماه مالی ${preview.period.label} قبلاً بسته شده و بازسازی گزارش تسویه مالک مجاز نیست.`,
        afterData: {
          settlementId: existing.id,
          status: existing.status,
          periodYear: period.year,
          periodMonth: period.month,
          periodLabel: preview.period.label,
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_MONTHLY_CLOSE_LOCK_39",
          monthlyCloseLock: true,
          blockedMutation: true,
          blockedOperation: "owner_settlement_regeneration",
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/owner-settlements/${existing.id}`,
      },
    });
    redirect(`${settlementPath(period.year, period.month)}&error=locked`);
  }

  const settlementData = {
    periodLabel: preview.period.label,
    periodStart: preview.period.startDate,
    periodEnd: preview.period.endDate,
    ownerOperationSettingId: preview.settlement.ownerOperationSettingId,
    operationModel: preview.settlement.operationModel,
    ownerRevenueSharePercent: preview.settlement.ownerRevenueSharePercent,
    ownerCancellationSharePercent: preview.settlement.ownerCancellationSharePercent,
    monthlyMinimumGuarantee: preview.settlement.monthlyMinimumGuarantee,
    settlementCycle: preview.settlement.settlementCycle,
    heldEventsCount: preview.settlement.heldEventsCount,
    canceledEventsCount: preview.settlement.canceledEventsCount,
    invoiceTotal: preview.settlement.invoiceTotal,
    extraServicesTotal: preview.settlement.extraServicesTotal,
    cancellationIncomeTotal: preview.settlement.cancellationIncomeTotal,
    ownerEventShare: preview.settlement.ownerEventShare,
    ownerCancellationShare: preview.settlement.ownerCancellationShare,
    calculatedOwnerShare: preview.settlement.calculatedOwnerShare,
    minimumGuaranteeApplied: preview.settlement.minimumGuaranteeApplied,
    minimumGuaranteeShortfall: preview.settlement.minimumGuaranteeShortfall,
    finalOwnerPayable: preview.settlement.finalOwnerPayable,
    generatedByUserId: membership.userId,
    generatedAt: new Date(),
    snapshot: preview.settlement.snapshot as Prisma.InputJsonValue,
    note: "گزارش تسویه ماهانه مالک از فاکتورهای برگزارشده، کنسلی‌ها و حداقل تضمین ساخته شد.",
  };

  const result = await db.$transaction(async (tx) => {
    const saved = existing
      ? await tx.ownerMonthlySettlement.update({
          where: { id: existing.id },
          data: settlementData,
        })
      : await tx.ownerMonthlySettlement.create({
          data: {
            tenantId: membership.tenantId,
            periodYear: period.year,
            periodMonth: period.month,
            ...settlementData,
          },
        });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "OWNER_MONTHLY_SETTLEMENT_GENERATED",
        entityType: "OWNER_MONTHLY_SETTLEMENT",
        entityId: saved.id,
        title: "ساخت گزارش تسویه ماهانه مالک",
        message: `گزارش تسویه مالک برای ${preview.period.label} ساخته شد.`,
        afterData: {
          settlementId: saved.id,
          periodYear: period.year,
          periodMonth: period.month,
          periodLabel: preview.period.label,
          heldEventsCount: preview.settlement.heldEventsCount,
          canceledEventsCount: preview.settlement.canceledEventsCount,
          invoiceTotal: preview.settlement.invoiceTotal,
          cancellationIncomeTotal: preview.settlement.cancellationIncomeTotal,
          finalOwnerPayable: preview.settlement.finalOwnerPayable,
          minimumGuaranteeApplied: preview.settlement.minimumGuaranteeApplied,
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_OWNER_MONTHLY_SETTLEMENT_33",
          regeneratedDraft: Boolean(existing),
          cancellationIncomeRequiresIndependentCancellationLedgerInFuture: true,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/owner-settlements/${saved.id}`,
      },
    });

    return saved;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/owner-settlements");
  revalidatePath(`/dashboard/owner-settlements/${result.id}`);
  revalidatePath("/dashboard/settings/activity");

  redirect(`/dashboard/owner-settlements/${result.id}?generated=1`);
}

export async function approveOwnerMonthlySettlementAction(formData: FormData) {
  const membership = await requireTenantPermission("owner.settlement.manage");
  const db = await getPrisma();
  const id = readId(formData);

  if (!id) redirect("/dashboard/owner-settlements?error=invalid");

  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id, tenantId: membership.tenantId },
  });

  if (!settlement) redirect("/dashboard/owner-settlements?error=not-found");
  if (settlement.status !== "DRAFT") redirect(`/dashboard/owner-settlements/${settlement.id}?error=not-draft`);

  await db.$transaction(async (tx) => {
    const updated = await tx.ownerMonthlySettlement.update({
      where: { id: settlement.id },
      data: {
        status: "APPROVED",
        approvedByUserId: membership.userId,
        approvedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "OWNER_MONTHLY_SETTLEMENT_APPROVED",
        entityType: "OWNER_MONTHLY_SETTLEMENT",
        entityId: updated.id,
        title: "تأیید گزارش تسویه ماهانه مالک",
        message: `گزارش تسویه مالک برای ${updated.periodLabel} تأیید شد.`,
        afterData: {
          settlementId: updated.id,
          status: updated.status,
          finalOwnerPayable: updated.finalOwnerPayable.toString(),
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_MONTHLY_CLOSE_LOCK_39",
          monthlyCloseLockCreated: true,
          lockedPeriodYear: updated.periodYear,
          lockedPeriodMonth: updated.periodMonth,
          previousTaskId: "TALAR_OWNER_MONTHLY_SETTLEMENT_33",
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/owner-settlements/${updated.id}`,
      },
    });
  });

  revalidatePath("/dashboard/owner-settlements");
  revalidatePath(`/dashboard/owner-settlements/${settlement.id}`);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/monthly-close-lock");
  revalidatePath("/dashboard/owner-financial-overview");
  redirect(`/dashboard/owner-settlements/${settlement.id}?approved=1`);
}

export async function markOwnerMonthlySettlementPaidAction(formData: FormData) {
  const membership = await requireTenantPermission("owner.settlement.manage");
  const db = await getPrisma();
  const id = readId(formData);

  if (!id) redirect("/dashboard/owner-settlements?error=invalid");

  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id, tenantId: membership.tenantId },
  });

  if (!settlement) redirect("/dashboard/owner-settlements?error=not-found");
  if (settlement.status !== "APPROVED") redirect(`/dashboard/owner-settlements/${settlement.id}?error=not-approved`);

  await db.$transaction(async (tx) => {
    const updated = await tx.ownerMonthlySettlement.update({
      where: { id: settlement.id },
      data: {
        status: "PAID",
        paidByUserId: membership.userId,
        paidAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "OWNER_MONTHLY_SETTLEMENT_PAID",
        entityType: "OWNER_MONTHLY_SETTLEMENT",
        entityId: updated.id,
        title: "ثبت پرداخت تسویه ماهانه مالک",
        message: `پرداخت گزارش تسویه مالک برای ${updated.periodLabel} ثبت شد.`,
        afterData: {
          settlementId: updated.id,
          status: updated.status,
          finalOwnerPayable: updated.finalOwnerPayable.toString(),
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_MONTHLY_CLOSE_LOCK_39",
          monthlyCloseLockPreserved: true,
          lockedPeriodYear: updated.periodYear,
          lockedPeriodMonth: updated.periodMonth,
          previousTaskId: "TALAR_OWNER_MONTHLY_SETTLEMENT_33",
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/owner-settlements/${updated.id}`,
      },
    });
  });

  revalidatePath("/dashboard/owner-settlements");
  revalidatePath(`/dashboard/owner-settlements/${settlement.id}`);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/monthly-close-lock");
  revalidatePath("/dashboard/owner-financial-overview");
  redirect(`/dashboard/owner-settlements/${settlement.id}?paid=1`);
}
