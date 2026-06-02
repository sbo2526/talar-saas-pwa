"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { getTodayJalali, jalaliToDate } from "@/lib/date/jalali";
import { getMonthlyCloseLockForEventDate, getMonthlyCloseRedirectSuffix, recordMonthlyCloseBlockedAttempt } from "@/lib/monthly-close/monthly-close-lock";
import { getOwnerOperationStartDateForTenant, isLegacyContractEventDate } from "@/lib/post-event/post-event-decision-gate";
import { getPrisma } from "@/lib/prisma";

const actionableStatuses = ["RESERVED", "CONFIRMED", "COMPLETED"] as const;
const allowedDecisions = ["HELD", "NOT_HELD"] as const;

type PostEventDecision = (typeof allowedDecisions)[number];

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalMoney(formData: FormData, key: string) {
  const raw = readRequiredString(formData, key)
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[,٬،\s]/g, "");

  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : Number.NaN;
}

function asMoney(value: number) {
  return Math.max(0, Math.round(value)).toFixed(2);
}

function resolveTodayStart() {
  const today = getTodayJalali();
  return jalaliToDate(today.year, today.month, today.day);
}

function isPostEventDecision(value: string): value is PostEventDecision {
  return allowedDecisions.includes(value as PostEventDecision);
}

export async function confirmPostEventAction(formData: FormData) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const contractId = readRequiredString(formData, "contractId");
  const decisionValue = readRequiredString(formData, "decision");
  const note = readRequiredString(formData, "note").slice(0, 500);
  const manualCancellationAmount = readOptionalMoney(formData, "cancellationAmount");

  if (!contractId || !isPostEventDecision(decisionValue)) {
    redirect("/dashboard?postEvent=invalid");
  }

  const todayStart = resolveTodayStart();
  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      tenantId: membership.tenantId,
      status: { in: [...actionableStatuses] },
    },
    select: {
      id: true,
      contractNo: true,
      eventDate: true,
      status: true,
      customer: { select: { fullName: true } },
      postEventConfirmation: { select: { id: true } },
    },
  });

  if (!contract) {
    redirect("/dashboard?postEvent=not-found");
  }

  if (contract.postEventConfirmation) {
    redirect("/dashboard?postEvent=already-resolved");
  }

  const ownerOperationStartDate = await getOwnerOperationStartDateForTenant(membership.tenantId);

  if (isLegacyContractEventDate(contract.eventDate, ownerOperationStartDate)) {
    redirect(`/dashboard/contracts/${contract.id}?postEvent=legacy-archived`);
  }

  if (contract.eventDate >= todayStart) {
    redirect(`/dashboard/contracts/${contract.id}?postEvent=not-due`);
  }

  const closeLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: contract.eventDate,
  });

  if (closeLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: membership.tenantId,
      userId: membership.userId,
      lock: closeLock,
      action: "MONTHLY_CLOSE_BLOCKED_POST_EVENT_CONFIRMATION",
      entityType: "POST_EVENT_CONFIRMATION",
      entityId: contract.id,
      title: "جلوگیری از تعیین وضعیت مراسم در ماه بسته‌شده",
      message: `تعیین وضعیت قرارداد ${contract.contractNo} متوقف شد، چون دوره ${closeLock.periodLabel} قفل شده است.`,
      href: `/dashboard/contracts/${contract.id}`,
      metadata: { sourceAction: "confirmPostEventAction", attemptedDecision: decisionValue },
    });
    redirect(`/dashboard/contracts/${contract.id}?postEvent=monthly-locked&${getMonthlyCloseRedirectSuffix(closeLock)}`);
  }

  const isHeld = decisionValue === "HELD";

  if (!isHeld && manualCancellationAmount !== null && !Number.isFinite(manualCancellationAmount)) {
    redirect(`/dashboard/contracts/${contract.id}?postEvent=invalid-cancellation-amount`);
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    const confirmation = await tx.postEventConfirmation.create({
      data: {
        tenantId: membership.tenantId,
        contractId: contract.id,
        confirmedByUserId: membership.userId,
        status: decisionValue,
        source: "DASHBOARD_GATE",
        note: note || null,
        invoiceRequired: isHeld,
        cancellationRequired: !isHeld,
        cancellationAmount: !isHeld && manualCancellationAmount !== null ? asMoney(manualCancellationAmount) : null,
        cancellationAmountManual: !isHeld && manualCancellationAmount !== null,
        confirmedAt: now,
      },
      select: { id: true, status: true, invoiceRequired: true, cancellationRequired: true },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: isHeld ? "POST_EVENT_HELD" : "POST_EVENT_NOT_HELD",
        entityType: "POST_EVENT_CONFIRMATION",
        entityId: confirmation.id,
        title: isHeld ? "تأیید برگزاری مراسم" : "ثبت عدم برگزاری مراسم",
        message: isHeld
          ? `مراسم قرارداد ${contract.contractNo} برای ${contract.customer.fullName} برگزار شده ثبت شد و برای صدور صورتحساب آماده است.`
          : `مراسم قرارداد ${contract.contractNo} برای ${contract.customer.fullName} برگزار نشده ثبت شد و باید وارد فرآیند کنسلی شود.`,
        beforeData: {
          contractId: contract.id,
          contractNo: contract.contractNo,
          contractStatus: contract.status,
          eventDate: contract.eventDate.toISOString(),
        },
        afterData: confirmation,
        metadata: {
          source: "DASHBOARD_GATE",
          requiresPhase30Invoice: isHeld,
          requiresCancellationFlow: !isHeld,
          manualCancellationAmount: !isHeld && manualCancellationAmount !== null ? manualCancellationAmount : null,
          cancellationAmountManual: !isHeld && manualCancellationAmount !== null,
          confirmedAt: now.toISOString(),
        },
        href: `/dashboard/contracts/${contract.id}`,
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/owner-financial-overview");
  revalidatePath("/dashboard/owner-settlements");
  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/settings/activity");

  if (!isHeld) {
    redirect(`/dashboard/contracts/${contract.id}?postEvent=not-held#cancellation-policy`);
  }

  redirect(`/dashboard/contracts/${contract.id}/invoice?postEvent=held`);
}
