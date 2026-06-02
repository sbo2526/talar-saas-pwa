import { z } from "zod";
import {
  normalizeOptionalDigits,
  normalizeOptionalPhone,
  normalizeOptionalString,
} from "@/lib/validation/normalizers";

export const customerSalutations = ["آقا", "خانم", "شرکت / سازمان"] as const;

const customerId = z.string().trim().min(1, "شناسه مشتری معتبر نیست.").max(128, "شناسه مشتری معتبر نیست.");

function booleanFromForm(value: unknown) {
  return value === "on" || value === "true" || value === true;
}

export const customerFormSchema = z.object({
  customerId: z.preprocess(
    (value) => normalizeOptionalString(value),
    customerId.optional(),
  ),
  salutation: z.preprocess(
    (value) => normalizeOptionalString(value),
    z.enum(customerSalutations, { error: "عنوان مشتری معتبر نیست." }).optional(),
  ),
  fullName: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => Boolean(value), "نام مشتری الزامی است.")
    .transform((value) => value as string)
    .refine((value) => value.length >= 2, "نام مشتری الزامی است.")
    .refine((value) => value.length <= 120, "نام مشتری بیش از حد طولانی است."),
  phone: z
    .unknown()
    .transform((value) => normalizeOptionalPhone(value))
    .refine((value) => Boolean(value), "شماره همراه معتبر نیست.")
    .transform((value) => value as string)
    .refine((value) => /^09\d{9}$/.test(value), "شماره همراه معتبر نیست."),
  nationalCode: z
    .unknown()
    .transform((value) => normalizeOptionalDigits(value))
    .refine((value) => !value || /^\d{10}$/.test(value), "کد ملی باید ۱۰ رقم باشد."),
  address: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= 500, "آدرس بیش از حد طولانی است."),
  notes: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= 1000, "توضیحات بیش از حد طولانی است."),
  isActive: z.preprocess(booleanFromForm, z.boolean()),
});

export const customerIdSchema = z.object({
  customerId,
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
