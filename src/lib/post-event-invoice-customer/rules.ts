import { createHash } from "crypto";
import type { PostEventInvoiceMismatchType, PostEventInvoiceOffInvoiceReportType } from "@prisma/client";

export const customerInvoiceAccessKind = "POST_EVENT_INVOICE" as const;
export const customerInvoiceLinkMonths = 3;

const latinDigits = "0123456789";

export function normalizePersianNumberText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? "")
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
      if (persianIndex >= 0) return latinDigits[persianIndex];
      const arabicIndex = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      return arabicIndex >= 0 ? latinDigits[arabicIndex] : digit;
    })
    .replace(/,/g, "")
    .trim();
}

export function parseCustomerMoney(value: FormDataEntryValue | string | null | undefined) {
  const parsed = Number(normalizePersianNumberText(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeCustomerText(value: FormDataEntryValue | string | null | undefined, max = 1000) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : null;
}

export function normalizeCustomerDate(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizePersianNumberText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hashOptionalRequestValue(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export const validMismatchTypes: PostEventInvoiceMismatchType[] = [
  "GUEST_COUNT",
  "UNDELIVERED_SERVICE",
  "EXTRA_AMOUNT",
  "UNRECORDED_PAYMENT",
  "SERVICE_QUALITY",
  "OTHER",
];

export const validOffInvoiceReportTypes: PostEventInvoiceOffInvoiceReportType[] = [
  "GENERAL_EXTRA_PAYMENT",
  "PHOTO_VIDEO",
  "DECORATION_FLOWER",
  "MUSIC_SOUND_LIGHT",
  "EXTRA_FOOD_DRINK",
  "PARKING_TIP_SERVICE",
  "STAFF_REQUESTED_PAYMENT",
  "OTHER",
];

export function parseMismatchType(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim() as PostEventInvoiceMismatchType;
  return validMismatchTypes.includes(normalized) ? normalized : null;
}

export function parseOffInvoiceReportType(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim() as PostEventInvoiceOffInvoiceReportType;
  return validOffInvoiceReportTypes.includes(normalized) ? normalized : "OTHER";
}
