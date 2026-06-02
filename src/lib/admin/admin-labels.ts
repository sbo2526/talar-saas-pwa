export const tenantStatusLabels: Record<string, string> = {
  DEMO: "دوره بررسی",
  ACTIVE: "فعال",
  SUSPENDED: "تعلیق‌شده",
  ARCHIVED: "آرشیوشده",
};

export const subscriptionStatusLabels: Record<string, string> = {
  TRIALING: "دوره بررسی فعال",
  ACTIVE: "اشتراک فعال",
  PAST_DUE: "نیازمند تمدید",
  CANCELED: "لغوشده",
  EXPIRED: "منقضی‌شده",
};

export const subscriptionPlanLabels: Record<string, string> = {
  DEMO: "دوره بررسی",
  STARTER: "شروع",
  PROFESSIONAL: "حرفه‌ای",
  ENTERPRISE: "سازمانی",
};

export const ticketStatusLabels: Record<string, string> = {
  OPEN: "باز",
  IN_REVIEW: "در حال بررسی",
  ANSWERED: "پاسخ داده شده",
  WAITING_FOR_USER: "در انتظار پاسخ کاربر",
  CLOSED: "بسته شده",
};

export const ticketPriorityLabels: Record<string, string> = {
  LOW: "کم",
  NORMAL: "عادی",
  HIGH: "زیاد",
  URGENT: "فوری",
};

export function getTenantStatusLabel(status: string | null | undefined) {
  return tenantStatusLabels[status ?? ""] ?? "نامشخص";
}

export function getSubscriptionStatusLabel(status: string | null | undefined) {
  return subscriptionStatusLabels[status ?? ""] ?? "بدون اشتراک";
}

export function getSubscriptionPlanLabel(plan: string | null | undefined) {
  return subscriptionPlanLabels[plan ?? ""] ?? "—";
}

export function getTicketStatusLabel(status: string | null | undefined) {
  return ticketStatusLabels[status ?? ""] ?? "نامشخص";
}

export function getTicketPriorityLabel(priority: string | null | undefined) {
  return ticketPriorityLabels[priority ?? ""] ?? "نامشخص";
}

export function getTenantStatusTone(status: string | null | undefined) {
  if (status === "ACTIVE") return "emerald" as const;
  if (status === "DEMO") return "amber" as const;
  if (status === "SUSPENDED" || status === "ARCHIVED") return "rose" as const;
  return "slate" as const;
}

export function getSubscriptionStatusTone(status: string | null | undefined) {
  if (status === "ACTIVE") return "emerald" as const;
  if (status === "TRIALING") return "amber" as const;
  if (status === "PAST_DUE" || status === "EXPIRED" || status === "CANCELED") return "rose" as const;
  return "slate" as const;
}

export function getTicketStatusTone(status: string | null | undefined) {
  if (status === "CLOSED") return "slate" as const;
  if (status === "ANSWERED") return "emerald" as const;
  if (status === "WAITING_FOR_USER" || status === "IN_REVIEW") return "amber" as const;
  return "rose" as const;
}

export function getTicketPriorityTone(priority: string | null | undefined) {
  if (priority === "URGENT" || priority === "HIGH") return "rose" as const;
  if (priority === "NORMAL") return "amber" as const;
  return "slate" as const;
}
