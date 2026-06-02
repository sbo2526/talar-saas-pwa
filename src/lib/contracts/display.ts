import type { ContractLineItemType, ContractStatus, ServicePricingType } from "@prisma/client";
import { toPersianDigits } from "@/lib/date/jalali";

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

type DecimalLike = { toString(): string } | string | number | null | undefined;

type PaymentLike = {
  amount: DecimalLike;
  type?: string | null;
  status?: string | null;
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  DRAFT: "پیش‌نویس",
  RESERVED: "رزرو شده",
  CONFIRMED: "قطعی شده",
  COMPLETED: "برگزار شده",
  CANCELED: "لغو شده",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  PAID: "تسویه شده",
  PARTIAL: "دریافت ناقص",
  UNPAID: "بدون دریافت",
};

export const pricingTypeLabels: Record<ServicePricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_ITEM: "به ازای تعداد",
  PER_GUEST: "به ازای هر مهمان",
  PER_HOUR: "به ازای هر ساعت",
  CUSTOM: "توافقی / سفارشی",
};

export const lineItemTypeLabels: Record<ContractLineItemType | "OTHER", string> = {
  PACKAGE: "پکیج اختصاصی مراسم",
  SERVICE: "خدمات مراسم",
  MENU: "غذاهای اصلی",
  DRINK: "نوشیدنی‌ها",
  DESSERT: "دسرها و مخلفات",
  OTHER: "سایر",
};

export function toNumber(value: DecimalLike) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getPaidAmount(payments: PaymentLike[] | undefined, depositAmount: DecimalLike) {
  const paymentsTotal = (payments ?? []).reduce((sum, payment) => {
    if (payment.status === "CANCELED" || payment.status === "RETURNED" || payment.status === "PENDING") {
      return sum;
    }

    const amount = toNumber(payment.amount);
    return sum + (payment.type === "REFUND" ? -amount : amount);
  }, 0);

  return paymentsTotal > 0 ? paymentsTotal : toNumber(depositAmount);
}

export function getRemainingAmount(finalTotal: DecimalLike, paidAmount: number) {
  return Math.max(0, toNumber(finalTotal) - paidAmount);
}

export function getPaymentStatus(finalTotal: DecimalLike, paidAmount: number): PaymentStatus {
  const total = toNumber(finalTotal);

  if (total <= 0 || paidAmount <= 0) {
    return paidAmount > 0 && total <= 0 ? "PAID" : "UNPAID";
  }

  if (paidAmount >= total) {
    return "PAID";
  }

  return "PARTIAL";
}

export function getContractStatusStyle(status: ContractStatus) {
  const styles: Record<ContractStatus, string> = {
    DRAFT: "border-[#6b7280]/24 bg-[#f3f4f6] text-[#374151]",
    RESERVED: "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]",
    CONFIRMED: "border-[#17483f]/22 bg-[#25a46d]/10 text-[#17483f]",
    COMPLETED: "border-[#111827]/18 bg-[#111827] text-[#fff8ea]",
    CANCELED: "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]",
  };

  return styles[status];
}

export function getPaymentStatusStyle(status: PaymentStatus) {
  const styles: Record<PaymentStatus, string> = {
    PAID: "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]",
    PARTIAL: "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]",
    UNPAID: "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]",
  };

  return styles[status];
}

export function formatContractTime(value: string | null | undefined) {
  if (!value) {
    return "ثبت نشده";
  }

  const match = /^(\d{1,2}):(\d{2})/.exec(value);

  if (!match) {
    return toPersianDigits(value);
  }

  return toPersianDigits(`${match[1].padStart(2, "0")}:${match[2]}`);
}

export function formatContractTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
) {
  if (!start && !end) {
    return "ثبت نشده";
  }

  return `${formatContractTime(start)} تا ${formatContractTime(end)}`;
}

export function getLineItemGroupKey(item: {
  type: ContractLineItemType;
  category: string | null;
}) {
  if (item.type === "PACKAGE") {
    return "PACKAGE";
  }

  if (item.type === "SERVICE") {
    return "SERVICE";
  }

  if (item.category === "نوشیدنی‌ها" || item.type === "DRINK") {
    return "DRINK";
  }

  if (item.category === "دسرها و مخلفات" || item.type === "DESSERT") {
    return "DESSERT";
  }

  if (item.category === "غذاهای اصلی" || item.type === "MENU") {
    return "MENU";
  }

  return "OTHER";
}

export function getLineItemFormula(item: {
  pricingType: ServicePricingType | null;
  quantity: number;
  unitLabel: string | null;
  unitPrice: DecimalLike;
}) {
  const unitLabel = item.unitLabel || "مورد";
  const quantity = toPersianDigits(item.quantity);

  if (item.pricingType === "FIXED") {
    return "مبلغ ثابت";
  }

  if (item.pricingType === "PER_GUEST") {
    return `${quantity} مهمان × قیمت هر نفر`;
  }

  if (item.pricingType === "PER_HOUR") {
    return `${quantity} ساعت × قیمت هر ساعت`;
  }

  if (item.pricingType === "PER_ITEM") {
    return `${quantity} ${unitLabel} × قیمت واحد`;
  }

  if (item.pricingType === "CUSTOM") {
    return "مبلغ توافقی";
  }

  return `${quantity} ${unitLabel}`;
}
