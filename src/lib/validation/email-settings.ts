import { z } from "zod";
import { normalizeOptionalInteger, normalizeOptionalString } from "@/lib/validation/normalizers";
import { parseEmailRecipients } from "@/lib/notifications/recipient-utils";

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

function normalizeEmailList(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized ? parseEmailRecipients(normalized).join("\n") || undefined : undefined;
}

export const emailSettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    smtpHost: optionalText(200, "آدرس SMTP بیش از حد طولانی است."),
    smtpPort: z
      .unknown()
      .transform((value) => normalizeOptionalInteger(value))
      .refine((value) => value === undefined || (Number.isInteger(value) && value > 0 && value <= 65535), "پورت SMTP معتبر نیست."),
    smtpSecure: z.boolean(),
    smtpUsername: optionalText(250, "نام کاربری SMTP بیش از حد طولانی است."),
    smtpPassword: optionalText(500, "رمز SMTP بیش از حد طولانی است."),
    fromEmail: z
      .unknown()
      .transform((value) => normalizeOptionalString(value)?.toLowerCase())
      .refine((value) => !value || emailPattern.test(value), "ایمیل فرستنده معتبر نیست."),
    fromName: optionalText(120, "نام فرستنده بیش از حد طولانی است."),
    managerEmails: z
      .unknown()
      .transform((value) => normalizeEmailList(value))
      .refine((value) => !value || value.split("\n").length <= 20, "حداکثر ۲۰ ایمیل مدیر/مالک قابل ثبت است."),
    sendToManager: z.boolean(),
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
    dailyReportTime: optionalText(5, "ساعت گزارش روزانه معتبر نیست."),
    weeklyReportDay: optionalText(20, "روز گزارش هفتگی معتبر نیست."),
    monthlyReportDay: z
      .unknown()
      .transform((value) => normalizeOptionalInteger(value))
      .refine((value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 31), "روز گزارش ماهانه باید بین ۱ تا ۳۱ باشد."),
  })
  .superRefine((value, context) => {
    if (!value.isEnabled) return;
    if (!value.smtpHost) context.addIssue({ code: "custom", path: ["smtpHost"], message: "برای فعال‌سازی ایمیل، آدرس SMTP الزامی است." });
    if (!value.smtpPort) context.addIssue({ code: "custom", path: ["smtpPort"], message: "برای فعال‌سازی ایمیل، پورت SMTP الزامی است." });
    if (!value.fromEmail) context.addIssue({ code: "custom", path: ["fromEmail"], message: "ایمیل فرستنده الزامی است." });
    if (value.sendToManager && !value.managerEmails) context.addIssue({ code: "custom", path: ["managerEmails"], message: "برای ارسال ایمیل مدیریتی، حداقل یک ایمیل مالک/مدیر ثبت کنید." });
    if (value.dailyReportTime && !/^\d{1,2}:\d{2}$/.test(value.dailyReportTime)) context.addIssue({ code: "custom", path: ["dailyReportTime"], message: "ساعت گزارش روزانه را مثل 09:00 وارد کنید." });
  });

export type EmailSettingsInput = z.infer<typeof emailSettingsSchema>;
