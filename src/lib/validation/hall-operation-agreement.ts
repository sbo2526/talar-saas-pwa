import { z } from "zod";
import {
  agreementStatusValues,
  offInvoicePolicyValues,
  operationModelValues,
  settlementCycleValues,
} from "@/lib/hall-operation-agreement/options";
import {
  normalizeOptionalDate,
  normalizeOptionalDecimal,
  normalizeOptionalInteger,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

function optionalText(max: number, message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);
}

function optionalId(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= 140, message);
}

function requiredText(max: number, requiredMessage: string, maxMessage: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => Boolean(value), requiredMessage)
    .refine((value) => !value || value.length <= max, maxMessage);
}

function optionalPercent() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDecimal(value))
    .refine(
      (value) => value === undefined || /^\d+(\.\d{1,2})?$/.test(value),
      "درصد باید عددی معتبر باشد.",
    )
    .refine(
      (value) => value === undefined || (Number(value) >= 0 && Number(value) <= 100),
      "درصد باید بین ۰ تا ۱۰۰ باشد.",
    );
}

function optionalMoney() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDecimal(value))
    .refine(
      (value) => value === undefined || /^\d+(\.\d{1,2})?$/.test(value),
      "مبلغ باید عددی معتبر باشد.",
    )
    .refine(
      (value) => value === undefined || Number(value) >= 0,
      "مبلغ باید صفر یا مثبت باشد.",
    );
}

function requiredDate() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDate(value))
    .refine((value) => value !== undefined && value !== null, "تاریخ شروع اعتبار الزامی است.");
}

function optionalDate(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDate(value))
    .refine((value) => value !== null, message);
}

function optionalSettlementDay() {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 31),
      "روز تسویه باید بین ۱ تا ۳۱ باشد.",
    );
}

