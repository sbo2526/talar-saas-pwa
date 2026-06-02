import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalPhone,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

export const accountProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "نام و نام خانوادگی الزامی است.")
    .min(2, "نام و نام خانوادگی باید حداقل ۲ کاراکتر باشد.")
    .max(120, "نام و نام خانوادگی بیش از حد طولانی است."),
  phone: z
    .unknown()
    .transform((value) => normalizeOptionalPhone(value))
    .refine(
      (value) => !value || /^[+0-9]{8,16}$/.test(value),
      "شماره موبایل معتبر نیست.",
    ),
  nationalCode: z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine(
      (value) => !value || /^\d{10}$/.test(value),
      "کد ملی باید ۱۰ رقم باشد.",
    ),
  address: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || value.length <= 500,
      "آدرس بیش از حد طولانی است.",
    ),
  postalCode: z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine(
      (value) => !value || /^\d{10}$/.test(value),
      "کد پستی باید ۱۰ رقم باشد.",
    ),
});
