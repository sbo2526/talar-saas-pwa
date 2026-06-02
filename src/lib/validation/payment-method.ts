import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";
import { paymentTypeValues, type PaymentTypeValue } from "@/lib/payment-method-options";

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

const optionalDigitsText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine((value) => !value || /^\d+$/.test(value), message)
    .refine((value) => !value || value.length <= max, message);

function keepField(type: PaymentTypeValue, field: string) {
  const visibleFields: Record<PaymentTypeValue, string[]> = {
    CASH: ["description"],
    CARD: ["bankName", "accountHolder", "posTerminalId", "description"],
    CARD_TO_CARD: [
      "bankName",
      "accountHolder",
      "accountNumber",
      "cardNumber",
      "description",
    ],
    BANK_TRANSFER: [
      "bankName",
      "accountHolder",
      "accountNumber",
      "iban",
      "description",
    ],
    CHECK: ["bankName", "accountHolder", "description"],
    ONLINE: ["bankName", "posTerminalId", "gatewayName", "description"],
    OTHER: ["description"],
  };

  return visibleFields[type].includes(field);
}

export const paymentMethodSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "نام روش دریافت باید حداقل ۲ کاراکتر باشد")
      .max(100, "نام روش دریافت نباید بیشتر از ۱۰۰ کاراکتر باشد"),
    code: optionalText(50, "کد داخلی روش دریافت نباید بیشتر از ۵۰ کاراکتر باشد"),
    type: z.enum(paymentTypeValues, {
      message: "نوع دریافت معتبر نیست",
    }),
    description: optionalText(1000, "توضیحات روش دریافت بیش از حد طولانی است"),
    bankName: optionalText(100, "نام بانک بیش از حد طولانی است"),
    accountHolder: optionalText(120, "نام صاحب حساب بیش از حد طولانی است"),
    accountNumber: optionalDigitsText(
      30,
      "شماره حساب باید فقط شامل ارقام معتبر باشد",
    ),
    cardNumber: z
      .unknown()
      .transform((value) => normalizeOptionalDigits(value))
      .refine(
        (value) => !value || /^\d{16}$/.test(value),
        "شماره کارت باید ۱۶ رقم باشد",
      ),
    iban: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .transform((value) =>
        value ? value.replace(/\s|-/g, "").toUpperCase() : undefined,
      )
      .refine(
        (value) => !value || /^IR\d{24}$/.test(value),
        "شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد",
      ),
    posTerminalId: optionalDigitsText(
      40,
      "شناسه کارت‌خوان باید فقط شامل ارقام معتبر باشد",
    ),
    gatewayName: optionalText(100, "نام درگاه دریافت بیش از حد طولانی است"),
    isDefault: z.boolean(),
    isActive: z.boolean(),
  })
  .transform((data) => ({
    ...data,
    code: data.code ?? null,
    description: keepField(data.type, "description") ? data.description ?? null : null,
    bankName: keepField(data.type, "bankName") ? data.bankName ?? null : null,
    accountHolder: keepField(data.type, "accountHolder")
      ? data.accountHolder ?? null
      : null,
    accountNumber: keepField(data.type, "accountNumber")
      ? data.accountNumber ?? null
      : null,
    cardNumber: keepField(data.type, "cardNumber") ? data.cardNumber ?? null : null,
    iban: keepField(data.type, "iban") ? data.iban ?? null : null,
    posTerminalId: keepField(data.type, "posTerminalId")
      ? data.posTerminalId ?? null
      : null,
    gatewayName: keepField(data.type, "gatewayName")
      ? data.gatewayName ?? null
      : null,
  }));

export const paymentMethodIdSchema = z.object({
  paymentMethodId: z.string().min(1, "شناسه روش دریافت معتبر نیست"),
});
