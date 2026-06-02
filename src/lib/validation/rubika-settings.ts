import { z } from "zod";
import { normalizeOptionalInteger, normalizeOptionalString } from "@/lib/validation/normalizers";

const rubikaTokenPattern = /^[A-Za-z0-9:_-]{20,260}$/;
const chatIdPattern = /^[A-Za-z0-9_@:-]{3,128}$/;
const weeklyDays = ["SATURDAY", "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

export const rubikaSettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    botToken: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine((value) => !value || value.length <= 260, "توکن بات روبیکا بیش از حد طولانی است.")
      .refine((value) => !value || rubikaTokenPattern.test(value), "توکن بات روبیکا معتبر نیست."),
    chatId: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine((value) => !value || value.length <= 120, "شناسه گفت‌وگو بیش از حد طولانی است.")
      .refine((value) => !value || chatIdPattern.test(value), "شناسه گفت‌وگو معتبر نیست. chat_id روبیکا را از getUpdates یا لینک/شناسه عمومی معتبر وارد کنید."),
    chatTitle: optionalText(120, "عنوان گفت‌وگو بیش از حد طولانی است."),
    sendContractEvents: z.boolean(),
    sendPaymentEvents: z.boolean(),
    sendExpenseEvents: z.boolean(),
    sendCustomerEvents: z.boolean(),
    sendSecurityEvents: z.boolean(),
    sendDailyReports: z.boolean(),
    sendWeeklyReports: z.boolean(),
    sendMonthlyReports: z.boolean(),
    sendEventReminders: z.boolean(),
    sendOutstandingBalanceReminders: z.boolean(),
    dailyReportTime: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine((value) => !value || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), "ساعت گزارش روزانه معتبر نیست."),
    weeklyReportDay: z
      .unknown()
      .transform((value) => normalizeOptionalString(value))
      .refine(
        (value) => !value || weeklyDays.includes(value as (typeof weeklyDays)[number]),
        "روز گزارش هفتگی معتبر نیست.",
      ),
    monthlyReportDay: z
      .unknown()
      .transform((value) => normalizeOptionalInteger(value))
      .refine(
        (value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 31),
        "روز گزارش ماهانه باید بین ۱ تا ۳۱ باشد.",
      ),
  })
  .superRefine((value, context) => {
    if (value.isEnabled && !value.chatId) {
      context.addIssue({
        code: "custom",
        path: ["chatId"],
        message: "شناسه گفت‌وگو الزامی است.",
      });
    }
  });

export type RubikaSettingsInput = z.infer<typeof rubikaSettingsSchema>;
