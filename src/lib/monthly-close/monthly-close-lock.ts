import type { OwnerSettlementStatus, Prisma } from "@prisma/client";
import { dateToJalaliParts, formatJalaliMonthTitle } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

const lockedSettlementStatuses: OwnerSettlementStatus[] = ["APPROVED", "PAID"];

export type MonthlyCloseLockInfo = {
  locked: boolean;
  tenantId: string;
  year: number;
  month: number;
  periodLabel: string;
  settlement: {
    id: string;
    status: OwnerSettlementStatus;
    approvedAt: Date | null;
    paidAt: Date | null;
    finalOwnerPayable: Prisma.Decimal;
  } | null;
};

export type MonthlyCloseBlockedAttemptInput = {
  tenantId: string;
  userId?: string | null;
  lock: MonthlyCloseLockInfo;
  action: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export function resolveMonthlyClosePeriodFromEventDate(eventDate: Date) {
  const parts = dateToJalaliParts(eventDate);
  return {
    year: parts.year,
    month: parts.month,
    periodLabel: formatJalaliMonthTitle(parts.year, parts.month),
  };
}

export function isMonthlyCloseLockedStatus(status: OwnerSettlementStatus | null | undefined) {
  return Boolean(status && lockedSettlementStatuses.includes(status));
}

export async function getMonthlyCloseLockForPeriod(input: {
  tenantId: string;
  year: number;
  month: number;
}): Promise<MonthlyCloseLockInfo> {
  const db = await getPrisma();
  const settlement = await db.ownerMonthlySettlement.findUnique({
    where: {
      tenantId_periodYear_periodMonth: {
        tenantId: input.tenantId,
        periodYear: input.year,
        periodMonth: input.month,
      },
    },
    select: {
      id: true,
      status: true,
      approvedAt: true,
      paidAt: true,
      finalOwnerPayable: true,
    },
  });

  return {
    locked: isMonthlyCloseLockedStatus(settlement?.status),
    tenantId: input.tenantId,
    year: input.year,
    month: input.month,
    periodLabel: formatJalaliMonthTitle(input.year, input.month),
    settlement: settlement ?? null,
  };
}

export async function getMonthlyCloseLockForEventDate(input: {
  tenantId: string;
  eventDate: Date;
}) {
  const period = resolveMonthlyClosePeriodFromEventDate(input.eventDate);
  return getMonthlyCloseLockForPeriod({
    tenantId: input.tenantId,
    year: period.year,
    month: period.month,
  });
}

export function getMonthlyCloseRedirectSuffix(lock: MonthlyCloseLockInfo) {
  return `monthly-locked=${lock.year}-${String(lock.month).padStart(2, "0")}`;
}

export async function recordMonthlyCloseBlockedAttempt(input: MonthlyCloseBlockedAttemptInput) {
  if (!input.lock.locked || !input.lock.settlement) return;

  const db = await getPrisma();
  await db.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? input.lock.settlement.id,
      title: input.title,
      message: input.message,
      afterData: {
        locked: true,
        periodYear: input.lock.year,
        periodMonth: input.lock.month,
        periodLabel: input.lock.periodLabel,
        settlementId: input.lock.settlement.id,
        settlementStatus: input.lock.settlement.status,
        approvedAt: input.lock.settlement.approvedAt?.toISOString() ?? null,
        paidAt: input.lock.settlement.paidAt?.toISOString() ?? null,
        finalOwnerPayable: input.lock.settlement.finalOwnerPayable.toString(),
      } satisfies Prisma.InputJsonValue,
      metadata: {
        taskId: "TALAR_MONTHLY_CLOSE_LOCK_39",
        monthlyCloseLock: true,
        blockedMutation: true,
        sourceMetadata: input.metadata ?? null,
      } satisfies Prisma.InputJsonValue,
      href: input.href ?? `/dashboard/owner-settlements/${input.lock.settlement.id}`,
    },
  });
}
