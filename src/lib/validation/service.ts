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

function optionalInteger(message: string) {
  return z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value === undefined || Number.isInteger(value),
      message,
    );
}

export const serviceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "نام خدمت باید حداقل ۲ کاراکتر باشد")
    .max(100, "نام خدمت نباید بیشتر از ۱۰۰ کاراکتر باشد"),
  code: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 50,
      "کد داخلی خدمت نباید بیشتر از ۵۰ کاراکتر باشد",
    ),
  category: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => Boolean(value), "دسته‌بندی خدمت الزامی است")
    .transform((value) => value as string)
    .refine(
      (value) => value.length <= 80,
      "دسته‌بندی خدمت بیش از حد طولانی است",
    ),
  pricingType: z.enum(pricingTypes, {
    message: "نوع قیمت‌گذاری خدمت معتبر نیست",
  }),
  unit: z
    .string()
    .trim()
    .min(1, "عنوان واحد خدمت الزامی است")
    .max(50, "عنوان واحد خدمت بیش از حد طولانی است"),
  price: moneyOrZero("قیمت واحد باید عدد صحیح صفر یا مثبت باشد"),
  basePrice: optionalMoney("مبلغ پایه باید عدد صحیح صفر یا مثبت باشد"),
  sortOrder: optionalInteger("ترتیب نمایش باید عدد صحیح باشد"),
  description: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 1000,
      "توضیحات خدمت نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
    ),
  notes: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 1000,
      "یادداشت داخلی خدمت نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
    ),
  isRequired: z.boolean(),
  allowPriceOverride: z.boolean(),
  isActive: z.boolean(),
});

export const quickServicePriceSchema = z.object({
  price: moneyOrZero("قیمت واحد باید عدد صحیح صفر یا مثبت باشد"),
  basePrice: optionalMoney("مبلغ پایه باید عدد صحیح صفر یا مثبت باشد"),
});

export const serviceIdSchema = z.object({
  serviceId: z.string().min(1, "شناسه خدمت معتبر نیست"),
});
