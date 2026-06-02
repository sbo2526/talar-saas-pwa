import { toPersianDigits } from "@/lib/date/jalali";

export const expenseStatusValues = ["RECORDED", "CONFIRMED", "PENDING", "CANCELED"] as const;
export type ExpenseStatus = (typeof expenseStatusValues)[number];

export const expenseStatusLabels: Record<ExpenseStatus, string> = {
  RECORDED: "ثبت‌شده",
  CONFIRMED: "تأییدشده",
  PENDING: "در انتظار تأیید",
  CANCELED: "لغوشده",
};

export const expenseStatusOptions = expenseStatusValues.map((value) => ({
  value,
  label: expenseStatusLabels[value],
}));

export function isExpenseStatus(value: string | null | undefined): value is ExpenseStatus {
  return expenseStatusValues.includes(value as ExpenseStatus);
}

export function getExpenseStatusLabel(value: string | null | undefined) {
  return isExpenseStatus(value) ? expenseStatusLabels[value] : "ثبت‌شده";
}

export function getExpenseStatusStyle(value: string | null | undefined) {
  if (value === "CONFIRMED" || value === "RECORDED") {
    return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (value === "PENDING") {
    return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
  }

  if (value === "CANCELED") {
    return "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]";
  }

  return "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]";
}

export function getExpenseStatusTone(value: string | null | undefined) {
  if (value === "PENDING") return "در انتظار بررسی";
  if (value === "CANCELED") return "در گزارش‌ها محاسبه نمی‌شود";
  return "قابل محاسبه در گزارش‌ها";
}

export function formatExpenseReference(value: string | null | undefined) {
  return value ? toPersianDigits(value) : "ثبت نشده";
}

export function isExpenseCountable(status: string | null | undefined) {
  return status !== "CANCELED";
}


export const expenseChequeStatusValues = ["PENDING", "CLEARED", "BOUNCED", "CANCELED"] as const;
export type ExpenseChequeStatus = (typeof expenseChequeStatusValues)[number];

export const expenseChequeStatusLabels: Record<ExpenseChequeStatus, string> = {
  PENDING: "در انتظار پاس شدن",
  CLEARED: "پاس شده",
  BOUNCED: "برگشتی",
  CANCELED: "لغوشده",
};

export const expenseChequeStatusOptions = expenseChequeStatusValues.map((value) => ({
  value,
  label: expenseChequeStatusLabels[value],
}));

export function isExpenseChequeStatus(value: string | null | undefined): value is ExpenseChequeStatus {
  return expenseChequeStatusValues.includes(value as ExpenseChequeStatus);
}

export function getExpenseChequeStatusLabel(value: string | null | undefined) {
  return isExpenseChequeStatus(value) ? expenseChequeStatusLabels[value] : "در انتظار پاس شدن";
}

export function getExpenseChequeStatusStyle(value: string | null | undefined) {
  if (value === "CLEARED") {
    return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (value === "BOUNCED" || value === "CANCELED") {
    return "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]";
  }

  return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
}
