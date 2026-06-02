"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditCreate } from "@/lib/audit/audit-action-helpers";
import { requireTenantMember } from "@/lib/auth/session";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import {
  getCurrentLocalDateStart,
  isValidRescheduleRegistration,
} from "@/lib/post-event-decisions/rules";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value && value.length > 0 ? value : null;
}

function normalizeNote(value: FormDataEntryValue | null) {
  const note = value?.toString().trim();
  return note && note.length > 0 ? note.slice(0, 1000) : null;
}

function revalidatePostEventDecisionPaths(contractId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/post-event-decisions");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contractId}`);
}

async function resolveDecisionContract(contractId: string, tenantId: string) {
  const db = await getPrisma();
  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      tenantId,
      status: { in: ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED"] },
      eventDate: { lt: getCurrentLocalDateStart() },
      postEventDecision: { is: null },
    },
    select: {
      id: true,
      tenantId: true,
      contractNo: true,
      eventDate: true,
      hallId: true,
      customer: { select: { fullName: true } },
    },
  });

  return contract;
}

async function auditPostEventDecision(input: {
  membership: Awaited<ReturnType<typeof requireTenantMember>>;
  decision: unknown & { id: string; contractId: string; decisionStatus: string };
  contractNo: string;
}) {
  await auditCreate({
    membership: input.membership,
    entityType: "POST_EVENT_DECISION",
    entityLabel: "تعیین تکلیف بعد از مراسم",
    entityId: input.decision.id,
    recordLabel: `قرارداد ${input.contractNo}`,
    title: "ثبت تعیین تکلیف بعد از مراسم",
    afterData: input.decision,
    href: `/dashboard/contracts/${input.decision.contractId}`,
  });
}

export async function markPostEventHeldAction(formData: FormData) {
  const membership = await requireTenantMember();
  const contractId = getRequiredString(formData, "contractId");

  if (!contractId) {
    redirect("/dashboard/post-event-decisions?error=invalid-request");
  }

  const db = await getPrisma();
  const contract = await resolveDecisionContract(contractId, membership.tenantId);

  if (!contract) {
    redirect("/dashboard/post-event-decisions?error=not-found");
  }

  const decision = await db.postEventDecision.create({
    data: {
      tenantId: membership.tenantId,
      contractId: contract.id,
      hallId: contract.hallId,
      decisionStatus: "HELD",
      decidedByUserId: membership.userId,
      decidedAt: new Date(),
      operatorNote: normalizeNote(formData.get("operatorNote")),
    },
  });

  await auditPostEventDecision({ membership, decision, contractNo: contract.contractNo });
  revalidatePostEventDecisionPaths(contract.id);
  redirect(`/dashboard/post-event-decisions?saved=held&contract=${encodeURIComponent(contract.contractNo)}`);
}

export async function markPostEventCancellationAction(formData: FormData) {
  const membership = await requireTenantMember();
  const contractId = getRequiredString(formData, "contractId");

  if (!contractId) {
    redirect("/dashboard/post-event-decisions?error=invalid-request");
  }

  const db = await getPrisma();
  const contract = await resolveDecisionContract(contractId, membership.tenantId);

  if (!contract) {
    redirect("/dashboard/post-event-decisions?error=not-found");
  }

  const decision = await db.postEventDecision.create({
    data: {
      tenantId: membership.tenantId,
      contractId: contract.id,
      hallId: contract.hallId,
      decisionStatus: "NOT_HELD_CANCELLATION",
      notHeldReason: "CANCELLATION",
      cancellationFlowLinked: false,
      decidedByUserId: membership.userId,
      decidedAt: new Date(),
      operatorNote: normalizeNote(formData.get("operatorNote")),
    },
  });

  await auditPostEventDecision({ membership, decision, contractNo: contract.contractNo });
  revalidatePostEventDecisionPaths(contract.id);
  redirect(`/dashboard/post-event-decisions?saved=cancellation&contract=${encodeURIComponent(contract.contractNo)}`);
}

export async function markPostEventRescheduleAction(formData: FormData) {
  const membership = await requireTenantMember();
  const contractId = getRequiredString(formData, "contractId");
  const rescheduledToDateValue = getRequiredString(formData, "rescheduledToDate");

  if (!contractId) {
    redirect("/dashboard/post-event-decisions?error=invalid-request");
  }

  if (!rescheduledToDateValue) {
    redirect(`/dashboard/post-event-decisions?contractId=${encodeURIComponent(contractId)}&flow=not-held&error=reschedule-date-required`);
  }

  const rescheduledToDate = parseDateLikeToDate(rescheduledToDateValue);

  if (!rescheduledToDate) {
    redirect(`/dashboard/post-event-decisions?contractId=${encodeURIComponent(contractId)}&flow=not-held&error=reschedule-date-invalid`);
  }

  const db = await getPrisma();
  const contract = await resolveDecisionContract(contractId, membership.tenantId);

  if (!contract) {
    redirect("/dashboard/post-event-decisions?error=not-found");
  }

  const trustedRescheduleRegisteredAt: Date | null = null;
  const registrationDate = trustedRescheduleRegisteredAt ?? new Date();
  const isValidTrustedReschedule = isValidRescheduleRegistration({
    originalEventDate: contract.eventDate,
    rescheduleRegisteredAt: trustedRescheduleRegisteredAt,
  });
  const isLateReschedule = !isValidTrustedReschedule;

  const decision = await db.postEventDecision.create({
    data: {
      tenantId: membership.tenantId,
      contractId: contract.id,
      hallId: contract.hallId,
      decisionStatus: isValidTrustedReschedule
        ? "NOT_HELD_VALID_RESCHEDULE"
        : "NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW",
      notHeldReason: "RESCHEDULE",
      rescheduledToDate,
      rescheduleRegisteredAt: registrationDate,
      isLateReschedule,
      requiresOwnerReview: isLateReschedule,
      ownerReviewReason: isLateReschedule
        ? "انتقال تاریخ بعد از موعد یا بدون سابقه معتبر ثبت حداقل ۱۰ روز قبل از مراسم ثبت شده است."
        : null,
      decidedByUserId: membership.userId,
      decidedAt: new Date(),
      operatorNote: normalizeNote(formData.get("operatorNote")),
    },
  });

  await auditPostEventDecision({ membership, decision, contractNo: contract.contractNo });
  revalidatePostEventDecisionPaths(contract.id);
  redirect(`/dashboard/post-event-decisions?saved=reschedule-owner-review&contract=${encodeURIComponent(contract.contractNo)}`);
}
