"use server";

import { revalidatePath } from "next/cache";
import type { ScheduledNotificationActionState } from "@/lib/actions/scheduled-notification-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import {
  sendDailyReportForTenant,
  sendMonthlyReportForTenant,
  sendOutstandingBalanceReminderForTenant,
  sendTomorrowEventReminderForTenant,
  sendWeeklyReportForTenant,
} from "@/lib/notifications/scheduled-dispatcher";

type Sender = (tenantId: string, now?: Date) => Promise<Array<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }>>;

function summarize(results: Array<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }>, successMessage: string) {
  const sent = results.filter((item) => item.status === "SENT").length;
  const failed = results.filter((item) => item.status === "FAILED").length;
  const skipped = results.filter((item) => item.status === "SKIPPED").length;
  if (sent > 0) {
    return { ok: true, message: `${successMessage} ${sent} کانال ارسال شد.${failed ? ` ${failed} کانال ناموفق بود و در لاگ ثبت شد.` : ""}` };
  }
  if (failed > 0) {
    return { ok: false, message: "ارسال گزارش ناموفق بود. جزئیات خطا در لاگ اعلان‌ها ثبت شد." };
  }
  return { ok: false, message: skipped ? "کانال فعالی برای ارسال این گزارش پیکربندی نشده است." : "گزارشی برای ارسال ثبت نشد." };
}

async function runManualReport(sender: Sender, successMessage: string): Promise<ScheduledNotificationActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const results = await sender(membership.tenantId, new Date());
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  revalidatePath("/dashboard/reports");
  return summarize(results, successMessage);
}

export async function sendDailyReportNowAction(
  _previousState: ScheduledNotificationActionState,
  _formData: FormData,
): Promise<ScheduledNotificationActionState> {
  return runManualReport(sendDailyReportForTenant, "گزارش روزانه با موفقیت ارسال شد.");
}

export async function sendWeeklyReportNowAction(
  _previousState: ScheduledNotificationActionState,
  _formData: FormData,
): Promise<ScheduledNotificationActionState> {
  return runManualReport(sendWeeklyReportForTenant, "گزارش هفتگی با موفقیت ارسال شد.");
}

export async function sendMonthlyReportNowAction(
  _previousState: ScheduledNotificationActionState,
  _formData: FormData,
): Promise<ScheduledNotificationActionState> {
  return runManualReport(sendMonthlyReportForTenant, "گزارش ماهانه با موفقیت ارسال شد.");
}

export async function sendTomorrowReminderNowAction(
  _previousState: ScheduledNotificationActionState,
  _formData: FormData,
): Promise<ScheduledNotificationActionState> {
  return runManualReport(sendTomorrowEventReminderForTenant, "یادآوری مراسم فردا با موفقیت ارسال شد.");
}

export async function sendOutstandingBalanceReminderNowAction(
  _previousState: ScheduledNotificationActionState,
  _formData: FormData,
): Promise<ScheduledNotificationActionState> {
  return runManualReport(sendOutstandingBalanceReminderForTenant, "یادآوری مانده‌ها با موفقیت ارسال شد.");
}
