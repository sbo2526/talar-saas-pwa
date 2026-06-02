import { BellRing, CalendarClock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { BackToSettingsLink, LuxuryPanel, SettingsPageShell } from "@/components/dashboard/settings/settings-page-shell";
import { ScheduledReportActionButton } from "@/components/dashboard/settings/scheduled-report-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getIntegrationStatusLabel,
  getNotificationLogs,
  getNotificationSettingsOverview,
} from "@/lib/notifications/data";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";
import {
  getHeaderNotifications,
  syncInAppNotificationsForTenant,
} from "@/lib/notifications/in-app-notification-service";

const scheduledItems = [
  { type: "daily", title: "گزارش روزانه", description: "خلاصه دریافت‌ها، هزینه‌ها، مراسم‌های فردا و مانده‌ها", label: "ارسال روزانه" },
  { type: "weekly", title: "گزارش هفتگی", description: "عملکرد مالی و مراسم‌های هفته آینده", label: "ارسال هفتگی" },
  { type: "monthly", title: "گزارش ماهانه", description: "جمع‌بندی قراردادها، سود تقریبی و مانده‌ها", label: "ارسال ماهانه" },
  { type: "tomorrow", title: "یادآوری مراسم فردا", description: "فهرست مراسم‌های فردا برای تیم مدیریت", label: "ارسال یادآوری" },
  { type: "outstanding", title: "یادآوری مانده‌ها", description: "قراردادهای دارای مانده قابل پیگیری", label: "ارسال مانده‌ها" },
] as const;

type NotificationLogPreview = {
  id: string;
  channel: string;
  eventType: string;
  status: string;
  title: string | null;
  errorMessage: string | null;
  createdAt: Date;
};

const categoryItems = ["قراردادها", "دریافت‌ها", "هزینه‌ها", "مشتریان", "امنیت"];

function StatusPill({ label }: { label: string }) {
  const color = label === "متصل" ? "border-[#2f8f68]/30 bg-[#eefaf3] text-[#176246]" : label === "خطا در اتصال" ? "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]" : "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${color}`}>{label}</span>;
}

