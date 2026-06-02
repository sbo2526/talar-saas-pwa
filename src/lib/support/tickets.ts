export const supportTicketStatusValues = ["OPEN", "IN_REVIEW", "ANSWERED", "WAITING_FOR_USER", "WAITING_FOR_SUPPORT", "CLOSED"] as const;
export const supportTicketPriorityValues = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export const supportTicketCategoryValues = [
  "CONTRACT",
  "PAYMENTS",
  "EXPENSES",
  "REPORTS",
  "CONTRACT_PRINT",
  "NOTIFICATIONS",
  "TRAINING",
  "SUBSCRIPTION",
  "TECHNICAL",
  "OTHER",
] as const;

export type SupportTicketStatus = (typeof supportTicketStatusValues)[number];
export type SupportTicketPriority = (typeof supportTicketPriorityValues)[number];
export type SupportTicketCategory = (typeof supportTicketCategoryValues)[number];

export const supportTicketStatusLabels: Record<SupportTicketStatus, string> = {
  OPEN: "باز",
  IN_REVIEW: "در حال بررسی",
  ANSWERED: "پاسخ داده‌شده",
  WAITING_FOR_USER: "منتظر پاسخ کاربر",
  WAITING_FOR_SUPPORT: "منتظر پاسخ پشتیبانی",
  CLOSED: "بسته‌شده",
};

export const supportTicketPriorityLabels: Record<string, string> = {
  LOW: "کم",
  NORMAL: "متوسط",
  MEDIUM: "متوسط",
  HIGH: "زیاد",
  URGENT: "فوری",
};

export const supportTicketCategoryLabels: Record<SupportTicketCategory, string> = {
  CONTRACT: "قرارداد",
  PAYMENTS: "دریافتی‌ها",
  EXPENSES: "هزینه‌ها",
  REPORTS: "گزارش‌ها",
  CONTRACT_PRINT: "چاپ قرارداد",
  NOTIFICATIONS: "اعلان‌ها",
  TRAINING: "آموزش",
  SUBSCRIPTION: "اشتراک و خرید",
  TECHNICAL: "فنی",
  OTHER: "سایر",
};

export function getSupportStatusLabel(value: string | null | undefined) {
  return value && value in supportTicketStatusLabels
    ? supportTicketStatusLabels[value as SupportTicketStatus]
    : "نامشخص";
}

export function getSupportPriorityLabel(value: string | null | undefined) {
  return value && value in supportTicketPriorityLabels
    ? supportTicketPriorityLabels[value as SupportTicketPriority]
    : "نامشخص";
}

export function getSupportCategoryLabel(value: string | null | undefined) {
  return value && value in supportTicketCategoryLabels
    ? supportTicketCategoryLabels[value as SupportTicketCategory]
    : "سایر";
}

export function getSupportStatusClass(value: string | null | undefined) {
  switch (value) {
    case "CLOSED":
      return "border-slate-300/70 bg-slate-100 text-slate-700";
    case "IN_REVIEW":
      return "border-[#c7a15a]/40 bg-[#fff4d8] text-[#7d6841]";
    case "ANSWERED":
      return "border-[#25a46d]/28 bg-[#25a46d]/12 text-[#17483f]";
    case "WAITING_FOR_USER":
      return "border-[#8b5cf6]/24 bg-[#f4edff] text-[#5b3c96]";
    case "WAITING_FOR_SUPPORT":
      return "border-[#b45353]/26 bg-[#fff1f1] text-[#8f2c2c]";
    default:
      return "border-[#d8c08b]/55 bg-[#fff8ea] text-[#7d6841]";
  }
}

export function getSupportPriorityClass(value: string | null | undefined) {
  switch (value) {
    case "URGENT":
      return "border-[#b45353]/26 bg-[#fff1f1] text-[#8f2c2c]";
    case "HIGH":
      return "border-[#c7a15a]/40 bg-[#fff4d8] text-[#7d6841]";
    case "LOW":
      return "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]";
    default:
      return "border-[#d8c08b]/55 bg-white/55 text-[#7d6841]";
  }
}
