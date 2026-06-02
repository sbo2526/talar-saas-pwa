import { z } from "zod";
import {
  normalizeOptionalInteger,
  normalizeOptionalPercent,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

function requiredPositiveInteger(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value !== undefined && Number.isInteger(value) && value > 0,
      message,
    );
}

function optionalPercent(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalPercent(value))
    .refine(
      (value) => value === undefined || (value >= 0 && value <= 100),
      message,
    )
    .transform((value) => (value === undefined ? "0" : String(value)));
}

function optionalText(max: number, message = "متن واردشده بیش از حد طولانی است.") {
  return z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);
}

export const contractSettingSchema = z.object({
  contractPrefix: z
    .unknown()
    .transform((value) => normalizeOptionalString(value)?.toUpperCase())
    .refine((value) => Boolean(value), "پیشوند قرارداد الزامی است.")
    .refine(
      (value) => !value || value.length <= 20,
      "پیشوند قرارداد نباید بیشتر از ۲۰ کاراکتر باشد.",
    )
    .refine(
      (value) => !value || /^[A-Z0-9آ-ی_-]+$/.test(value),
      "پیشوند قرارداد فقط می‌تواند شامل حروف، عدد، خط تیره یا زیرخط باشد.",
    ),
  nextNumber: requiredPositiveInteger("شماره قرارداد بعدی معتبر نیست."),
  fiscalYear: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 30,
      "سال مالی یا دوره قرارداد بیش از حد طولانی است.",
    ),
  defaultDepositPercent: optionalPercent("درصد باید بین ۰ تا ۱۰۰ باشد."),
  defaultTaxPercent: optionalPercent("درصد باید بین ۰ تا ۱۰۰ باشد."),
  defaultDiscountPercent: optionalPercent("درصد باید بین ۰ تا ۱۰۰ باشد."),
  defaultClauses: optionalText(5000),
  paymentTerms: optionalText(3000),
  cancellationPolicy: optionalText(3000),
  footerNote: optionalText(1000),
  templateBody: optionalText(6000),
  customerSignatureLabel: z
    .string()
    .trim()
    .min(1, "عنوان امضای مشتری الزامی است.")
    .max(80, "عنوان امضای مشتری بیش از حد طولانی است."),
  managerSignatureLabel: z
    .string()
    .trim()
    .min(1, "عنوان امضای مدیر تالار الزامی است.")
    .max(80, "عنوان امضای مدیر تالار بیش از حد طولانی است."),
  printTemplateName: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 100,
      "نام قالب چاپ بیش از حد طولانی است.",
    ),
  showLogoOnPrint: z.boolean(),
  showLicenseInfoOnPrint: z.boolean(),
  requireNationalCode: z.boolean(),
  requirePhone: z.boolean(),
});
