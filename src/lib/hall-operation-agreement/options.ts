import { formatPersianNumber } from "@/lib/formatters";

export const operationModelValues = [
  "OWNER_DIRECT",
  "FIXED_RENT",
  "PERCENTAGE_MANAGEMENT",
  "GUARANTEED_PERCENTAGE_MANAGEMENT",
  "FIXED_RENT_PLUS_PERCENTAGE",
] as const;

export type HallOperationModelValue = (typeof operationModelValues)[number];

export const agreementStatusValues = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
export type HallOperationAgreementStatusValue = (typeof agreementStatusValues)[number];

export const settlementCycleValues = ["MONTHLY"] as const;
export type HallOperationSettlementCycleValue = (typeof settlementCycleValues)[number];

export const offInvoicePolicyValues = [
  "REPORT_ONLY",
  "OWNER_REVIEW_REQUIRED",
  "INCLUDE_WITH_EVENT_PERCENT_AFTER_OWNER_APPROVAL",
  "INCLUDE_WITH_CUSTOM_PERCENT_AFTER_OWNER_APPROVAL",
] as const;

export type HallOperationOffInvoicePolicyValue = (typeof offInvoicePolicyValues)[number];

export const operationModelLabels: Record<HallOperationModelValue, string> = {
  OWNER_DIRECT: "بهره‌برداری مستقیم توسط مالک",
  FIXED_RENT: "اجاره ثابت ماهانه",
  PERCENTAGE_MANAGEMENT: "مدیریت پیمانی درصدی",
  GUARANTEED_PERCENTAGE_MANAGEMENT: "مدیریت پیمانی درصدی با حداقل تضمین",
  FIXED_RENT_PLUS_PERCENTAGE: "اجاره ثابت به‌همراه درصد مالک",
};

export const operationModelHelp: Record<HallOperationModelValue, string> = {
  OWNER_DIRECT:
    "مالک خودش تالار را اداره می‌کند و تسویه جداگانه‌ای با بهره‌بردار تعریف نمی‌شود.",
  FIXED_RENT:
    "بهره‌بردار مبلغ ثابت ماهانه به مالک پرداخت می‌کند و درصدی از مراسم‌ها برای مالک تعریف نمی‌شود.",
  PERCENTAGE_MANAGEMENT:
    "تالار توسط بهره‌بردار اداره می‌شود و سهم مالک از مراسم‌ها و کنسلی‌ها به‌صورت درصدی تعریف می‌شود.",
  GUARANTEED_PERCENTAGE_MANAGEMENT:
    "تالار به‌صورت مدیریت پیمانی درصدی اداره می‌شود، اما حداقل مبلغ تضمین‌شده ماهانه برای مالک نیز ثبت می‌شود.",
  FIXED_RENT_PLUS_PERCENTAGE:
    "برای مالک هم اجاره ثابت ماهانه و هم درصدی از مراسم‌های برگزارشده تعریف می‌شود.",
};

export const agreementStatusLabels: Record<HallOperationAgreementStatusValue, string> = {
  ACTIVE: "فعال",
  INACTIVE: "غیرفعال",
  ARCHIVED: "بایگانی‌شده",
};

export const settlementCycleLabels: Record<HallOperationSettlementCycleValue, string> = {
  MONTHLY: "ماهانه",
};

export const offInvoicePolicyLabels: Record<HallOperationOffInvoicePolicyValue, string> = {
  REPORT_ONLY: "فقط ثبت و گزارش مدیریتی",
  OWNER_REVIEW_REQUIRED: "نیازمند بررسی مالک",
  INCLUDE_WITH_EVENT_PERCENT_AFTER_OWNER_APPROVAL:
    "پس از تأیید مالک، با درصد مراسم لحاظ شود",
  INCLUDE_WITH_CUSTOM_PERCENT_AFTER_OWNER_APPROVAL:
    "پس از تأیید مالک، با درصد اختصاصی لحاظ شود",
};

export type OperationAgreementSummaryInput = {
  operationModel: HallOperationModelValue;
  ownerEventSharePercent?: string | number | null;
  ownerCancellationSharePercent?: string | number | null;
  ownerExtraServiceSharePercent?: string | number | null;
  includeExtraServicesInOwnerShare?: boolean;
  monthlyMinimumGuaranteeAmount?: string | number | null;
  monthlyFixedRentAmount?: string | number | null;
  offInvoiceIncomePolicy?: HallOperationOffInvoicePolicyValue;
};

function percent(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatPersianNumber(value)}٪`;
}

function toman(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${formatPersianNumber(value)} تومان`;
}

export function buildOperationAgreementSummary(input: OperationAgreementSummaryInput) {
  const offInvoiceLabel = input.offInvoiceIncomePolicy
    ? offInvoicePolicyLabels[input.offInvoiceIncomePolicy]
    : offInvoicePolicyLabels.REPORT_ONLY;
  const extraServicesText = input.includeExtraServicesInOwnerShare
    ? `خدمات اضافه نیز با سهم ${percent(input.ownerExtraServiceSharePercent)} برای مالک لحاظ می‌شود.`
    : "خدمات اضافه در سهم مالک لحاظ نمی‌شود، مگر در فازهای بعدی و با تأیید جداگانه.";

  if (input.operationModel === "OWNER_DIRECT") {
    return `این تالار به‌صورت مستقیم توسط مالک اداره می‌شود. در این مدل اجاره یا سهم پیمانکار برای تسویه مالک تعریف نشده و این صفحه فقط چارچوب بهره‌برداری را نگهداری می‌کند. سیاست درآمد خارج از فاکتور: ${offInvoiceLabel}.`;
  }

  if (input.operationModel === "FIXED_RENT") {
    return `این تالار با اجاره ثابت ماهانه اداره می‌شود. مبلغ اجاره ماهانه مالک ${toman(input.monthlyFixedRentAmount)} است و در این فاز محاسبه تسویه ماهانه انجام نمی‌شود. سیاست درآمد خارج از فاکتور: ${offInvoiceLabel}.`;
  }

  if (input.operationModel === "PERCENTAGE_MANAGEMENT") {
    return `این تالار به‌صورت مدیریت پیمانی درصدی اداره می‌شود. سهم مالک از مراسم‌های برگزارشده ${percent(input.ownerEventSharePercent)} و سهم مالک از کنسلی‌ها ${percent(input.ownerCancellationSharePercent)} است. ${extraServicesText} سیاست درآمد خارج از فاکتور: ${offInvoiceLabel}.`;
  }

  if (input.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT") {
    return `این تالار به صورت مدیریت پیمانی با حداقل تضمین اداره می‌شود. سهم مالک از مراسم‌های برگزارشده ${percent(input.ownerEventSharePercent)} است، سهم مالک از کنسلی‌ها ${percent(input.ownerCancellationSharePercent)} است و حداقل تضمین ماهانه ${toman(input.monthlyMinimumGuaranteeAmount)} است. در پایان ماه، سهم قابل پرداخت مالک کمتر از حداقل تضمین نخواهد بود. ${extraServicesText} سیاست درآمد خارج از فاکتور: ${offInvoiceLabel}.`;
  }

  return `این تالار با مدل اجاره ثابت به‌همراه درصد مالک اداره می‌شود. مبلغ اجاره ماهانه ${toman(input.monthlyFixedRentAmount)} و سهم مالک از مراسم‌های برگزارشده ${percent(input.ownerEventSharePercent)} است. ${extraServicesText} سیاست درآمد خارج از فاکتور: ${offInvoiceLabel}.`;
}
