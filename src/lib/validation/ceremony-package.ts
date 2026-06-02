import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalInteger,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

function moneyOrZero(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .transform((value) => value ?? "0")
    .refine((value) => /^\d+$/.test(value) && Number(value) >= 0, message);
}

function optionalInteger(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value === undefined || Number.isInteger(value),
      message,
    );
}

function idsFromForm(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export const ceremonyPackageSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "نام پکیج باید حداقل ۲ کاراکتر باشد")
    .max(100, "نام پکیج نباید بیشتر از ۱۰۰ کاراکتر باشد"),
  code: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 50,
      "کد داخلی نباید بیشتر از ۵۰ کاراکتر باشد",
    ),
  description: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 1000,
      "توضیحات پکیج نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
    ),
  pricePerGuest: moneyOrZero("قیمت هر نفر پکیج باید عدد صحیح صفر یا مثبت باشد"),
  includedItemsNote: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 2000,
      "متن زیرمجموعه‌های پکیج نباید بیشتر از ۲۰۰۰ کاراکتر باشد",
    ),
  serviceIds: z.unknown().transform(idsFromForm),
  menuIds: z.unknown().transform(idsFromForm),
  sortOrder: optionalInteger("ترتیب نمایش باید عدد صحیح باشد"),
  allowPriceOverride: z.boolean(),
  isActive: z.boolean(),
}).superRefine((value, context) => {
  if (value.serviceIds.length === 0 && value.menuIds.length === 0 && !value.includedItemsNote) {
    context.addIssue({
      code: "custom",
      path: ["serviceIds"],
      message: "برای پکیج، حداقل یک خدمت، منو یا توضیح زیرمجموعه ثبت کنید.",
    });
  }
});

export const ceremonyPackageIdSchema = z.object({
  packageId: z.string().min(1, "شناسه پکیج معتبر نیست"),
});
