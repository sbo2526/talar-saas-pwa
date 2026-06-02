import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/audit/audit-taxonomy";
import { formatJalaliAuditDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "عنوان",
  name: "نام",
  fullName: "نام کامل",
  phone: "شماره تماس",
  mobile: "موبایل",
  nationalCode: "کد ملی",
  nationalId: "شناسه ملی",
  amount: "مبلغ",
  totalAmount: "مبلغ کل",
  finalTotal: "مبلغ نهایی",
  remainingAmount: "مانده",
  status: "وضعیت",
  paidAt: "تاریخ دریافت",
  occurredAt: "تاریخ وقوع",
  eventDate: "تاریخ مراسم",
  eventStartTime: "ساعت شروع",
  eventEndTime: "ساعت پایان",
  guestCount: "تعداد مهمان",
  description: "توضیحات",
  note: "یادداشت",
  notes: "یادداشت‌ها",
  isActive: "وضعیت فعال بودن",
  isEnabled: "وضعیت فعال بودن",
  category: "دسته‌بندی",
  price: "قیمت",
  pricePerGuest: "قیمت هر نفر",
  basePrice: "قیمت پایه",
  contractNo: "شماره قرارداد",
  contractPrefix: "پیشوند قرارداد",
  nextNumber: "شماره بعدی",
  brandName: "نام برند",
  managerName: "نام مدیر",
  provider: "ارائه‌دهنده",
  chatId: "شناسه گفت‌وگو",
  chatTitle: "عنوان گفت‌وگو",
};

const USEFUL_FIELDS = new Set(Object.keys(AUDIT_FIELD_LABELS));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function maskNationalCode(value: string) {
  if (value.length <= 4) {
    return "••••";
  }
  return `${value.slice(0, 2)}••••••${value.slice(-2)}`;
}

export function getAuditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function getAuditEntityLabel(entityType: string) {
  return AUDIT_ENTITY_LABELS[entityType] ?? entityType;
}

export function formatAuditValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "فعال" : "غیرفعال";
  }

  if (key.toLowerCase().includes("amount") || key.toLowerCase().includes("price")) {
    return formatIRR(String(value));
  }

  if (key === "guestCount" || key === "nextNumber") {
    return formatPersianNumber(String(value));
  }

  if (key.toLowerCase().includes("date") || key.endsWith("At")) {
    return formatJalaliAuditDateTime(String(value));
  }

  if (key === "nationalCode" || key === "nationalId") {
    return toPersianDigits(maskNationalCode(String(value)));
  }

  if (typeof value === "object") {
    return "—";
  }

  return toPersianDigits(String(value));
}

export function getAuditDiffRows(beforeData: unknown, afterData: unknown) {
  if (!isRecord(beforeData) || !isRecord(afterData)) {
    return [];
  }

  const keys = Array.from(
    new Set([...Object.keys(beforeData), ...Object.keys(afterData)]),
  ).filter((key) => USEFUL_FIELDS.has(key));

  return keys
    .filter((key) => JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]))
    .map((key) => ({
      field: AUDIT_FIELD_LABELS[key] ?? key,
      before: formatAuditValue(key, beforeData[key]),
      after: formatAuditValue(key, afterData[key]),
    }));
}
