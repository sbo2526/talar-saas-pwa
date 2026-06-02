import type {
  OwnerMonthlySettlementEntryReviewStatus,
  OwnerMonthlySettlementEntryType,
  OwnerMonthlySettlementStatus,
} from "@prisma/client";
import { operationModelLabels } from "@/lib/hall-operation-agreement/options";

export const ownerMonthlySettlementStatusLabels: Record<OwnerMonthlySettlementStatus, string> = {
  DRAFT: "پیش‌نویس",
  CALCULATED: "محاسبه‌شده",
  PAYMENT_PENDING: "در انتظار پرداخت",
  PARTIALLY_PAID: "پرداخت ناقص",
  PAID: "پرداخت‌شده",
  LOCKED: "قفل‌شده",
  CANCELLED: "لغو شده",
};

export const ownerMonthlySettlementEntryTypeLabels: Record<OwnerMonthlySettlementEntryType, string> = {
  EVENT_INVOICE: "صورتحساب مراسم",
  CANCELLATION: "کنسلی",
  EXTRA_SERVICE: "خدمات اضافه",
  APPROVED_OFF_INVOICE: "پرداخت خارج از فاکتور تأییدشده",
  FIXED_RENT: "اجاره ثابت",
  GUARANTEE_SHORTFALL: "کسری حداقل تضمین",
  MANUAL_ADJUSTMENT: "اصلاح دستی",
};

export const ownerMonthlySettlementEntryReviewStatusLabels: Record<OwnerMonthlySettlementEntryReviewStatus, string> = {
  INCLUDED: "لحاظ‌شده",
  INFORMATIONAL: "اطلاعاتی",
  REVIEW_REQUIRED: "نیازمند بررسی",
  EXCLUDED: "خارج از محاسبه",
};

export function getOwnerMonthlySettlementStatusLabel(status: OwnerMonthlySettlementStatus | null | undefined) {
  return status ? ownerMonthlySettlementStatusLabels[status] : "بدون تسویه";
}

export function getOwnerMonthlySettlementStatusTone(status: OwnerMonthlySettlementStatus | null | undefined) {
  if (status === "PAID" || status === "LOCKED") return "success";
  if (status === "PARTIALLY_PAID" || status === "PAYMENT_PENDING") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

export function getOwnerSettlementOperationModelLabel(model: keyof typeof operationModelLabels | null | undefined) {
  return model ? operationModelLabels[model] : "نامشخص";
}
