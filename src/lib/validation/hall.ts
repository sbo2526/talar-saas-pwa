import { z } from "zod";
import {
  normalizeOptionalInteger,
  normalizeOptionalPhone,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

export const hallSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "نام تالار باید حداقل ۲ کاراکتر باشد")
    .max(100, "نام تالار نباید بیشتر از ۱۰۰ کاراکتر باشد"),
  code: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 50,
      "کد داخلی تالار نباید بیشتر از ۵۰ کاراکتر باشد",
    ),
  province: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 80,
      "نام استان بیش از حد طولانی است",
    ),
  city: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 80,
      "نام شهر بیش از حد طولانی است",
    ),
  address: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 500,
      "آدرس تالار نباید بیشتر از ۵۰۰ کاراکتر باشد",
    ),
  phone: z
    .unknown()
    .transform((value) => normalizeOptionalPhone(value))
    .refine(
      (value) => !value || value.length <= 30,
      "شماره تماس تالار معتبر نیست",
    ),
  managerName: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 100,
      "نام مدیر یا مسئول بیش از حد طولانی است",
    ),
  totalCapacity: z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) =>
        value === undefined || (Number.isInteger(value) && value > 0),
      "ظرفیت کل باید عدد مثبت باشد",
    ),
  description: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 1000,
      "توضیحات تالار نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
    ),
  isActive: z.boolean(),
});

export const hallIdSchema = z.object({
  hallId: z.string().min(1, "شناسه تالار معتبر نیست"),
});
