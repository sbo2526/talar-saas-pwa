type HallOperationModel = "OWNER_DIRECT" | "FIXED_RENT" | "PERCENTAGE_MANAGEMENT" | "GUARANTEED_PERCENTAGE_MANAGEMENT" | "FIXED_RENT_PLUS_PERCENTAGE";
type OwnerMonthlySettlementEntryReviewStatus = "INCLUDED" | "INFORMATIONAL" | "REVIEW_REQUIRED" | "EXCLUDED";
type OwnerMonthlySettlementEntryType = "EVENT_INVOICE" | "CANCELLATION" | "EXTRA_SERVICE" | "APPROVED_OFF_INVOICE" | "FIXED_RENT" | "GUARANTEE_SHORTFALL" | "MANUAL_ADJUSTMENT";
type OwnerMonthlySettlementStatus = "DRAFT" | "CALCULATED" | "PAYMENT_PENDING" | "PARTIALLY_PAID" | "PAID" | "LOCKED" | "CANCELLED";
type PostEventDecisionStatus = "HELD" | "NOT_HELD_CANCELLATION" | "NOT_HELD_VALID_RESCHEDULE" | "NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW";
type PostEventInvoiceCustomerFeedbackStatus = "SUBMITTED" | "OWNER_REVIEW_REQUIRED" | "OWNER_REVIEWED" | "ACCEPTED_BY_OWNER" | "REJECTED_BY_OWNER";
type PostEventInvoiceOffInvoiceReportType = "GENERAL_EXTRA_PAYMENT" | "PHOTO_VIDEO" | "DECORATION_FLOWER" | "MUSIC_SOUND_LIGHT" | "EXTRA_FOOD_DRINK" | "PARKING_TIP_SERVICE" | "STAFF_REQUESTED_PAYMENT" | "OTHER";
type PostEventInvoiceOwnerReviewStatus = "REPORTED" | "OWNER_REVIEW_REQUIRED" | "CONFIRMED_OFF_INVOICE" | "REJECTED" | "MARKED_AS_ALLOWED_SIDE_SERVICE";

export const ownerControlSeverityLabels = {
  OK: "آماده",
  WARNING: "نیازمند بررسی",
  CRITICAL: "نیازمند اقدام",
} as const;

export const ownerControlSeverityClasses = {
  OK: "border-[#25a46d]/25 bg-[#edfdf4] text-[#17483f]",
  WARNING: "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]",
  CRITICAL: "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]",
} as const;

export const ownerReportTypeLabels = {
  ownerShare: "گزارش سهم مالک",
  monthlySettlement: "گزارش تسویه ماهانه مالک",
  postEventInvoice: "گزارش صورتحساب‌های بعد از مراسم",
  offInvoice: "گزارش پرداخت‌های خارج از صورتحساب",
  cancellationLate: "گزارش کنسلی‌ها و انتقال‌های دیرهنگام",
  financialLock: "گزارش قفل‌های مالی",
} as const;

export const ownerCommercialReadinessStatusLabels = {
  ready: "آماده",
  missing: "نیازمند تکمیل",
  review: "نیازمند بررسی",
} as const;

export const operationModelCommercialLabels: Record<HallOperationModel, string> = {
  OWNER_DIRECT: "مالک مستقیم",
  FIXED_RENT: "اجاره ثابت",
  PERCENTAGE_MANAGEMENT: "مدیریت درصدی",
  GUARANTEED_PERCENTAGE_MANAGEMENT: "مدیریت درصدی با حداقل تضمین",
  FIXED_RENT_PLUS_PERCENTAGE: "اجاره ثابت به‌همراه درصد",
};

export const postEventDecisionCommercialLabels: Record<PostEventDecisionStatus, string> = {
  HELD: "برگزار شده",
  NOT_HELD_CANCELLATION: "برگزار نشده - کنسلی",
  NOT_HELD_VALID_RESCHEDULE: "برگزار نشده - انتقال معتبر",
  NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW: "انتقال دیرهنگام / نیازمند بررسی مالک",
};

export const feedbackCommercialLabels: Record<PostEventInvoiceCustomerFeedbackStatus, string> = {
  SUBMITTED: "ثبت پاسخ مشتری",
  OWNER_REVIEW_REQUIRED: "نیازمند بررسی مالک",
  OWNER_REVIEWED: "بررسی‌شده توسط مالک",
  ACCEPTED_BY_OWNER: "پذیرفته‌شده توسط مالک",
  REJECTED_BY_OWNER: "ردشده توسط مالک",
};

export const offInvoiceReportTypeCommercialLabels: Record<PostEventInvoiceOffInvoiceReportType, string> = {
  GENERAL_EXTRA_PAYMENT: "پرداخت اضافه عمومی",
  PHOTO_VIDEO: "عکاسی / فیلمبرداری",
  DECORATION_FLOWER: "دیزاین / گل‌آرایی",
  MUSIC_SOUND_LIGHT: "موزیک / نورپردازی",
  EXTRA_FOOD_DRINK: "غذا / نوشیدنی اضافه",
  PARKING_TIP_SERVICE: "پارکینگ / انعام / خدمات",
  STAFF_REQUESTED_PAYMENT: "درخواست یا دریافت توسط عوامل",
  OTHER: "سایر",
};

export const ownerReviewCommercialLabels: Record<PostEventInvoiceOwnerReviewStatus, string> = {
  REPORTED: "ثبت‌شده",
  OWNER_REVIEW_REQUIRED: "نیازمند بررسی مالک",
  CONFIRMED_OFF_INVOICE: "تأیید پرداخت خارج از فاکتور",
  REJECTED: "رد گزارش مشتری",
  MARKED_AS_ALLOWED_SIDE_SERVICE: "خدمت جانبی مجاز",
};

export const settlementStatusCommercialLabels: Record<OwnerMonthlySettlementStatus, string> = {
  DRAFT: "پیش‌نویس",
  CALCULATED: "محاسبه‌شده",
  PAYMENT_PENDING: "در انتظار پرداخت",
  PARTIALLY_PAID: "پرداخت بخشی",
  PAID: "پرداخت‌شده",
  LOCKED: "قفل‌شده",
  CANCELLED: "لغوشده",
};

export const settlementEntryTypeCommercialLabels: Record<OwnerMonthlySettlementEntryType, string> = {
  EVENT_INVOICE: "صورتحساب مراسم",
  CANCELLATION: "کنسلی",
  EXTRA_SERVICE: "خدمات اضافه",
  APPROVED_OFF_INVOICE: "پرداخت خارج از فاکتور تأییدشده",
  FIXED_RENT: "اجاره ثابت",
  GUARANTEE_SHORTFALL: "کسری حداقل تضمین",
  MANUAL_ADJUSTMENT: "اصلاح دستی",
};

export const settlementEntryReviewCommercialLabels: Record<OwnerMonthlySettlementEntryReviewStatus, string> = {
  INCLUDED: "لحاظ‌شده",
  INFORMATIONAL: "اطلاعاتی",
  REVIEW_REQUIRED: "نیازمند بررسی",
  EXCLUDED: "لحاظ‌نشده",
};
