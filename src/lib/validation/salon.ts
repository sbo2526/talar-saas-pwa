import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalInteger,
  normalizeOptionalString,
  toEnglishDigits,
} from "@/lib/validation/normalizers";

function normalizeOptionalMoney(value: unknown) {
  const normalized = normalizeOptionalDigits(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(toEnglishDigits(normalized).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

const optionalPositiveInteger = (message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalInteger(value))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      message,
    );

export const salonSchema = z
  .object({
    hallId: z.string().min(1, "انتخاب تالار مرتبط الزامی است"),
    name: z
      .string()
      .trim()
      .min(2, "نام سالن باید حداقل ۲ کاراکتر باشد")
      .max(100, "نام سالن نباید بیشتر از ۱۰۰ کاراکتر باشد"),
    code: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 50,
        "کد داخلی سالن نباید بیشتر از ۵۰ کاراکتر باشد",
      ),
    floor: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 50,
        "طبقه یا موقعیت سالن بیش از حد طولانی است",
      ),
    locationNote: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 300,
        "توضیح موقعیت سالن نباید بیشتر از ۳۰۰ کاراکتر باشد",
      ),
    capacity: optionalPositiveInteger("ظرفیت کل باید عدد مثبت باشد"),
    minCapacity: optionalPositiveInteger("حداقل ظرفیت باید عدد مثبت باشد"),
    maxCapacity: optionalPositiveInteger("حداکثر ظرفیت باید عدد مثبت باشد"),
    basePrice: z
      .unknown()
      .transform((value) => normalizeOptionalMoney(value))
      .refine(
        (value) => value === undefined || (Number.isFinite(value) && value > 0),
        "قیمت پایه سالن باید عدد مثبت باشد",
      ),
    hasStage: z.boolean(),
    hasDanceFloor: z.boolean(),
    hasSeparateEntrance: z.boolean(),
    hasVipRoom: z.boolean(),
    hasSoundSystem: z.boolean(),
    hasProjector: z.boolean(),
    description: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || value.length <= 1000,
        "توضیحات سالن نباید بیشتر از ۱۰۰۰ کاراکتر باشد",
      ),
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.minCapacity !== undefined &&
      value.maxCapacity !== undefined &&
      value.minCapacity > value.maxCapacity
    ) {
      context.addIssue({
        code: "custom",
        path: ["minCapacity"],
        message: "حداقل ظرفیت نمی‌تواند بیشتر از حداکثر ظرفیت باشد",
      });
    }

    if (
      value.capacity !== undefined &&
      value.minCapacity !== undefined &&
      value.capacity < value.minCapacity
    ) {
      context.addIssue({
        code: "custom",
        path: ["capacity"],
        message: "ظرفیت کل نباید کمتر از حداقل ظرفیت باشد",
      });
    }

    if (
      value.capacity !== undefined &&
      value.maxCapacity !== undefined &&
      value.capacity > value.maxCapacity
    ) {
      context.addIssue({
        code: "custom",
        path: ["capacity"],
        message: "ظرفیت کل نباید بیشتر از حداکثر ظرفیت باشد",
      });
    }
  });

export const salonIdSchema = z.object({
  salonId: z.string().min(1, "شناسه سالن معتبر نیست"),
});
