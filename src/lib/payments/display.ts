import type { PaymentMethodType } from "@prisma/client";
import { toPersianDigits } from "@/lib/date/jalali";
import { formatPaymentMethodLabel as formatBasePaymentMethodLabel, paymentTypeLabels as basePaymentMethodTypeLabels } from "@/lib/payment-method-options";

export const paymentTypeValues = [
  "DEPOSIT",
  "INSTALLMENT",
  "FINAL_SETTLEMENT",
  "EXTRA_SERVICE",
  "REFUND",
  "ADJUSTMENT",
] as const;

export type PaymentTypeValue = (typeof paymentTypeValues)[number];

export const paymentStatusValues = [
  "RECORDED",
  "CONFIRMED",
  "PENDING",
  "RETURNED",
  "CANCELED",
] as const;

export type PaymentRecordStatus = (typeof paymentStatusValues)[number];

export const paymentTypeLabels: Record<PaymentTypeValue, string> = {
  DEPOSIT: "بیعانه",
  INSTALLMENT: "قسط",
  FINAL_SETTLEMENT: "تسویه نهایی",
  EXTRA_SERVICE: "خدمات اضافه",
  REFUND: "برگشت وجه",
  ADJUSTMENT: "اصلاحیه مالی",
};

export const paymentStatusRecordLabels: Record<PaymentRecordStatus, string> = {
  RECORDED: "ثبت‌شده",
  CONFIRMED: "تأییدشده",
  PENDING: "در انتظار تأیید",
  RETURNED: "برگشت‌خورده",
  CANCELED: "لغوشده",
};

export const paymentMethodTypeLabels: Record<PaymentMethodType, string> = basePaymentMethodTypeLabels;

export type PaymentMethodLabelSource = {
  title?: string | null;
  type?: PaymentMethodType | null;
};

export function formatPaymentMethodLabel(method: PaymentMethodLabelSource | null | undefined) {
  return formatBasePaymentMethodLabel(method);
}

export type PaymentAmountLike = {
  amount: { toString(): string } | string | number | null | undefined;
  type?: string | null;
  status?: string | null;
};

type DecimalLike = { toString(): string } | string | number | null | undefined;

export function toNumber(value: DecimalLike) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isPaymentType(value: string | null | undefined): value is PaymentTypeValue {
  return paymentTypeValues.includes(value as PaymentTypeValue);
}

export function isPaymentRecordStatus(value: string | null | undefined): value is PaymentRecordStatus {
  return paymentStatusValues.includes(value as PaymentRecordStatus);
}

export function getPaymentTypeLabel(value: string | null | undefined) {
  return isPaymentType(value) ? paymentTypeLabels[value] : "دریافت";
}

export function getPaymentRecordStatusLabel(value: string | null | undefined) {
  return isPaymentRecordStatus(value)
    ? paymentStatusRecordLabels[value]
    : "ثبت‌شده";
}

export function getPaymentTypeStyle(value: string | null | undefined) {
  if (value === "REFUND") {
    return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  }

  if (value === "FINAL_SETTLEMENT") {
    return "border-[#17483f]/22 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (value === "DEPOSIT") {
    return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
  }

  return "border-[#111827]/14 bg-[#111827]/7 text-[#172033]";
}

export function getPaymentRecordStatusStyle(value: string | null | undefined) {
  if (value === "CONFIRMED" || value === "RECORDED") {
    return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (value === "PENDING") {
    return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
  }

  if (value === "RETURNED" || value === "CANCELED") {
    return "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]";
  }

  return "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]";
}

export function getEffectivePaymentAmount(payment: PaymentAmountLike) {
  const amount = toNumber(payment.amount);
  const status = payment.status ?? "RECORDED";

  if (status === "CANCELED" || status === "RETURNED" || status === "PENDING") {
    return 0;
  }

  if (payment.type === "REFUND") {
    return -amount;
  }

  return amount;
}

export function getEffectivePaidAmount(payments: PaymentAmountLike[] | undefined) {
  return (payments ?? []).reduce(
    (sum, payment) => sum + getEffectivePaymentAmount(payment),
    0,
  );
}

export function getContractPaidAmount(
  payments: PaymentAmountLike[] | undefined,
  depositAmount?: DecimalLike,
) {
  const effectivePayments = getEffectivePaidAmount(payments);
  return effectivePayments > 0 ? effectivePayments : toNumber(depositAmount);
}

export function getContractRemainingAmount(finalTotal: DecimalLike, paidAmount: number) {
  return Math.max(0, toNumber(finalTotal) - paidAmount);
}

export function getPaymentStatusSummary(finalTotal: DecimalLike, paidAmount: number) {
  const total = toNumber(finalTotal);

  if (total <= 0 || paidAmount <= 0) {
    return paidAmount > 0 && total <= 0 ? "PAID" : "UNPAID";
  }

  if (paidAmount >= total) {
    return "PAID";
  }

  return "PARTIAL";
}

export function formatReference(payment: {
  referenceNumber?: string | null;
  trackingCode?: string | null;
  chequeNumber?: string | null;
  reference?: string | null;
}) {
  const value = payment.trackingCode || payment.referenceNumber || payment.chequeNumber || payment.reference;
  return value ? toPersianDigits(value) : "ثبت نشده";
}
