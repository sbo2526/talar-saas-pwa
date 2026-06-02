import { z } from "zod";
import { categoryTypeValues } from "@/lib/financial-category-options";
import { normalizeOptionalString } from "@/lib/validation/normalizers";

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

export const financialCategorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "نام دسته مالی باید حداقل ۲ کاراکتر باشد")
    .max(100, "نام دسته مالی نباید بیشتر از ۱۰۰ کاراکتر باشد"),
  code: optionalText(50, "کد داخلی دسته مالی نباید بیشتر از ۵۰ کاراکتر باشد"),
  type: z.enum(categoryTypeValues, {
    message: "نوع دسته مالی معتبر نیست",
  }),
  parentId: z
    .unknown()
    .transform((value) => normalizeOptionalString(value)),
  color: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
      "رنگ نمایشی باید با فرمت hex مانند #C7A15A باشد",
    ),
  icon: optionalText(50, "نام آیکن بیش از حد طولانی است"),
  description: optionalText(1000, "توضیحات دسته مالی بیش از حد طولانی است"),
  isActive: z.boolean(),
});

export const financialCategoryIdSchema = z.object({
  financialCategoryId: z.string().min(1, "شناسه دسته مالی معتبر نیست"),
});
