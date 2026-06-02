import type { InvoiceAdjustmentStatus, InvoiceLineSourceType, InvoiceStatus } from "@prisma/client";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  DRAFT: "پیش‌نویس",
  ISSUED: "صادر شده",
  SENT: "ارسال شده",
  DISPUTED: "دارای اعتراض",
  ACCEPTED: "تأیید مشتری",
  SETTLED: "تسویه شده",
  CANCELED: "باطل شده",
};

export const invoiceLineSourceLabels: Record<InvoiceLineSourceType, string> = {
  CONTRACT_LINE: "ردیف قرارداد",
  EXTRA_GUEST: "نفرات اضافه",
  EXTRA_SERVICE: "خدمات اضافه",
  DAMAGE: "خسارت / مصرف اضافه",
  TIME_EXTENSION: "تمدید زمان",
  OWNER_ADJUSTMENT: "اصلاح مالک",
};

export function getInvoiceStatusStyle(status: InvoiceStatus) {
  const styles: Record<InvoiceStatus, string> = {
    DRAFT: "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]",
    ISSUED: "border-[#17483f]/22 bg-[#25a46d]/10 text-[#17483f]",
    SENT: "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7a4a12]",
    DISPUTED: "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]",
    ACCEPTED: "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]",
    SETTLED: "border-[#111827]/18 bg-[#111827] text-[#fff8ea]",
    CANCELED: "border-[#b45353]/18 bg-[#f8e7e7] text-[#8f2c2c]",
  };

  return styles[status];
}

export const invoiceAdjustmentStatusLabels: Record<InvoiceAdjustmentStatus, string> = {
  PENDING: "در انتظار تأیید مالک",
  APPLIED: "اعمال‌شده",
  REJECTED: "رد شده",
};

export function getInvoiceAdjustmentStatusStyle(status: InvoiceAdjustmentStatus) {
  const styles: Record<InvoiceAdjustmentStatus, string> = {
    PENDING: "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]",
    APPLIED: "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]",
    REJECTED: "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]",
  };

  return styles[status];
}
