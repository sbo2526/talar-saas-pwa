import { z } from "zod";
import {
  normalizeOptionalDecimal,
  normalizeOptionalString,
  toEnglishDigits,
} from "@/lib/validation/normalizers";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import {
  paymentStatusValues,
  paymentTypeValues,
} from "@/lib/payments/display";

const cuidLike = z
  .string()
  .trim()
  .min(1, "شناسه معتبر نیست.")
  .max(128, "شناسه معتبر نیست.");

const installmentStatusValues = ["PENDING", "PAID", "OVERDUE", "CANCELED"] as const;
const chequeStatusValues = ["PENDING", "CLEARED", "BOUNCED", "CANCELED", "TRANSFERRED"] as const;

function normalizeOptionalId(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized !== "all" ? normalized : undefined;
}

function parseAmount(value: unknown) {
  const normalized = normalizeOptionalDecimal(value);
  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
}

function parseOptionalAmount(value: unknown) {
  const normalized = normalizeOptionalDecimal(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalInteger(value: unknown) {
  const normalized = normalizeOptionalDecimal(value);
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function parseJalaliDateInput(value: unknown) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return null;
  }

  return parseDateLikeToDate(toEnglishDigits(normalized).replace(/[\/\.]/g, "-"));
}

const installmentScheduleSchema = z.object({
  amount: z.preprocess(
    parseAmount,
    z
      .number({ error: "مبلغ قسط معتبر نیست." })
      .int("مبلغ قسط باید عدد صحیح باشد.")
      .positive("مبلغ قسط باید بیشتر از صفر باشد."),
  ),
  dueDate: z.preprocess(
    parseJalaliDateInput,
    z.date({ error: "تاریخ سررسید قسط معتبر نیست." }),
  ),
  status: z.enum(installmentStatusValues, { error: "وضعیت قسط معتبر نیست." }).default("PENDING"),
  notes: z.preprocess(
    normalizeOptionalString,
    z.string().max(500, "توضیحات قسط نباید بیشتر از ۵۰۰ کاراکتر باشد.").optional(),
  ),
});

export const paymentIdSchema = z.object({
  paymentId: cuidLike,
});

export const paymentFormSchema = z
  .object({
    paymentId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
    contractId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
    customerId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
    paymentMethodId: z.preprocess(
      normalizeOptionalId,
      z.string({ error: "روش دریافت را انتخاب کنید." }).trim().min(1, "روش دریافت را انتخاب کنید.").max(128, "روش دریافت انتخاب‌شده معتبر نیست."),
    ),
    type: z.enum(paymentTypeValues, {
      error: "نوع دریافت معتبر نیست.",
    }),
    status: z.enum(paymentStatusValues, {
      error: "وضعیت دریافت معتبر نیست.",
    }),
    amount: z.preprocess(
      parseAmount,
      z
        .number({ error: "مبلغ دریافتی الزامی است." })
        .int("مبلغ دریافتی باید عدد صحیح باشد.")
        .positive("مبلغ دریافتی باید بیشتر از صفر باشد."),
    ),
    finalSettlement: z.preprocess(
      (value) => value === "on" || value === "true" || value === true,
      z.boolean().default(false),
    ),
    paidAt: z.preprocess(
      parseJalaliDateInput,
      z.date({ error: "تاریخ دریافت الزامی است." }),
    ),
    referenceNumber: z.preprocess(
      normalizeOptionalString,
      z.string().max(80, "مرجع دریافت بیش از حد طولانی است.").optional(),
    ),
    trackingCode: z.preprocess(
      normalizeOptionalString,
      z.string().max(80, "کد پیگیری بیش از حد طولانی است.").optional(),
    ),
    chequeNumber: z.preprocess(
      normalizeOptionalString,
      z.string().max(80, "شماره چک بیش از حد طولانی است.").optional(),
    ),
    chequeDueDate: z.preprocess(
      parseJalaliDateInput,
      z.date().nullable().optional(),
    ),
    chequeBankName: z.preprocess(normalizeOptionalString, z.string().max(80, "نام بانک بیش از حد طولانی است.").optional()),
    chequeBranchName: z.preprocess(normalizeOptionalString, z.string().max(80, "نام شعبه بیش از حد طولانی است.").optional()),
    chequeOwnerName: z.preprocess(normalizeOptionalString, z.string().max(120, "نام صاحب چک بیش از حد طولانی است.").optional()),
    chequeAmount: z.preprocess(
      parseOptionalAmount,
      z.number().int("مبلغ چک باید عدد صحیح باشد.").positive("مبلغ چک باید بیشتر از صفر باشد.").optional(),
    ),
    chequeStatus: z.preprocess(
      normalizeOptionalString,
      z.enum(chequeStatusValues, { error: "وضعیت چک معتبر نیست." }).optional(),
    ),
    installmentCount: z.preprocess(
      parseOptionalInteger,
      z.number().int("تعداد اقساط معتبر نیست.").min(1, "تعداد اقساط باید بیشتر از صفر باشد.").max(60, "تعداد اقساط بیش از حد مجاز است.").optional(),
    ),
    installmentTotalAmount: z.preprocess(
      parseOptionalAmount,
      z.number().int("مبلغ کل اقساط باید عدد صحیح باشد.").positive("مبلغ کل اقساط باید بیشتر از صفر باشد.").optional(),
    ),
    installmentStartDate: z.preprocess(parseJalaliDateInput, z.date().nullable().optional()),
    installmentIntervalDays: z.preprocess(
      (value) => parseOptionalInteger(value) ?? 30,
      z.number().int("فاصله اقساط معتبر نیست.").min(1, "فاصله اقساط معتبر نیست.").max(365, "فاصله اقساط بیش از حد مجاز است.").default(30),
    ),
    installments: z.array(installmentScheduleSchema).optional(),
    note: z.preprocess(
      normalizeOptionalString,
      z.string().max(1000, "توضیحات نباید بیشتر از ۱۰۰۰ کاراکتر باشد.").optional(),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.type === "INSTALLMENT") {
      if (!value.installmentCount || !value.installmentStartDate) {
        ctx.addIssue({ code: "custom", path: ["installmentCount"], message: "برای دریافت اقساطی، تعداد و تاریخ شروع اقساط را وارد کنید." });
      }

      if (!value.installments?.length) {
        ctx.addIssue({ code: "custom", path: ["installments"], message: "برنامه اقساط را کامل کنید." });
      }

      if (value.installmentCount && value.installments?.length && value.installments.length !== value.installmentCount) {
        ctx.addIssue({ code: "custom", path: ["installments"], message: "تعداد ردیف‌های برنامه اقساط با تعداد اقساط برابر نیست." });
      }

      const scheduleTotal = value.installments?.reduce((sum, item) => sum + item.amount, 0) ?? 0;
      const expectedTotal = value.installmentTotalAmount ?? value.amount;
      if (value.installments?.length && scheduleTotal !== expectedTotal) {
        ctx.addIssue({ code: "custom", path: ["installments"], message: "مجموع اقساط با مبلغ تعریف‌شده برابر نیست." });
      }

      if (expectedTotal !== value.amount) {
        ctx.addIssue({ code: "custom", path: ["installmentTotalAmount"], message: "مبلغ کل اقساط باید با مبلغ دریافتی برابر باشد." });
      }
    }

    if (!value.contractId && !value.customerId) {
      ctx.addIssue({
        code: "custom",
        path: ["contractId"],
        message: "قرارداد یا مشتری را انتخاب کنید.",
      });
    }
  });

export type PaymentFormInput = z.infer<typeof paymentFormSchema>;
