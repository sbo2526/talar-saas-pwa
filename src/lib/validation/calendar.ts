import { z } from "zod";
import { calendarDayStatusValues } from "@/lib/calendar-status-options";
import { normalizeOptionalString } from "@/lib/validation/normalizers";

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

export const calendarDayNoteSchema = z.object({
  date: z
    .unknown()
    .transform((value) => (typeof value === "string" ? value : ""))
    .transform((value) => new Date(value))
    .refine(
      (value) => !Number.isNaN(value.getTime()),
      "تاریخ انتخاب‌شده برای تقویم معتبر نیست",
    ),
  status: z.enum(calendarDayStatusValues, {
    message: "وضعیت روز معتبر نیست",
  }),
  title: optionalText(120, "عنوان یادداشت نباید بیشتر از ۱۲۰ کاراکتر باشد"),
  note: optionalText(1000, "متن یادداشت نباید بیشتر از ۱۰۰۰ کاراکتر باشد"),
  color: z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine(
      (value) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
      "رنگ انتخابی باید با فرمت معتبر مانند #C7A15A باشد",
    ),
});

export const calendarDayDateSchema = z.object({
  date: calendarDayNoteSchema.shape.date,
});
