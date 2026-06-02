import { z } from "zod";
import {
  normalizeOptionalDate,
  normalizeOptionalDigits,
  normalizeOptionalInteger,
  normalizeOptionalPhone,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

const optionalTrimmedString = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

const optionalDigits = (length: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine((value) => !value || value.length === length, message);

function normalizeOptionalContactNumbers(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const numbers = value
    .split(/[\r\n،,;؛/|]+/g)
    .map((part) => normalizeOptionalPhone(part))
    .filter((part): part is string => Boolean(part));

  return numbers.length > 0 ? Array.from(new Set(numbers)).join("\n") : undefined;
}

const optionalContactNumbers = z
  .unknown()
  .transform((value) => normalizeOptionalContactNumbers(value))
  .refine((value) => !value || value.length <= 260, "فهرست شماره‌های تماس بیش از حد طولانی است")
  .refine(
    (value) =>
      !value ||
      value
        .split("\n")
        .every((phone) => /^[+0-9]{8,16}$/.test(phone)),
    "شماره تماس معتبر نیست. برای چند شماره، هر شماره را در یک خط جدا وارد کنید.",
  );

const optionalPositiveInteger = z
  .unknown()
  .transform((value) => normalizeOptionalInteger(value))
  .refine(
    (value) => value === undefined || (Number.isInteger(value) && value >= 0),
    "ظرفیت باید عدد مثبت باشد",
  );

const optionalDate = z
  .unknown()
  .transform((value) => normalizeOptionalDate(value))
  .refine((value) => value !== null, "تاریخ واردشده معتبر نیست");

export const hallInfoSchema = z.object({
  brandName: optionalTrimmedString(120, "نام برند تالار بیش از حد طولانی است"),
  legalName: optionalTrimmedString(160, "نام حقوقی بیش از حد طولانی است"),
  managerName: optionalTrimmedString(120, "نام مدیر بیش از حد طولانی است"),
  managerNationalCode: optionalDigits(10, "کد ملی مدیر باید ۱۰ رقم باشد"),
  registrationNumber: optionalTrimmedString(
    60,
    "شماره ثبت بیش از حد طولانی است",
  ),
  economicCode: optionalDigits(12, "کد اقتصادی باید ۱۲ رقم باشد"),
  licenseNumber: optionalTrimmedString(
    80,
    "شماره مجوز بیش از حد طولانی است",
  ),
  licenseIssuedAt: optionalDate,
  licenseExpiresAt: optionalDate,
  province: optionalTrimmedString(80, "نام استان بیش از حد طولانی است"),
  city: optionalTrimmedString(80, "نام شهر بیش از حد طولانی است"),
  address: optionalTrimmedString(700, "آدرس تالار بیش از حد طولانی است"),
  postalCode: optionalDigits(10, "کد پستی باید ۱۰ رقم باشد"),
  phone: optionalContactNumbers,
  mobile: optionalContactNumbers,
  email: z
    .unknown()
    .transform((value) => normalizeOptionalString(value)?.toLowerCase())
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "ایمیل معتبر نیست",
    ),
  website: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || z.string().url().safeParse(value).success,
      "آدرس وب‌سایت باید معتبر باشد",
    ),
  instagram: optionalTrimmedString(
    120,
    "آدرس یا نام کاربری اینستاگرام بیش از حد طولانی است",
  ),
  totalCapacity: optionalPositiveInteger,
  parkingCapacity: optionalPositiveInteger,
  hasParking: z.boolean(),
  hasBrideRoom: z.boolean(),
  hasCateringKitchen: z.boolean(),
  hasOutdoorSpace: z.boolean(),
  hasValet: z.boolean(),
  description: optionalTrimmedString(1000, "توضیح مجموعه بیش از حد طولانی است"),
  internalNote: optionalTrimmedString(1000, "یادداشت داخلی بیش از حد طولانی است"),
});

export function parseBooleanField(formData: FormData, key: string) {
  return formData.get(key) === "on";
}
