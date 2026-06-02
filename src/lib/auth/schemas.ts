import { z } from "zod";

export function normalizePhone(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return value.replace(/[\s-]/g, "") || undefined;
}

export const emailSchema = z
  .string()
  .trim()
  .email("ایمیل معتبر نیست")
  .transform((value) => value.toLowerCase());

export const registerSchema = z.object({
  name: z.string().trim().min(2, "نام باید حداقل ۲ کاراکتر باشد"),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => normalizePhone(value)),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "رمز عبور الزامی است"),
});
