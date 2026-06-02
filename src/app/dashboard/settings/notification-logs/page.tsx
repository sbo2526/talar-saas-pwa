import { AlertTriangle, ClipboardList, MailCheck } from "lucide-react";
import Link from "next/link";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { MessageLogRetryDialog } from "@/components/dashboard/messages/message-log-retry-dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  NOTIFICATION_STATUSES,
  getNotificationChannelLabel,
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";
import { getNotificationLogs, getNotificationLogStats } from "@/lib/notifications/data";

type NotificationLogsPageProps = {
  searchParams: Promise<{
    channel?: string;
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
};

type NotificationLogRow = {
  id: string;
  channel: string;
  eventType: string;
  recipient: string | null;
  recipientLabel: string | null;
  title: string | null;
  message: string;
  status: string;
  errorMessage: string | null;
  attemptCount: number;
  relatedContractId: string | null;
  relatedPaymentId: string | null;
  relatedExpenseId: string | null;
  relatedCustomerId: string | null;
  sentAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
};

type NotificationLogStats = {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  skipped: number;
  canceled: number;
  latestSent: { sentAt: Date | null; createdAt: Date } | null;
};

function preview(value: string | null | undefined, max = 110) {
  if (!value) {
    return "—";
  }

  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function statusClass(status: string) {
  if (status === "SENT") {
    return "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]";
  }

  if (status === "FAILED") {
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  }

  if (status === "QUEUED" || status === "SKIPPED") {
    return "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]";
  }

  return "border-[#d8c08b]/62 bg-white/55 text-[#5f533f]";
}

function activeFilterSummary(params: Awaited<NotificationLogsPageProps["searchParams"]>) {
  const parts = [
    params.channel ? getNotificationChannelLabel(params.channel) : null,
    params.eventType ? getNotificationEventLabel(params.eventType) : null,
    params.status ? getNotificationStatusLabel(params.status) : null,
    params.from || params.to ? "بازه زمانی انتخاب‌شده" : null,
    params.q ? `جستجو: ${params.q}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "همه اعلان‌های ثبت‌شده";
}

export default async function NotificationLogsPage({ searchParams }: NotificationLogsPageProps) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const [logs, stats] = await Promise.all([
    getNotificationLogs(membership.tenantId, params) as Promise<NotificationLogRow[]>,
    getNotificationLogStats(membership.tenantId, params) as Promise<NotificationLogStats>,
  ]);

  return (
    <SettingsPageShell
      title="لاگ اعلان‌ها"
      subtitle="سوابق ارسال اعلان‌ها، وضعیت پیام‌های تلگرام و پیامک، خطاها و تلاش‌های ارسال را مشاهده و پیگیری کنید."
      badge="دفتر اعلان‌ها"
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/settings/telegram">
            تنظیمات تلگرام
          </SettingsSecondaryLink>
          <SettingsSecondaryLink href="/dashboard/messages">
            مرکز پیام‌ها
          </SettingsSecondaryLink>
          <SettingsSecondaryLink href="/dashboard/settings/message-templates">
            قالب پیام‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["کل اعلان‌ها", stats.total, "border-[#c7a15a]/28 bg-[#c7a15a]/10 text-[#17483f]"],
          ["ارسال‌شده", stats.sent, "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"],
          ["ناموفق", stats.failed, "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"],
          ["در صف ارسال", stats.queued, "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]"],
          ["نادیده گرفته‌شده", stats.skipped, "border-[#d8c08b]/62 bg-white/55 text-[#5f533f]"],
          ["آخرین ارسال موفق", stats.latestSent ? formatJalaliDateTime(stats.latestSent.sentAt ?? stats.latestSent.createdAt) : "—", "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"],
        ].map(([label, value, className]) => (
          <article
            key={String(label)}
            className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)]"
          >
            <p className="text-xs font-black text-[#6d5f49]">{label}</p>
            <p className="mt-2 text-xl font-black leading-8 text-[#111827]">
              {typeof value === "number" ? toPersianDigits(value) : value}
            </p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${className}`}>
              وضعیت گزارش
            </span>
          </article>
        ))}
      </div>

      <LuxuryPanel eyebrow="فیلتر سوابق" title="جست‌وجوی لاگ اعلان‌ها">
        <p className="mb-4 rounded-2xl border border-[#d8c08b]/55 bg-white/55 px-4 py-3 text-sm font-black text-[#6d5f49]">
          نمایش: {activeFilterSummary(params)}
        </p>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" action="/dashboard/settings/notification-logs">
          <label className="grid gap-1.5 text-xs font-black text-[#172033] xl:col-span-2">
            جستجو
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="گیرنده، عنوان، متن، خطا یا شناسه مرتبط"
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            کانال
            <select
              name="channel"
              defaultValue={params.channel ?? ""}
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            >
              <option value="">همه کانال‌ها</option>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <option key={channel} value={channel}>
                  {getNotificationChannelLabel(channel)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            نوع رویداد
            <select
              name="eventType"
              defaultValue={params.eventType ?? ""}
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            >
              <option value="">همه رویدادها</option>
              {NOTIFICATION_EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {getNotificationEventLabel(eventType)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            وضعیت
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            >
              <option value="">همه وضعیت‌ها</option>
              {NOTIFICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getNotificationStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <JalaliDatePicker name="from" label="از تاریخ" defaultValue={params.from ?? ""} />
          <JalaliDatePicker name="to" label="تا تاریخ" defaultValue={params.to ?? ""} />
          <div className="flex gap-2 xl:col-span-2 xl:self-end">
            <button className="flex-1 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_14px_34px_rgba(17,24,39,0.16)] transition hover:bg-[#0f172a]">
              اعمال فیلتر
            </button>
            <Link
              href="/dashboard/settings/notification-logs"
              className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa]"
            >
              حذف فیلترها
            </Link>
          </div>
        </form>
      </LuxuryPanel>

      <LuxuryPanel eyebrow="سوابق ثبت‌شده" title="لیست اعلان‌ها">
        {logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <article
                key={log.id}
                className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/55 p-4 shadow-[0_12px_34px_rgba(17,24,39,0.05)]"
              >
                <div className="grid gap-4 xl:grid-cols-[1fr_16rem] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#17483f]">
                        {getNotificationChannelLabel(log.channel)}
                      </span>
                      <span className="rounded-full border border-[#d8c08b]/62 bg-[#fff9ee] px-3 py-1 text-xs font-black text-[#5f533f]">
                        {getNotificationEventLabel(log.eventType)}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(log.status)}`}>
                        {getNotificationStatusLabel(log.status)}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-black text-[#111827]">
                      {log.title ?? getNotificationEventLabel(log.eventType)}
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                      {preview(log.message, 180)}
                    </p>
                    {[log.relatedContractId, log.relatedPaymentId, log.relatedExpenseId, log.relatedCustomerId].some(Boolean) ? (
                      <p className="mt-3 text-xs font-black leading-6 text-[#7d6841]">
                        ارتباط: {[
                          log.relatedContractId ? `قرارداد ${log.relatedContractId}` : null,
                          log.relatedPaymentId ? `دریافت ${log.relatedPaymentId}` : null,
                          log.relatedExpenseId ? `هزینه ${log.relatedExpenseId}` : null,
                          log.relatedCustomerId ? `مشتری ${log.relatedCustomerId}` : null,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {log.errorMessage ? (
                      <p className="mt-3 flex items-start gap-2 rounded-2xl border border-[#d85c5c]/30 bg-[#fff0ef] p-3 text-sm font-bold leading-7 text-[#9b2c2c]">
                        <AlertTriangle size={18} className="mt-1 shrink-0" />
                        {preview(log.errorMessage, 180)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-xs font-black text-[#7d6841]">
                    <span>گیرنده: {log.recipientLabel ?? log.recipient ?? "—"}</span>
                    <span>ثبت: {formatJalaliDateTime(log.createdAt)}</span>
                    <span>ارسال: {formatJalaliDateTime(log.sentAt)}</span>
                    <span>خطا: {formatJalaliDateTime(log.failedAt)}</span>
                    <span>تلاش‌ها: {toPersianDigits(log.attemptCount)}</span>
                    <div className="mt-2 grid gap-2">
                      <Link
                        href={`/dashboard/settings/notification-logs/${log.id}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-2.5 text-xs font-black text-[#fff8ea] transition hover:bg-[#0f172a]"
                      >
                        مشاهده جزئیات
                      </Link>
                      {(log.status === "FAILED" || log.status === "QUEUED") ? (
                        <MessageLogRetryDialog
                          logId={log.id}
                          channel={log.channel}
                          eventType={log.eventType}
                          status={log.status}
                          recipient={log.recipientLabel ?? log.recipient ?? "—"}
                          title={log.title ?? getNotificationEventLabel(log.eventType)}
                          message={log.message}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-6 text-center sm:p-10">
            <span className="flex size-16 items-center justify-center rounded-3xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
              <MailCheck size={30} />
            </span>
            <h2 className="mt-4 text-xl font-black text-[#111827]">
              هنوز اعلانی ثبت نشده است.
            </h2>
            <p className="mt-2 max-w-xl text-sm font-bold leading-7 text-[#6d5f49]">
              پس از فعال‌سازی تلگرام یا پیامک، سوابق ارسال در این بخش نمایش داده می‌شود.
            </p>
          </div>
        )}
      </LuxuryPanel>

      <div className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-sm font-bold leading-7 text-[#6d5f49] shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
        <div className="flex items-start gap-3">
          <ClipboardList size={21} className="mt-1 shrink-0 text-[#17483f]" />
          سوابق اعلان‌ها برای پیگیری وضعیت ارسال نگهداری می‌شوند. ارسال مجدد برای پیام‌های ناموفق یا در صفِ پیامک، تلگرام، بله و روبیکا فعال است و متن ثبت‌شده اصلی دوباره ارسال می‌شود.
        </div>
      </div>
    </SettingsPageShell>
  );
}
