export const SMS_PROVIDERS = ["KAVENEGAR", "FARAZSMS", "GHASEDAK", "MELIPAYAMAK", "CUSTOM"] as const;

export type SmsProvider = (typeof SMS_PROVIDERS)[number];

export const smsProviderLabels: Record<SmsProvider, string> = {
  KAVENEGAR: "کاوه‌نگار",
  FARAZSMS: "فراز اس‌ام‌اس",
  GHASEDAK: "قاصدک",
  MELIPAYAMAK: "ملی‌پیامک",
  CUSTOM: "ارائه‌دهنده سفارشی",
};

export function isSmsProvider(value: string | null | undefined): value is SmsProvider {
  return SMS_PROVIDERS.includes(value as SmsProvider);
}

export function normalizeSmsProvider(value: string | null | undefined): SmsProvider | undefined {
  const normalized = value?.trim().toUpperCase();
  return isSmsProvider(normalized) ? normalized : undefined;
}

export function formatSmsProviderLabel(value: string | null | undefined) {
  const provider = normalizeSmsProvider(value);
  return provider ? smsProviderLabels[provider] : "ثبت نشده";
}
