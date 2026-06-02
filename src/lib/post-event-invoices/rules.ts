import { getEffectivePaidAmount, toNumber } from "@/lib/payments/display";

export const countablePostEventPaymentStatuses = ["RECORDED", "CONFIRMED"] as const;

export type InvoiceCalculationInput = {
  contractFinalAmountSnapshot: number;
  contractGuestCountSnapshot: number;
  finalPerGuestAmount: number;
  actualGuestCount: number;
  extraServiceAmount: number;
  managerApprovedDeductionAmount?: number;
  previousPaymentsAmount: number;
};

export function calculateSuggestedPerGuestAmount(input: {
  contractFinalAmountSnapshot: number;
  contractGuestCountSnapshot: number;
}) {
  if (input.contractGuestCountSnapshot <= 0) return 0;
  return Math.round(input.contractFinalAmountSnapshot / input.contractGuestCountSnapshot);
}

export function validatePostEventInvoiceBase(input: {
  contractFinalAmountSnapshot: number;
  contractGuestCountSnapshot: number;
}) {
  if (!Number.isFinite(input.contractGuestCountSnapshot) || input.contractGuestCountSnapshot <= 0) {
    return "تعداد نفرات قرارداد برای صدور صورتحساب معتبر نیست.";
  }

  if (!Number.isFinite(input.contractFinalAmountSnapshot) || input.contractFinalAmountSnapshot < 0) {
    return "مبلغ نهایی قرارداد برای صدور صورتحساب معتبر نیست.";
  }

  return null;
}

export function calculatePostEventInvoiceTotals(input: InvoiceCalculationInput) {
  const extraGuestCount = Math.max(0, input.actualGuestCount - input.contractGuestCountSnapshot);
  const extraGuestAmount = extraGuestCount * input.finalPerGuestAmount;
  const managerApprovedDeductionAmount = Math.max(0, input.managerApprovedDeductionAmount ?? 0);
  const invoiceTotalAmount =
    input.contractFinalAmountSnapshot +
    extraGuestAmount +
    input.extraServiceAmount -
    managerApprovedDeductionAmount;

  return {
    extraGuestCount,
    extraGuestAmount,
    extraServiceAmount: input.extraServiceAmount,
    managerApprovedDeductionAmount,
    invoiceTotalAmount,
    finalBalanceAmount: invoiceTotalAmount - input.previousPaymentsAmount,
  };
}

export function getPreviousPaymentsAmount(payments: Array<{ amount: unknown; type?: string | null; status?: string | null }>) {
  const countablePayments = payments.filter((payment) =>
    countablePostEventPaymentStatuses.includes((payment.status ?? "RECORDED") as (typeof countablePostEventPaymentStatuses)[number]),
  );

  return getEffectivePaidAmount(
    countablePayments.map((payment) => ({
      amount: toNumber(payment.amount as { toString(): string }),
      type: payment.type,
      status: payment.status,
    })),
  );
}

export function parsePositiveMoney(value: FormDataEntryValue | null) {
  const amount = Number(String(value ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }).replace(/,/g, "").trim());

  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function parsePositiveQuantity(value: FormDataEntryValue | null) {
  const quantity = Number(String(value ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }).replace(/,/g, "").trim());

  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

export function parseNonNegativeInt(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    if (persian >= 0) return String(persian);
    const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
    return arabic >= 0 ? String(arabic) : digit;
  }).replace(/,/g, "").trim();
  const parsed = Number(normalized);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
