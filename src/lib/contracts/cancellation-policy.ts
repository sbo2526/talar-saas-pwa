import { toPersianDigits } from "@/lib/date/jalali";

export type ContractCancellationTier = {
  maxDays: number;
  penaltyPercent: number;
  label: string;
};

export type ContractCancellationEstimate = {
  daysUntilEvent: number;
  penaltyPercent: number;
  penaltyAmount: number;
  depositAmount: number;
  refundFromDeposit: number;
  extraDueAmount: number;
  tierLabel: string;
  isPenaltyActive: boolean;
  isPastEvent: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const contractCancellationPolicyTiers: ContractCancellationTier[] = [
  { maxDays: 10, penaltyPercent: 45, label: "تا ۱۰ روز مانده به مراسم" },
  { maxDays: 15, penaltyPercent: 35, label: "تا ۱۵ روز مانده به مراسم" },
  { maxDays: 20, penaltyPercent: 25, label: "تا ۲۰ روز مانده به مراسم" },
  { maxDays: 30, penaltyPercent: 10, label: "تا ۳۰ روز مانده به مراسم" },
];

export const contractCancellationPolicyText =
  "در صورت کنسلی قرارداد، اگر تا ۳۰ روز مانده به تاریخ مراسم اعلام شود، ۱۰٪ از مبلغ کل قرارداد به عنوان خسارت از مبلغ بیعانه کسر می‌گردد؛ اگر تا ۲۰ روز مانده اعلام شود، ۲۵٪؛ اگر تا ۱۵ روز مانده اعلام شود، ۳۵٪؛ و اگر تا ۱۰ روز مانده یا کمتر اعلام شود، ۴۵٪ از مبلغ کل قرارداد به عنوان خسارت از مبلغ بیعانه کسر می‌گردد. اگر مبلغ خسارت از بیعانه بیشتر باشد، اختلاف آن به عنوان مانده قابل پیگیری ثبت و تسویه خواهد شد.";

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getCancellationTier(daysUntilEvent: number) {
  if (daysUntilEvent < 0) {
    return contractCancellationPolicyTiers[0];
  }

  return contractCancellationPolicyTiers.find((tier) => daysUntilEvent <= tier.maxDays) ?? null;
}

export function calculateContractCancellationEstimate(input: {
  eventDate: Date;
  finalTotal: number;
  depositAmount: number;
  now?: Date;
}): ContractCancellationEstimate {
  const now = input.now ?? new Date();
  const daysUntilEvent = Math.ceil((startOfUtcDay(input.eventDate) - startOfUtcDay(now)) / MS_PER_DAY);
  const tier = getCancellationTier(daysUntilEvent);
  const penaltyPercent = tier?.penaltyPercent ?? 0;
  const penaltyAmount = Math.round((Math.max(0, input.finalTotal) * penaltyPercent) / 100);
  const depositAmount = Math.max(0, input.depositAmount);
  const refundFromDeposit = Math.max(0, depositAmount - penaltyAmount);
  const extraDueAmount = Math.max(0, penaltyAmount - depositAmount);

  return {
    daysUntilEvent,
    penaltyPercent,
    penaltyAmount,
    depositAmount,
    refundFromDeposit,
    extraDueAmount,
    tierLabel: tier?.label ?? "بیشتر از ۳۰ روز مانده به مراسم",
    isPenaltyActive: Boolean(tier),
    isPastEvent: daysUntilEvent < 0,
  };
}

export function formatCancellationDaysLabel(daysUntilEvent: number) {
  if (daysUntilEvent < 0) {
    return "تاریخ مراسم گذشته است";
  }

  if (daysUntilEvent === 0) {
    return "امروز روز مراسم است";
  }

  return `${toPersianDigits(daysUntilEvent)} روز مانده به مراسم`;
}