export default async function NotificationSettingsPage() {
  const membership = await requireTenantMember();
  await syncInAppNotificationsForTenant({ tenantId: membership.tenantId, userId: membership.userId });
  const [overview, latestLogsResult, inAppOverview] = await Promise.all([
    getNotificationSettingsOverview(membership.tenantId),
    getNotificationLogs(membership.tenantId, {}),
    getHeaderNotifications({ tenantId: membership.tenantId, userId: membership.userId, limit: 8 }),
  ]);
  const latestLogs = latestLogsResult as NotificationLogPreview[];
  const telegramStatus = getIntegrationStatusLabel(overview.telegramStatus);
  const baleStatus = getIntegrationStatusLabel(overview.baleStatus);
  const rubikaStatus = getIntegrationStatusLabel(overview.rubikaStatus);
  const smsStatus = getIntegrationStatusLabel(overview.smsStatus);
  const emailStatus = getIntegrationStatusLabel(overview.emailStatus);

  return (
    <SettingsPageShell
      title="تنظیمات اعلان‌ها"
      subtitle="کانال‌های اطلاع‌رسانی، گزارش‌های زمان‌بندی‌شده، یادآوری‌ها و سوابق ارسال اعلان‌های مدیریتی را از این مرکز کنترل کنید."
      badge="مرکز اعلان‌ها"
      tenantName={membership.tenant.name}
      actions={<BackToSettingsLink />}
    >
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9f7131]">کانال فعال</p>
              <h2 className="mt-2 text-xl font-black text-[#111827]">تلگرام</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">اعلان‌های مدیریتی و گزارش‌ها در گفت‌وگوی تلگرام ارسال می‌شوند.</p>
            </div>
            <StatusPill label={telegramStatus} />
          </div>
          {overview.telegramStatus?.lastSuccessAt ? <p className="mt-3 text-xs font-bold text-[#176246]">آخرین موفقیت: {formatJalaliDateTime(overview.telegramStatus.lastSuccessAt)}</p> : null}
          {overview.telegramStatus?.lastErrorMessage ? <p className="mt-3 text-xs font-bold text-[#9b2c2c]">آخرین خطا: {overview.telegramStatus.lastErrorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings/telegram" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">تنظیمات تلگرام</Link>
            <Link href="/dashboard/settings/notification-logs?channel=TELEGRAM" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ‌های تلگرام</Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9f7131]">کانال فعال</p>
              <h2 className="mt-2 text-xl font-black text-[#111827]">بله</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">اعلان‌های مدیریتی و گزارش‌ها در گفت‌وگوی بله ارسال می‌شوند.</p>
            </div>
            <StatusPill label={baleStatus} />
          </div>
          {overview.baleStatus?.lastSuccessAt ? <p className="mt-3 text-xs font-bold text-[#176246]">آخرین موفقیت: {formatJalaliDateTime(overview.baleStatus.lastSuccessAt)}</p> : null}
          {overview.baleStatus?.lastErrorMessage ? <p className="mt-3 text-xs font-bold text-[#9b2c2c]">آخرین خطا: {overview.baleStatus.lastErrorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings/bale" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">تنظیمات بله</Link>
            <Link href="/dashboard/settings/notification-logs?channel=BALE" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ‌های بله</Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9f7131]">کانال فعال</p>
              <h2 className="mt-2 text-xl font-black text-[#111827]">روبیکا</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">اعلان‌های مدیریتی و گزارش‌ها در گفت‌وگوی روبیکا ارسال می‌شوند.</p>
            </div>
            <StatusPill label={rubikaStatus} />
          </div>
          {overview.rubikaStatus?.lastSuccessAt ? <p className="mt-3 text-xs font-bold text-[#176246]">آخرین موفقیت: {formatJalaliDateTime(overview.rubikaStatus.lastSuccessAt)}</p> : null}
          {overview.rubikaStatus?.lastErrorMessage ? <p className="mt-3 text-xs font-bold text-[#9b2c2c]">آخرین خطا: {overview.rubikaStatus.lastErrorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings/rubika" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">تنظیمات روبیکا</Link>
            <Link href="/dashboard/settings/notification-logs?channel=RUBIKA" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ‌های روبیکا</Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9f7131]">کانال فعال</p>
              <h2 className="mt-2 text-xl font-black text-[#111827]">پیامک</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">گزارش‌های کوتاه مدیریتی برای شماره مدیر ارسال می‌شوند.</p>
            </div>
            <StatusPill label={smsStatus} />
          </div>
          {overview.smsStatus?.lastSuccessAt ? <p className="mt-3 text-xs font-bold text-[#176246]">آخرین موفقیت: {formatJalaliDateTime(overview.smsStatus.lastSuccessAt)}</p> : null}
          {overview.smsStatus?.lastErrorMessage ? <p className="mt-3 text-xs font-bold text-[#9b2c2c]">آخرین خطا: {overview.smsStatus.lastErrorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings/sms" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">تنظیمات پیامک</Link>
            <Link href="/dashboard/settings/notification-logs?channel=SMS" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ‌های پیامک</Link>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black text-[#9f7131]">کانال فعال</p>
              <h2 className="mt-2 text-xl font-black text-[#111827]">ایمیل</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">همه پیام‌های مدیریتی می‌توانند به ایمیل مالک/مدیر ارسال شوند.</p>
            </div>
            <StatusPill label={emailStatus} />
          </div>
          {overview.emailStatus?.lastSuccessAt ? <p className="mt-3 text-xs font-bold text-[#176246]">آخرین موفقیت: {formatJalaliDateTime(overview.emailStatus.lastSuccessAt)}</p> : null}
          {overview.emailStatus?.lastErrorMessage ? <p className="mt-3 text-xs font-bold text-[#9b2c2c]">آخرین خطا: {overview.emailStatus.lastErrorMessage}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/settings/email" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">تنظیمات ایمیل</Link>
            <Link href="/dashboard/settings/notification-logs?channel=EMAIL" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ‌های ایمیل</Link>
          </div>
        </div>
      </div>

      <LuxuryPanel eyebrow="داخل برنامه" title="اعلان‌های داخل برنامه">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8b76a]/60 bg-[#fff7e6] text-[#4a3514]">
                <BellRing size={20} />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#111827]">زنگوله اعلان‌های داشبورد</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                  یادآوری‌های داخلی داشبورد برای مراسم نزدیک، مانده قراردادها، خطاهای ارسال و تکمیل اطلاعات از زنگوله بالای صفحه نمایش داده می‌شوند.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard" className="rounded-2xl bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">مشاهده در داشبورد</Link>
              <Link href="/dashboard/settings/notification-logs" className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">لاگ اعلان‌های بیرونی</Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4">
              <p className="text-xs font-black text-[#9f7131]">موارد فعال</p>
              <p className="mt-2 text-2xl font-black text-[#111827]">{toPersianDigits(inAppOverview.items.length)}</p>
            </div>
            <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4">
              <p className="text-xs font-black text-[#9f7131]">خوانده‌نشده</p>
              <p className="mt-2 text-2xl font-black text-[#111827]">{toPersianDigits(inAppOverview.unreadCount)}</p>
            </div>
            <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4">
              <p className="text-xs font-black text-[#9f7131]">فوری</p>
              <p className="mt-2 text-2xl font-black text-[#9b2c2c]">{toPersianDigits(inAppOverview.criticalCount)}</p>
            </div>
          </div>
        </div>
      </LuxuryPanel>

      <LuxuryPanel eyebrow="گزارش‌ها" title="گزارش‌های زمان‌بندی‌شده و ارسال دستی">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {scheduledItems.map((item) => (
            <div key={item.type} className="grid gap-4 rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4">
              <div>
                <CalendarClock size={20} className="text-[#17483f]" />
                <h3 className="mt-3 text-sm font-black text-[#111827]">{item.title}</h3>
                <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">{item.description}</p>
              </div>
              <ScheduledReportActionButton type={item.type} label={item.label} />
            </div>
          ))}
        </div>
      </LuxuryPanel>

      <LuxuryPanel eyebrow="رویدادها" title="دسته‌های اعلان عملیاتی">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {categoryItems.map((event) => (
            <div key={event} className="flex items-center gap-3 rounded-2xl border border-[#d8c08b]/62 bg-white/55 p-3 text-sm font-black text-[#111827]">
              <CheckCircle2 size={18} className="shrink-0 text-[#17483f]" />
              {event}
            </div>
          ))}
        </div>
      </LuxuryPanel>

      <LuxuryPanel eyebrow="سوابق" title="آخرین اعلان‌ها">
        <div className="grid gap-3">
          {latestLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="rounded-2xl border border-[#d8c08b]/55 bg-white/55 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="rounded-full border border-[#d8b76a] bg-[#fff7e6] px-2.5 py-1 text-[#4a3514]">{getNotificationChannelLabel(log.channel)}</span>
                  <span className="rounded-full border border-[#d8c08b]/70 bg-white/70 px-2.5 py-1 text-[#111827]">{getNotificationEventLabel(log.eventType)}</span>
                  <span className="rounded-full border border-[#2f8f68]/20 bg-[#eefaf3] px-2.5 py-1 text-[#176246]">{getNotificationStatusLabel(log.status)}</span>
                </div>
                <span className="text-xs font-bold text-[#6d5f49]">{formatJalaliDateTime(log.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm font-black text-[#111827]">{log.title || getNotificationEventLabel(log.eventType)}</p>
              {log.errorMessage ? <p className="mt-1 text-xs font-bold text-[#9b2c2c]">{log.errorMessage}</p> : null}
            </div>
          ))}
          {latestLogs.length === 0 ? <p className="rounded-2xl border border-[#d8c08b]/55 bg-white/55 p-4 text-sm font-bold text-[#6d5f49]">هنوز اعلانی ثبت نشده است.</p> : null}
        </div>
        <Link href="/dashboard/settings/notification-logs" className="mt-4 inline-flex rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514]">مشاهده همه لاگ‌ها</Link>
      </LuxuryPanel>
    </SettingsPageShell>
  );
}
