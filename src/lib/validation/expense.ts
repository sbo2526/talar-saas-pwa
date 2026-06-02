import { z } from "zod";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import { expenseChequeStatusValues, expenseStatusValues } from "@/lib/expenses/display";
import {
  normalizeOptionalDecimal,
  normalizeOptionalString,
  toEnglishDigits,
} from "@/lib/validation/normalizers";

const cuidLike = z.string().trim().min(1, "شناسه معتبر نیست.").max(128, "شناسه معتبر نیست.");

function normalizeOptionalId(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized && normalized !== "all" ? normalized : undefined;
}

function parseAmount(value: unknown) {
  const normalized = normalizeOptionalDecimal(value);
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

function parseJalaliDateInput(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return parseDateLikeToDate(toEnglishDigits(normalized).replace(/[\/\.]/g, "-"));
}

export const expenseIdSchema = z.object({
  expenseId: cuidLike,
});

export const expenseFormSchema = z.object({
  expenseId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  title: z.preprocess(
    normalizeOptionalString,
    z
      .string({ error: "عنوان هزینه الزامی است." })
      .min(2, "عنوان هزینه الزامی است.")
      .max(160, "عنوان هزینه نباید بیشتر از ۱۶۰ کاراکتر باشد."),
  ),
  amount: z.preprocess(
    parseAmount,
    z
      .number({ error: "مبلغ هزینه الزامی است." })
      .int("مبلغ هزینه باید عدد صحیح باشد.")
      .positive("مبلغ هزینه باید بیشتر از صفر باشد."),
  ),
  occurredAt: z.preprocess(
    parseJalaliDateInput,
    z.date({ error: "تاریخ هزینه الزامی است." }),
  ),
  status: z.enum(expenseStatusValues, { error: "وضعیت هزینه معتبر نیست." }),
  financialCategoryId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  paymentMethodId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  contractId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  customerId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  hallId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  salonId: z.preprocess(normalizeOptionalId, cuidLike.optional()),
  vendorName: z.preprocess(
    normalizeOptionalString,
    z.string().max(160, "نام فروشنده بیش از حد طولانی است.").optional(),
  ),
  referenceNumber: z.preprocess(
    normalizeOptionalString,
    z.string().max(120, "شماره فاکتور یا مرجع بیش از حد طولانی است.").optional(),
  ),
  chequeNumber: z.preprocess(normalizeOptionalString, z.string().max(80, "شماره چک بیش از حد طولانی است.").optional()),
  chequeDueDate: z.preprocess(parseJalaliDateInput, z.date().nullable().optional()),
  chequeBankName: z.preprocess(normalizeOptionalString, z.string().max(80, "نام بانک بیش از حد طولانی است.").optional()),
  chequeBranchName: z.preprocess(normalizeOptionalString, z.string().max(80, "نام شعبه بیش از حد طولانی است.").optional()),
  chequeRecipientName: z.preprocess(normalizeOptionalString, z.string().max(120, "نام دریافت‌کننده چک بیش از حد طولانی است.").optional()),
  chequeAmount: z.preprocess(parseAmount, z.number().int("مبلغ چک باید عدد صحیح باشد.").positive("مبلغ چک باید بیشتر از صفر باشد.").optional().or(z.nan().transform(() => undefined))),
  chequeStatus: z.preprocess(
    normalizeOptionalString,
    z.enum(expenseChequeStatusValues, { error: "وضعیت چک معتبر نیست." }).optional(),
  ),
  note: z.preprocess(
    normalizeOptionalString,
    z.string().max(1000, "توضیحات نباید بیشتر از ۱۰۰۰ کاراکتر باشد.").optional(),
  ),
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
