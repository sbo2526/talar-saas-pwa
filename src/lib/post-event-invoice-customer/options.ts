import type {
  PostEventInvoiceCustomerFeedbackStatus,
  PostEventInvoiceMismatchType,
  PostEventInvoiceOffInvoiceReportType,
  PostEventInvoiceOwnerReviewStatus,
} from "@prisma/client";

export const postEventInvoiceCustomerFeedbackStatusLabels: Record<PostEventInvoiceCustomerFeedbackStatus, string> = {
  SUBMITTED: "ثبت پاسخ مشتری",
  OWNER_REVIEW_REQUIRED: "نیازمند بررسی مالک",
  OWNER_REVIEWED: "بررسی‌شده توسط مالک",
  ACCEPTED_BY_OWNER: "پذیرفته‌شده توسط مالک",
  REJECTED_BY_OWNER: "ردشده توسط مالک",
};

export const postEventInvoiceMismatchTypeLabels: Record<PostEventInvoiceMismatchType, string> = {
  GUEST_COUNT: "تعداد نفرات",
  UNDELIVERED_SERVICE: "خدمات انجام‌نشده",
  EXTRA_AMOUNT: "مبلغ اضافه",
  UNRECORDED_PAYMENT: "پرداخت ثبت‌نشده",
  SERVICE_QUALITY: "کیفیت خدمات",
  OTHER: "سایر",
};

export const postEventInvoiceOffInvoiceReportTypeLabels: Record<PostEventInvoiceOffInvoiceReportType, string> = {
  GENERAL_EXTRA_PAYMENT: "پرداخت اضافه عمومی",
  PHOTO_VIDEO: "عکاسی / فیلمبرداری",
  DECORATION_FLOWER: "دیزاین / گل‌آرایی",
  MUSIC_SOUND_LIGHT: "موزیک / صدا / نورپردازی",
  EXTRA_FOOD_DRINK: "غذا / نوشیدنی اضافه",
  PARKING_TIP_SERVICE: "پارکینگ / انعام / خدمات جانبی",
  STAFF_REQUESTED_PAYMENT: "درخواست یا دریافت توسط عوامل اجرایی",
  OTHER: "سایر",
};

export const postEventInvoiceOwnerReviewStatusLabels: Record<PostEventInvoiceOwnerReviewStatus, string> = {
  REPORTED: "ثبت گزارش مشتری",
  OWNER_REVIEW_REQUIRED: "نیازمند بررسی مالک",
  CONFIRMED_OFF_INVOICE: "تأیید پرداخت خارج از فاکتور",
  REJECTED: "رد گزارش مشتری",
  MARKED_AS_ALLOWED_SIDE_SERVICE: "ثبت به عنوان خدمت جانبی مجاز",
};

export function getCustomerInvoiceFeedbackSummary(input: {
  hasLink?: boolean;
  feedbackStatus?: PostEventInvoiceCustomerFeedbackStatus | null;
  hasMismatch?: boolean | null;
  hasOffInvoicePayment?: boolean | null;
}) {
  if (!input.hasLink) return "لینک مشتری ساخته نشده است";
  if (!input.feedbackStatus) return "در انتظار مشاهده مشتری";
  if (input.hasOffInvoicePayment) return "دارای گزارش پرداخت خارج از فاکتور";
  if (input.hasMismatch) return "دارای مغایرت";
  return postEventInvoiceCustomerFeedbackStatusLabels[input.feedbackStatus];
}

export function getOwnerReviewTone(status: PostEventInvoiceOwnerReviewStatus | null | undefined) {
  if (status === "CONFIRMED_OFF_INVOICE") return "success";
  if (status === "REJECTED") return "danger";
  if (status === "MARKED_AS_ALLOWED_SIDE_SERVICE") return "neutral";
  return "warning";
}
