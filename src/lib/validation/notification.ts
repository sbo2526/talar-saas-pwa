import { z } from "zod";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_STATUSES,
} from "@/lib/notifications/constants";
import { normalizeOptionalDate, normalizeOptionalString } from "@/lib/validation/normalizers";

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

const plainTemplateText = (fieldName: string, max: number) =>
  z
    .string()
    .trim()
    .min(2, `${fieldName} الزامی است.`)
    .max(max, `${fieldName} بیش از حد طولانی است.`)
    .refine((value) => !/<\s*script/i.test(value), "متن پیام معتبر نیست.");

export const notificationTemplateSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS, { message: "کانال اعلان معتبر نیست." }),
  eventType: z.enum(NOTIFICATION_EVENT_TYPES, {
    message: "نوع رویداد اعلان معتبر نیست.",
  }),
  title: plainTemplateText("عنوان پیام", 160),
  body: plainTemplateText("متن پیام", 2000),
  isEnabled: z.boolean(),
});

export const notificationTemplateUpdateSchema = z.object({
  templateId: z.string().trim().min(1, "قالب انتخاب‌شده معتبر نیست."),
  title: plainTemplateText("عنوان پیام", 160),
  body: plainTemplateText("متن پیام", 2000),
  isEnabled: z.boolean(),
});

export const notificationTemplateToggleSchema = z.object({
  templateId: z.string().trim().min(1, "قالب انتخاب‌شده معتبر نیست."),
});

export const notificationLogFilterSchema = z.object({
  channel: z
    .enum(NOTIFICATION_CHANNELS, { message: "کانال اعلان معتبر نیست." })
    .optional(),
  eventType: z
    .enum(NOTIFICATION_EVENT_TYPES, { message: "نوع رویداد اعلان معتبر نیست." })
    .optional(),
  status: z
    .enum(NOTIFICATION_STATUSES, { message: "وضعیت اعلان معتبر نیست." })
    .optional(),
  from: z
    .unknown()
    .transform((value) => normalizeOptionalDate(value))
    .optional(),
  to: z
    .unknown()
    .transform((value) => normalizeOptionalDate(value))
    .optional(),
  q: optionalText(180, "عبارت جستجو بیش از حد طولانی است."),
});

export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>;
export type NotificationTemplateUpdateInput = z.infer<typeof notificationTemplateUpdateSchema>;
export type NotificationLogFilterInput = z.infer<typeof notificationLogFilterSchema>;
