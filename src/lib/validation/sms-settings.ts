import { z } from "zod";
import { isSmsProvider } from "@/lib/integrations/sms-providers";
import { normalizeOptionalPhone, normalizeOptionalString } from "@/lib/validation/normalizers";

const optionalText = (max: number, message: string) =>
  z
    .unknown()
    .transform((value) => normalizeOptionalString(value))
    .refine((value) => !value || value.length <= max, message);

function normalizeIranianMobile(value: unknown) {
  const normalized = normalizeOptionalPhone(value);

  if (!normalized) {
    return undefined;
  }

  if (/^09\d{9}$/.test(normalized)) {
    return normalized;
  }

  if (/^989\d{9}$/.test(normalized)) {
    return `0${normalized.slice(2)}`;
  }

  if (/^\+989\d{9}$/.test(normalized)) {
    return `0${normalized.slice(3)}`;
  }

  return normalized;
}

function normalizeSenderNumber(value: unknown) {
  return normalizeOptionalPhone(value)?.replace(/^\+/, "");
}

function normalizeIranianMobileList(value: unknown) {
  const raw = normalizeOptionalString(value);

  if (!raw) {
    return undefined;
  }

  const mobiles = raw
    .replace(/[\n\r,،;؛|]+/g, "\n")
    .split("\n")
    .map((item) => normalizeIranianMobile(item))
    .filter((mobile): mobile is string => Boolean(mobile));

  return [...new Set(mobiles)].join("\n") || undefined;
}

function hasOnlyValidManagerMobiles(value: string | undefined) {
  if (!value) {
    return true;
  }

  const mobiles = value.split("\n").filter((mobile): mobile is string => Boolean(mobile));
  return mobiles.length <= 10 && mobiles.every((mobile) => /^09\d{9}$/.test(mobile));
}

export const smsSettingsSchema = z
  .object({
    isEnabled: z.boolean(),
    provider: z
      .unknown()
      .transform((value) => normalizeOptionalString(value)?.toUpperCase())
      .refine((value) => !value || isSmsProvider(value), "ارائه‌دهنده پیامک را انتخاب کنید."),
    apiKey: optionalText(500, "کلید API پیامک بیش از حد طولانی است."),
    senderNumber: z
      .unknown()
      .transform((value) => normalizeSenderNumber(value))
      .refine((value) => !value || value.length <= 30, "شماره ارسال‌کننده معتبر نیست."),
    managerMobile: z
      .unknown()
      .transform((value) => normalizeIranianMobileList(value))
      .refine((value) => hasOnlyValidManagerMobiles(value), "شماره‌های مالک/مدیر باید موبایل معتبر ایران باشند؛ حداکثر ۱۰ شماره."),
    sendToManager: z.boolean(),
    sendToCustomer: z.boolean(),
    sendContractEvents: z.boolean(),
    sendPaymentEvents: z.boolean(),
    sendExpenseEvents: z.boolean(),
    sendCustomerEvents: z.boolean(),
    sendDailyReports: z.boolean(),
    sendWeeklyReports: z.boolean(),
    sendMonthlyReports: z.boolean(),
    sendEventReminders: z.boolean(),
    sendOutstandingBalanceReminders: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.isEnabled && !value.provider) {
      context.addIssue({
        code: "custom",
        path: ["provider"],
        message: "ارائه‌دهنده پیامک را انتخاب کنید.",
      });
    }

    if (value.isEnabled && value.sendToManager && !value.managerMobile) {
      context.addIssue({
        code: "custom",
        path: ["managerMobile"],
        message: "ارسال پیامک به مدیر نیازمند حداقل یک شماره مالک/مدیر است.",
      });
    }
  });

export type SmsSettingsInput = z.infer<typeof smsSettingsSchema>;
