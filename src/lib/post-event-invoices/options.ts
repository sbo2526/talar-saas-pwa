import type { PostEventInvoiceLineType, PostEventInvoiceStatus } from "@prisma/client";

export const postEventInvoiceStatusLabels: Record<PostEventInvoiceStatus, string> = {
  DRAFT: "پیش‌نویس",
  ISSUED: "صادر شده",
  CANCELLED: "لغو شده",
  VOIDED: "باطل شده",
};

export const postEventInvoiceLineTypeLabels: Record<PostEventInvoiceLineType, string> = {
  CONTRACT_ITEM: "آیتم قرارداد",
  EXTRA_GUEST: "نفرات اضافه",
  EXTRA_SERVICE: "خدمات اضافه",
  MANAGER_DEDUCTION: "کسورات تأییدشده مدیر",
  NOTE: "یادداشت",
};

export function getPostEventInvoiceStatusLabel(status: PostEventInvoiceStatus | null | undefined) {
  return status ? postEventInvoiceStatusLabels[status] : "بدون صورتحساب";
}

export function getPostEventInvoiceStatusTone(status: PostEventInvoiceStatus | null | undefined) {
  if (status === "ISSUED") return "success";
  if (status === "DRAFT") return "warning";
  if (status === "CANCELLED" || status === "VOIDED") return "danger";
  return "neutral";
}
