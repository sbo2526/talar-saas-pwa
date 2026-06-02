import type { HallOperationAgreement, HallOperationModel, OwnerMonthlySettlementStatus } from "@prisma/client";

export type SettlementSourceTotals = {
  eventInvoiceBaseAmount: number;
  cancellationBaseAmount: number;
  extraServiceBaseAmount: number;
  approvedOffInvoiceBaseAmount: number;
};

export type SettlementPercentSnapshots = {
  ownerEventSharePercent: number;
  ownerCancellationSharePercent: number;
  ownerExtraServiceSharePercent: number;
  monthlyMinimumGuaranteeAmount: number;
  monthlyFixedRentAmount: number;
  includeExtraServicesInOwnerShare: boolean;
};

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && "toString" in value) return Number(String(value)) || 0;
  return 0;
}

export function getSettlementPeriod(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("سال تسویه معتبر نیست.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("ماه تسویه معتبر نیست.");
  }

  const settlementPeriodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const settlementPeriodEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  return { settlementPeriodStart, settlementPeriodEnd };
}

export function parseSettlementYearMonth(yearValue: FormDataEntryValue | null, monthValue: FormDataEntryValue | null) {
  const year = Number(String(yearValue ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }));
  const month = Number(String(monthValue ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }));

  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  try {
    return { year, month, ...getSettlementPeriod(year, month) };
  } catch {
    return null;
  }
}

export function getAgreementPercentSnapshots(agreement: Pick<HallOperationAgreement,
  | "ownerEventSharePercent"
  | "ownerCancellationSharePercent"
  | "ownerExtraServiceSharePercent"
  | "monthlyMinimumGuaranteeAmount"
  | "monthlyFixedRentAmount"
  | "includeExtraServicesInOwnerShare"
>) {
  return {
    ownerEventSharePercent: toNumber(agreement.ownerEventSharePercent),
    ownerCancellationSharePercent: toNumber(agreement.ownerCancellationSharePercent),
    ownerExtraServiceSharePercent: toNumber(agreement.ownerExtraServiceSharePercent),
    monthlyMinimumGuaranteeAmount: toNumber(agreement.monthlyMinimumGuaranteeAmount),
    monthlyFixedRentAmount: toNumber(agreement.monthlyFixedRentAmount),
    includeExtraServicesInOwnerShare: agreement.includeExtraServicesInOwnerShare,
  } satisfies SettlementPercentSnapshots;
}

function share(base: number, percent: number) {
  return Math.round((Math.max(0, base) * Math.max(0, percent)) / 100);
}

export function calculateOwnerSettlementTotals(input: {
  operationModel: HallOperationModel;
  sourceTotals: SettlementSourceTotals;
  snapshots: SettlementPercentSnapshots;
  paidToOwnerAmount?: number;
}) {
  const eventInvoiceOwnerShareAmount =
    input.operationModel === "FIXED_RENT" || input.operationModel === "OWNER_DIRECT"
      ? 0
      : share(input.sourceTotals.eventInvoiceBaseAmount, input.snapshots.ownerEventSharePercent);

  const cancellationOwnerShareAmount =
    input.operationModel === "FIXED_RENT" || input.operationModel === "OWNER_DIRECT"
      ? 0
      : share(input.sourceTotals.cancellationBaseAmount, input.snapshots.ownerCancellationSharePercent);

  const extraServiceOwnerShareAmount =
    input.snapshots.includeExtraServicesInOwnerShare && input.operationModel !== "FIXED_RENT" && input.operationModel !== "OWNER_DIRECT"
      ? share(input.sourceTotals.extraServiceBaseAmount, input.snapshots.ownerExtraServiceSharePercent)
      : 0;

  const approvedOffInvoiceOwnerShareAmount =
    input.operationModel === "FIXED_RENT" || input.operationModel === "OWNER_DIRECT"
      ? 0
      : share(input.sourceTotals.approvedOffInvoiceBaseAmount, input.snapshots.ownerEventSharePercent);

  const calculatedOwnerShareAmount =
    eventInvoiceOwnerShareAmount +
    cancellationOwnerShareAmount +
    extraServiceOwnerShareAmount +
    approvedOffInvoiceOwnerShareAmount;

  const fixedRentAmount =
    input.operationModel === "FIXED_RENT" || input.operationModel === "FIXED_RENT_PLUS_PERCENTAGE"
      ? input.snapshots.monthlyFixedRentAmount
      : 0;

  const guaranteeShortfallAmount =
    input.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT"
      ? Math.max(0, input.snapshots.monthlyMinimumGuaranteeAmount - calculatedOwnerShareAmount)
      : 0;

  let finalPayableToOwnerAmount = calculatedOwnerShareAmount;

  if (input.operationModel === "OWNER_DIRECT") {
    finalPayableToOwnerAmount = 0;
  } else if (input.operationModel === "FIXED_RENT") {
    finalPayableToOwnerAmount = fixedRentAmount;
  } else if (input.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT") {
    finalPayableToOwnerAmount = Math.max(calculatedOwnerShareAmount, input.snapshots.monthlyMinimumGuaranteeAmount);
  } else if (input.operationModel === "FIXED_RENT_PLUS_PERCENTAGE") {
    finalPayableToOwnerAmount = fixedRentAmount + calculatedOwnerShareAmount;
  }

  const paidToOwnerAmount = Math.max(0, input.paidToOwnerAmount ?? 0);

  return {
    eventInvoiceOwnerShareAmount,
    cancellationOwnerShareAmount,
    extraServiceOwnerShareAmount,
    approvedOffInvoiceOwnerShareAmount,
    calculatedOwnerShareAmount,
    guaranteeShortfallAmount,
    fixedRentAmount,
    finalPayableToOwnerAmount,
    paidToOwnerAmount,
    remainingPayableAmount: finalPayableToOwnerAmount - paidToOwnerAmount,
  };
}

export function getPaymentAwareStatus(input: {
  currentStatus?: OwnerMonthlySettlementStatus | null;
  finalPayableToOwnerAmount: number;
  paidToOwnerAmount: number;
}) {
  if (input.currentStatus === "LOCKED" || input.currentStatus === "CANCELLED") {
    return input.currentStatus;
  }

  if (input.finalPayableToOwnerAmount <= 0) return "CALCULATED";
  if (input.paidToOwnerAmount <= 0) return "PAYMENT_PENDING";
  if (input.paidToOwnerAmount >= input.finalPayableToOwnerAmount) return "PAID";
  return "PARTIALLY_PAID";
}

export function parsePositivePaymentAmount(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }).replace(/,/g, "").trim();
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
