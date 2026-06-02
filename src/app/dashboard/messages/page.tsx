import { AlertTriangle, Filter, MailCheck, MessageSquareText, Search } from "lucide-react";
import Link from "next/link";
import { MessageLogRetryDialog } from "@/components/dashboard/messages/message-log-retry-dialog";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
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

export const metadata = {
  title: "پیام‌ها | تالار منیجر",
};

type MessagesPageProps = {
  searchParams: Promise<{
    channel?: string;
    eventType?: string;
    status?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
};

type MessageLogRow = {
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

type MessageLogStats = {
  total: number;
  sent: number;
  failed: number;
  queued: number;
  skipped: number;
  canceled: number;
  latestSent: { sentAt: Date | null; createdAt: Date } | null;
};

function preview(value: string | null | undefined, max = 150) {
  if (!value?.trim()) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function statusClass(status: string) {
  if (status === "SENT") return "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]";
  if (status === "FAILED") return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  if (status === "QUEUED") return "border-[#d6b15f]/45 bg-[#fff6d9] text-[#6f4a18]";
  if (status === "SKIPPED") return "border-[#b99b65]/35 bg-white/70 text-[#66533a]";
  return "border-[#d8c08b]/62 bg-white/55 text-[#5f533f]";
}

function activeFilterSummary(params: Awaited<MessagesPageProps["searchParams"]>) {
  const parts = [
    params.channel ? getNotificationChannelLabel(params.channel) : null,
    params.eventType ? getNotificationEventLabel(params.eventType) : null,
    params.status ? getNotificationStatusLabel(params.status) : null,
    params.from ? `از ${params.from}` : null,
    params.to ? `تا ${params.to}` : null,
    params.q ? `جستجو: ${params.q}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "همه پیام‌ها";
}

function recipientText(log: MessageLogRow) {
  const label = log.recipientLabel?.trim();
  const recipient = log.recipient?.trim();

  if (label && recipient && label !== recipient) return `${label} · ${recipient}`;
  return label || recipient || "ثبت نشده";
}

function relatedText(log: MessageLogRow) {
  return [
    log.relatedContractId ? `قرارداد ${log.relatedContractId}` : null,
    log.relatedPaymentId ? `دریافت ${log.relatedPaymentId}` : null,
    log.relatedExpenseId ? `هزینه ${log.relatedExpenseId}` : null,
    log.relatedCustomerId ? `مشتری ${log.relatedCustomerId}` : null,
  ].filter(Boolean).join(" · ");
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const membership = await requireTenantPermission("notifications.manage");
  const params = await searchParams;
  const [logs, stats] = await Promise.all([
    getNotificationLogs(membership.tenantId, params) as Promise<MessageLogRow[]>,
    getNotificationLogStats(membership.tenantId, params) as Promise<MessageLogStats>,
  ]);

  return (
    <main className="grid gap-5" dir="rtl">
      <section className="overflow-hidden rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
        <div className="grid gap-4 bg-[linear-gradient(135deg,#111827,#172033)] px-5 py-6 text-[#fff8ea] sm:px-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-[#e8c478]/28 bg-[#e8c478]/12 px-3 py-1 text-xs font-black text-[#f0dba9]">
              مرکز پیام‌ها
            </p>
            <h1 className="mt-4 text-2xl font-black tracking-[-0.02em] sm:text-3xl">
              پیام‌های ارسالی مشتری و مدیریت
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#f7e8be]/88">
              تمام پیامک‌ها، ایمیل‌ها و اعلان‌های تلگرام، بله و روبیکا اینجا ثبت می‌شوند؛ زمان ارسال، گیرنده، متن کامل، خطا و امکان ارسال مجدد پیام‌های ناموفق در همین صفحه قابل پیگیری است.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings/message-templates"
              className="inline-flex items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/12 px-4 py-3 text-sm font-black text-[#f0dba9] transition hover:bg-[#e8c478]/18"
            >
              قالب پیام‌ها
            </Link>
            <Link
              href="/dashboard/settings/sms"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-[#fff8ea] transition hover:bg-white/14"
            >
              تنظیم پیامک
            </Link>
            <Link
              href="/dashboard/settings/email"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-[#fff8ea] transition hover:bg-white/14"
            >
              تنظیم ایمیل
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 sm:p-5">
          {[
            ["کل پیام‌ها", stats.total, "border-[#c7a15a]/28 bg-[#c7a15a]/10 text-[#17483f]"],
            ["ارسال‌شده", stats.sent, "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"],
            ["ناموفق", stats.failed, "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"],
            ["در صف", stats.queued, "border-[#d6b15f]/45 bg-[#fff6d9] text-[#6f4a18]"],
            ["نادیده‌شده", stats.skipped, "border-[#b99b65]/35 bg-white/70 text-[#66533a]"],
            ["آخرین ارسال", stats.latestSent ? formatJalaliDateTime(stats.latestSent.sentAt ?? stats.latestSent.createdAt) : "—", "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"],
          ].map(([label, value, className]) => (
            <article key={String(label)} className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-white/62 p-4">
              <p className="text-xs font-black text-[#6d5f49]">{label}</p>
              <p className="mt-2 text-xl font-black leading-8 text-[#111827]">
                {typeof value === "number" ? toPersianDigits(value) : value}
              </p>
              <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${className}`}>
                وضعیت
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black text-[#17483f]">
              <Filter size={16} />
              فیلتر و جستجو
            </p>
            <h2 className="mt-1 text-lg font-black text-[#111827]">نمایش: {activeFilterSummary(params)}</h2>
          </div>
          <Link href="/dashboard/messages" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-xs font-black text-[#4a3514] transition hover:bg-[#f4dfaa]">
            حذف فیلترها
          </Link>
        </div>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6" action="/dashboard/messages">
          <label className="grid gap-1.5 text-xs font-black text-[#172033] xl:col-span-2">
            جستجو در گیرنده، متن یا خطا
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a8866]" />
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="مثلاً نام مشتری، شماره موبایل یا متن پیام"
                className="h-12 w-full rounded-2xl border border-[#d8c08b]/70 bg-white/70 pr-10 pl-3 text-sm font-bold text-[#111827] outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
              />
            </div>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            کانال
            <select name="channel" defaultValue={params.channel ?? ""} className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15">
              <option value="">همه کانال‌ها</option>
              {NOTIFICATION_CHANNELS.map((channel) => <option key={channel} value={channel}>{getNotificationChannelLabel(channel)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            نوع پیام
            <select name="eventType" defaultValue={params.eventType ?? ""} className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15">
              <option value="">همه پیام‌ها</option>
              {NOTIFICATION_EVENT_TYPES.map((eventType) => <option key={eventType} value={eventType}>{getNotificationEventLabel(eventType)}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            وضعیت
            <select name="status" defaultValue={params.status ?? ""} className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-3 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15">
              <option value="">همه وضعیت‌ها</option>
              {NOTIFICATION_STATUSES.map((status) => <option key={status} value={status}>{getNotificationStatusLabel(status)}</option>)}
            </select>
          </label>
          <JalaliDatePicker name="from" label="از تاریخ" defaultValue={params.from ?? ""} />
          <JalaliDatePicker name="to" label="تا تاریخ" defaultValue={params.to ?? ""} />
          <button className="rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_14px_34px_rgba(17,24,39,0.16)] transition hover:bg-[#0f172a] xl:self-end">
            اعمال فیلتر
          </button>
        </form>
      </section>

      <section className="grid gap-3">
        {logs.length > 0 ? logs.map((log) => {
          const recipient = recipientText(log);
          const related = relatedText(log);
          const canRetry = log.status === "FAILED" || log.status === "QUEUED";

          return (
            <article key={log.id} className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_12px_34px_rgba(17,24,39,0.05)]">
              <div className="grid gap-4 xl:grid-cols-[1fr_18rem] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#17483f]">{getNotificationChannelLabel(log.channel)}</span>
                    <span className="rounded-full border border-[#d8c08b]/62 bg-white/70 px-3 py-1 text-xs font-black text-[#5f533f]">{getNotificationEventLabel(log.eventType)}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(log.status)}`}>{getNotificationStatusLabel(log.status)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-black text-[#111827]">{log.title ?? getNotificationEventLabel(log.eventType)}</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">{preview(log.message)}</p>
                  <details className="mt-3 rounded-2xl border border-[#ead6a6] bg-white/62 p-3">
                    <summary className="cursor-pointer list-none text-xs font-black text-[#17483f] marker:hidden">مشاهده متن کامل پیام</summary>
                    <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#ead6a6] bg-[#fffaf0] p-4 text-sm font-bold leading-8 text-[#4f4638]">{log.message}</pre>
                  </details>
                  {log.errorMessage ? (
                    <p className="mt-3 flex items-start gap-2 rounded-2xl border border-[#d85c5c]/30 bg-[#fff0ef] p-3 text-sm font-bold leading-7 text-[#9b2c2c]">
                      <AlertTriangle size={18} className="mt-1 shrink-0" />
                      {log.errorMessage}
                    </p>
                  ) : null}
                  {related ? <p className="mt-3 text-xs font-black leading-6 text-[#7d6841]">ارتباط: {related}</p> : null}
                </div>

                <aside className="grid gap-2 rounded-[1.35rem] border border-[#ead6a6] bg-white/55 p-3 text-xs font-black text-[#7d6841]">
                  <span>گیرنده: <b className="text-[#111827]">{recipient}</b></span>
                  <span>ثبت در سامانه: {formatJalaliDateTime(log.createdAt)}</span>
                  <span>ارسال موفق: {formatJalaliDateTime(log.sentAt)}</span>
                  <span>آخرین خطا: {formatJalaliDateTime(log.failedAt)}</span>
                  <span>تعداد تلاش: {toPersianDigits(log.attemptCount)}</span>
                  <div className="mt-2 grid gap-2">
                    <Link href={`/dashboard/settings/notification-logs/${log.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-xs font-black text-[#4a3514] transition hover:bg-[#f4dfaa]">
                      جزئیات فنی
                    </Link>
                    {canRetry ? (
                      <MessageLogRetryDialog
                        logId={log.id}
                        channel={log.channel}
                        eventType={log.eventType}
                        status={log.status}
                        recipient={recipient}
                        title={log.title ?? getNotificationEventLabel(log.eventType)}
                        message={log.message}
                      />
                    ) : null}
                  </div>
                </aside>
              </div>
            </article>
          );
        }) : (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#d8c08b]/80 bg-[#fff9ee]/94 p-8 text-center shadow-[0_14px_44px_rgba(17,24,39,0.06)] sm:p-12">
            <span className="flex size-16 items-center justify-center rounded-3xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]"><MailCheck size={30} /></span>
            <h2 className="mt-4 text-xl font-black text-[#111827]">هنوز پیامی با این فیلتر ثبت نشده است.</h2>
            <p className="mt-2 max-w-xl text-sm font-bold leading-7 text-[#6d5f49]">پس از فعال‌سازی پیامک یا پیام‌رسان‌ها، تمام پیام‌های مشتری و مدیریت در این بخش نمایش داده می‌شود.</p>
          </div>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-sm font-bold leading-7 text-[#6d5f49] shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
        <div className="flex items-start gap-3">
          <MessageSquareText size={21} className="mt-1 shrink-0 text-[#17483f]" />
          پیام‌های ناموفق یا در صف، از طریق دکمه «ارسال مجدد» با تأیید شما دوباره ارسال می‌شوند. نتیجه ارسال مجدد و خطای احتمالی در همین سوابق ثبت می‌شود.
        </div>
      </section>
    </main>
  );
}
