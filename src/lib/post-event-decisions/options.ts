import type { PostEventDecisionStatus, PostEventNotHeldReason } from "@prisma/client";

export const postEventDecisionStatusLabels: Record<PostEventDecisionStatus, string> = {
  HELD: "برگزار شده",
  NOT_HELD_CANCELLATION: "برگزار نشده - کنسلی",
  NOT_HELD_VALID_RESCHEDULE: "برگزار نشده - انتقال معتبر",
  NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW: "انتقال دیرهنگام / نیازمند بررسی مالک",
};

export const postEventNotHeldReasonLabels: Record<PostEventNotHeldReason, string> = {
  CANCELLATION: "کنسلی قرارداد",
  RESCHEDULE: "انتقال مراسم به تاریخ دیگر",
};

export function getPostEventDecisionStatusLabel(
  status: PostEventDecisionStatus | string | null | undefined,
) {
  if (!status) {
    return "ثبت نشده";
  }

  return postEventDecisionStatusLabels[status as PostEventDecisionStatus] ?? "ثبت نشده";
}

export function getPostEventDecisionTone(
  status: PostEventDecisionStatus | string | null | undefined,
) {
  if (status === "HELD" || status === "NOT_HELD_VALID_RESCHEDULE") {
    return "success" as const;
  }

  if (status === "NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW") {
    return "warning" as const;
  }

  if (status === "NOT_HELD_CANCELLATION") {
    return "danger" as const;
  }

  return "neutral" as const;
}