export const hallOperationAgreementSchema = z
  .object({
    agreementId: optionalId("شناسه توافق معتبر نیست."),
    hallId: optionalId("شناسه تالار معتبر نیست."),
    operationModel: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value): value is (typeof operationModelValues)[number] =>
          Boolean(value) && operationModelValues.includes(value as (typeof operationModelValues)[number]),
        "مدل بهره‌برداری الزامی است.",
      ),
    ownerName: requiredText(
      140,
      "نام مالک الزامی است.",
      "نام مالک نباید بیشتر از ۱۴۰ کاراکتر باشد.",
    ),
    operatorName: optionalText(140, "نام بهره‌بردار نباید بیشتر از ۱۴۰ کاراکتر باشد."),
    agreementTitle: optionalText(180, "عنوان توافق نباید بیشتر از ۱۸۰ کاراکتر باشد."),
    effectiveFrom: requiredDate(),
    effectiveTo: optionalDate("تاریخ پایان اعتبار معتبر نیست."),
    status: z
      .unknown()
      .transform((value) => normalizeOptionalString(value) ?? "ACTIVE")
      .refine(
        (value): value is (typeof agreementStatusValues)[number] =>
          agreementStatusValues.includes(value as (typeof agreementStatusValues)[number]),
        "وضعیت توافق معتبر نیست.",
      ),
    ownerEventSharePercent: optionalPercent(),
    ownerCancellationSharePercent: optionalPercent(),
    ownerExtraServiceSharePercent: optionalPercent(),
    includeExtraServicesInOwnerShare: z.boolean(),
    monthlyMinimumGuaranteeAmount: optionalMoney(),
    monthlyFixedRentAmount: optionalMoney(),
    settlementCycle: z
      .unknown()
      .transform((value) => normalizeOptionalString(value) ?? "MONTHLY")
      .refine(
        (value): value is (typeof settlementCycleValues)[number] =>
          settlementCycleValues.includes(value as (typeof settlementCycleValues)[number]),
        "دوره تسویه معتبر نیست.",
      ),
    settlementDayOfMonth: optionalSettlementDay(),
    offInvoiceIncomePolicy: z
      .unknown()
      .transform((value) => normalizeOptionalString(value) ?? "REPORT_ONLY")
      .refine(
        (value): value is (typeof offInvoicePolicyValues)[number] =>
          offInvoicePolicyValues.includes(value as (typeof offInvoicePolicyValues)[number]),
        "سیاست درآمد خارج از فاکتور معتبر نیست.",
      ),
    notes: optionalText(1500, "یادداشت نباید بیشتر از ۱۵۰۰ کاراکتر باشد."),
  })
  .superRefine((value, context) => {
    const rentOrManagementModels = [
      "FIXED_RENT",
      "PERCENTAGE_MANAGEMENT",
      "GUARANTEED_PERCENTAGE_MANAGEMENT",
      "FIXED_RENT_PLUS_PERCENTAGE",
    ];

    if (rentOrManagementModels.includes(value.operationModel) && !value.operatorName) {
      context.addIssue({
        code: "custom",
        path: ["operatorName"],
        message: "نام بهره‌بردار برای مدل‌های اجاره‌ای یا پیمانی الزامی است.",
      });
    }

    if (value.operationModel === "FIXED_RENT") {
      requirePositiveMoney(value.monthlyFixedRentAmount, context, "monthlyFixedRentAmount", "مبلغ اجاره ماهانه برای مدل اجاره ثابت الزامی و باید بیشتر از صفر باشد.");
    }

    if (value.operationModel === "PERCENTAGE_MANAGEMENT") {
      requirePercent(value.ownerEventSharePercent, context, "ownerEventSharePercent", "سهم مالک از مراسم برای مدل پیمانی درصدی الزامی است.");
      requirePercent(value.ownerCancellationSharePercent, context, "ownerCancellationSharePercent", "سهم مالک از کنسلی برای مدل پیمانی درصدی الزامی است.");
    }

    if (value.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT") {
      requirePercent(value.ownerEventSharePercent, context, "ownerEventSharePercent", "سهم مالک از مراسم برای مدل حداقل تضمین الزامی است.");
      requirePercent(value.ownerCancellationSharePercent, context, "ownerCancellationSharePercent", "سهم مالک از کنسلی برای مدل حداقل تضمین الزامی است.");
      requirePositiveMoney(value.monthlyMinimumGuaranteeAmount, context, "monthlyMinimumGuaranteeAmount", "حداقل تضمین ماهانه الزامی و باید بیشتر از صفر باشد.");
    }

    if (value.operationModel === "FIXED_RENT_PLUS_PERCENTAGE") {
      requirePositiveMoney(value.monthlyFixedRentAmount, context, "monthlyFixedRentAmount", "مبلغ اجاره ماهانه برای مدل اجاره به‌همراه درصد الزامی و باید بیشتر از صفر باشد.");
      requirePercent(value.ownerEventSharePercent, context, "ownerEventSharePercent", "سهم مالک از مراسم برای مدل اجاره به‌همراه درصد الزامی است.");
    }

    if (value.includeExtraServicesInOwnerShare) {
      requirePercent(value.ownerExtraServiceSharePercent, context, "ownerExtraServiceSharePercent", "وقتی خدمات اضافه در سهم مالک لحاظ می‌شود، درصد خدمات اضافه الزامی است.");
    }

    if (value.effectiveTo && value.effectiveFrom && value.effectiveTo < value.effectiveFrom) {
      context.addIssue({
        code: "custom",
        path: ["effectiveTo"],
        message: "تاریخ پایان اعتبار نباید قبل از تاریخ شروع باشد.",
      });
    }
  });

function requirePercent(
  value: string | undefined,
  context: z.RefinementCtx,
  path: string,
  message: string,
) {
  if (value === undefined || value === "") {
    context.addIssue({ code: "custom", path: [path], message });
  }
}

function requirePositiveMoney(
  value: string | undefined,
  context: z.RefinementCtx,
  path: string,
  message: string,
) {
  if (value === undefined || Number(value) <= 0) {
    context.addIssue({ code: "custom", path: [path], message });
  }
}

export type HallOperationAgreementInput = z.infer<typeof hallOperationAgreementSchema>;
