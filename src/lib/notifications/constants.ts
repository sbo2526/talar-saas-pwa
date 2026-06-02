export const NOTIFICATION_CHANNELS = ["TELEGRAM", "BALE", "RUBIKA", "SMS", "EMAIL"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_EVENT_TYPES = [
  "CONTRACT_CREATED",
  "CONTRACT_UPDATED",
  "CONTRACT_STATUS_CHANGED",
  "CONTRACT_CANCELED",
  "PAYMENT_CREATED",
  "PAYMENT_UPDATED",
  "PAYMENT_CANCELED",
  "EXPENSE_CREATED",
  "EXPENSE_UPDATED",
  "EXPENSE_CANCELED",
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "DAILY_REPORT",
  "WEEKLY_REPORT",
  "MONTHLY_REPORT",
  "EVENT_REMINDER_TOMORROW",
  "OUTSTANDING_BALANCE_REMINDER",
  "POST_EVENT_INVOICE_DELIVERY_CUSTOMER",
  "POST_EVENT_INVOICE_DELIVERY_MANAGER",
  "CUSTOMER_BALANCE_DUE_TOMORROW",
  "SECURITY_EVENT",
  "TEST_MESSAGE",
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_STATUSES = [
  "QUEUED",
  "SENT",
  "FAILED",
  "CANCELED",
  "SKIPPED",
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const notificationChannelLabels: Record<NotificationChannel, string> = {
  TELEGRAM: "تلگرام",
  BALE: "بله",
  RUBIKA: "روبیکا",
  SMS: "پیامک",
  EMAIL: "ایمیل",
};

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  QUEUED: "در صف ارسال",
  SENT: "ارسال‌شده",
  FAILED: "ناموفق",
  CANCELED: "لغوشده",
  SKIPPED: "نادیده گرفته‌شده",
};

export const notificationEventLabels: Record<NotificationEventType, string> = {
  CONTRACT_CREATED: "ثبت قرارداد",
  CONTRACT_UPDATED: "ویرایش قرارداد",
  CONTRACT_STATUS_CHANGED: "تغییر وضعیت قرارداد",
  CONTRACT_CANCELED: "لغو قرارداد",
  PAYMENT_CREATED: "ثبت دریافت",
  PAYMENT_UPDATED: "ویرایش دریافت",
  PAYMENT_CANCELED: "لغو دریافت",
  EXPENSE_CREATED: "ثبت هزینه",
  EXPENSE_UPDATED: "ویرایش هزینه",
  EXPENSE_CANCELED: "لغو هزینه",
  CUSTOMER_CREATED: "ثبت مشتری",
  CUSTOMER_UPDATED: "ویرایش مشتری",
  DAILY_REPORT: "گزارش روزانه",
  WEEKLY_REPORT: "گزارش هفتگی",
  MONTHLY_REPORT: "گزارش ماهانه",
  EVENT_REMINDER_TOMORROW: "یادآوری مراسم فردا",
  OUTSTANDING_BALANCE_REMINDER: "یادآوری مانده قابل پیگیری",
  POST_EVENT_INVOICE_DELIVERY_CUSTOMER: "ارسال صورتحساب به مشتری",
  POST_EVENT_INVOICE_DELIVERY_MANAGER: "اطلاع‌رسانی صورتحساب به مدیر",
  CUSTOMER_BALANCE_DUE_TOMORROW: "یادآوری تسویه مشتری",
  SECURITY_EVENT: "رویداد امنیتی",
  TEST_MESSAGE: "پیام تست",
};

export function getNotificationChannelLabel(channel: string | null | undefined) {
  return notificationChannelLabels[channel as NotificationChannel] ?? "کانال نامشخص";
}

export function getNotificationStatusLabel(status: string | null | undefined) {
  return notificationStatusLabels[status as NotificationStatus] ?? "وضعیت نامشخص";
}

export function getNotificationEventLabel(eventType: string | null | undefined) {
  return notificationEventLabels[eventType as NotificationEventType] ?? "رویداد نامشخص";
}

export function isNotificationChannel(value: string): value is NotificationChannel {
  return NOTIFICATION_CHANNELS.includes(value as NotificationChannel);
}

export function isNotificationEventType(value: string): value is NotificationEventType {
  return NOTIFICATION_EVENT_TYPES.includes(value as NotificationEventType);
}

export function isNotificationStatus(value: string): value is NotificationStatus {
  return NOTIFICATION_STATUSES.includes(value as NotificationStatus);
}
