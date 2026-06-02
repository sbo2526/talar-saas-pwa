import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalInteger,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

const pricingTypes = ["FIXED", "PER_GUEST", "PER_HOUR", "PER_ITEM", "CUSTOM"] as const;
function moneyOrZero(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .transform((value) => value ?? "0")
    .refine((value) => /^\d+$/.test(value) && Number(value) >= 0, message);
}

function optionalMoney(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine(
      (value) => value === undefined || (/^\d+$/.test(value) && Number(value) >= 0),
      message,
    );
}

function optionalPositiveInteger(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      message,
    );
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

export const menuSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "نام آیتم باید حداقل ۲ کاراکتر باشد")
      .max(100, "نام آیتم نباید بیشتر از ۱۰۰ کاراکتر باشد"),
    code: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 50,
        "کد داخلی نباید بیشتر از ۵۰ کاراکتر باشد",
      ),
    category: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine((value) => Boolean(value), "دسته‌بندی آیتم الزامی است")
      .transform((value) => value as string)
      .refine(
        (value) => value.length <= 80,
        "دسته‌بندی آیتم بیش از حد طولانی است",
      ),
    pricingType: z.enum(pricingTypes, {
      message: "نوع قیمت‌گذاری معتبر نیست",
    }),
    unit: z
      .string()
      .trim()
      .min(1, "عنوان واحد الزامی است")
      .max(50, "عنوان واحد بیش از حد طولانی است"),
    pricePerGuest: moneyOrZero("قیمت واحد باید عدد صحیح صفر یا مثبت باشد"),
    basePrice: optionalMoney("مبلغ پایه باید عدد صحیح صفر یا مثبت باشد"),
    minGuests: optionalPositiveInteger("حداقل مهمان باید عدد مثبت باشد"),
    maxGuests: optionalPositiveInteger("حداکثر مهمان باید عدد مثبت باشد"),
    sortOrder: optionalInteger("ترتیب نمایش باید عدد صحیح باشد"),
    includedItems: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 2000,
        "اقلام داخل پکیج نباید بیشتر از ۲۰۰۰ کاراکتر باشد",
      ),
    description: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 1000,
        "توضیحات نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
      ),
    notes: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 1000,
        "یادداشت داخلی نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
      ),
    isRecommended: z.boolean(),
    isTaxable: z.boolean(),
    allowPriceOverride: z.boolean(),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.minGuests !== undefined &&
      value.maxGuests !== undefined &&
      value.minGuests > value.maxGuests
    ) {
      context.addIssue({
        code: "custom",
        path: ["minGuests"],
        message: "حداقل مهمان نمی‌تواند بیشتر از حداکثر مهمان باشد",
      });
    }
  });

export const quickMenuPriceSchema = z.object({
  pricePerGuest: moneyOrZero("قیمت واحد باید عدد صحیح صفر یا مثبت باشد"),
  basePrice: optionalMoney("مبلغ پایه باید عدد صحیح صفر یا مثبت باشد"),
});

export const menuIdSchema = z.object({
  menuId: z.string().min(1, "شناسه آیتم معتبر نیست"),
});
