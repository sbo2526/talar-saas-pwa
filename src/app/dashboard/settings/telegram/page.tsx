import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  KeyRound,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { TelegramSettingsForm } from "@/components/dashboard/settings/telegram-settings-form";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getNotificationLogs,
  getTelegramIntegrationSetting,
} from "@/lib/notifications/data";
import {
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";

type TelegramSetting = {
  isEnabled: boolean;
  botTokenMasked: string | null;
  chatId: string | null;
  chatTitle: string | null;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendExpenseEvents: boolean;
  sendCustomerEvents: boolean;
  sendSecurityEvents: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
  dailyReportTime: string | null;
  weeklyReportDay: string | null;
  monthlyReportDay: number | null;
  lastTestAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  updatedAt: Date;
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
  sentAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
};

const setupSteps = [
  "توکن بات را از BotFather دریافت و ذخیره کنید.",
  "بات را به گروه یا کانال مدیریتی اضافه کنید.",
  "شناسه یا لینک گفتگو را وارد کنید.",
  "اطلاعات گفتگو را دریافت و پیام تست ارسال کنید.",
];

function preview(value: string | null | undefined, length = 92) {
  if (!value) {
    return "—";
  }

  return value.length > length ? `${value.slice(0, length)}…` : value;
}

function getTelegramStatus(setting: TelegramSetting | null) {
  if (!setting?.isEnabled) {
    return "غیرفعال";
  }

  if (!setting.botTokenMasked) {
    return "نیازمند توکن";
  }

  if (!setting.chatId) {
    return "نیازمند گفتگو";
  }

  if (
    setting.lastErrorAt &&
    (!setting.lastSuccessAt || setting.lastErrorAt.getTime() >= setting.lastSuccessAt.getTime())
  ) {
    return "خطا در اتصال";
  }

  if (setting.lastSuccessAt) {
    return "متصل";
  }

  return "آماده تست";
}

function metricTone(status: string) {
  if (["متصل", "ثبت شده", "توکن ثبت شده", "گفتگو متصل"].includes(status)) {
    return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  }

  if (["خطا در اتصال", "ناموفق"].includes(status)) {
    return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  }

  if (["نیازمند توکن", "نیازمند گفتگو", "آماده تست", "نیازمند تکمیل"].includes(status)) {
    return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
  }

  return "border-[#111827]/12 bg-[#111827]/6 text-[#172033]";
}

function statusTone(status: string) {
  if (status === "SENT") {
    return "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]";
  }

  if (status === "FAILED") {
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  }

  return "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
}

function StatusCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
      <Icon size={22} className="text-[#17483f]" />
      <p className="mt-3 text-xs font-black text-[#7d6841]">{label}</p>
      <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-black ${metricTone(value)}`}>
        {value}
      </p>
      <p className="mt-3 text-sm font-bold leading-7 text-[#6d5f49]">{detail}</p>
    </article>
  );
}

export default async function TelegramSettingsPage() {
  const membership = await requireTenantPermission("notifications.manage");
  const setting = (await getTelegramIntegrationSetting(membership.tenantId)) as TelegramSetting | null;
  const logs = (await getNotificationLogs(membership.tenantId, { channel: "TELEGRAM" })) as NotificationLogRow[];
  const recentLogs = logs.slice(0, 5);
  const status = getTelegramStatus(setting);
  const hasToken = Boolean(setting?.botTokenMasked);
  const hasChat = Boolean(setting?.chatId);
  const canSendTest = Boolean(setting?.isEnabled && hasToken && hasChat);
  const lastErrorIsCurrent = Boolean(
    setting?.lastErrorAt &&
      (!setting.lastSuccessAt || setting.lastErrorAt.getTime() >= setting.lastSuccessAt.getTime()),
  );

  return (
    <SettingsPageShell
      title="تنظیمات تلگرام"
      subtitle="بات تلگرام را به گفت‌وگوی مدیریتی متصل کنید تا اعلان قراردادها، دریافت‌ها، هزینه‌ها و گزارش‌ها به‌صورت خودکار ارسال شوند."
      badge={status}
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/settings/notifications">
            بازگشت به اعلان‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={Bot}
          label="وضعیت بات"
          value={hasToken ? "توکن ثبت شده" : "نیازمند توکن"}
          detail={hasToken ? "توکن رمزگذاری‌شده در سامانه ذخیره شده است." : "برای شروع اتصال، توکن BotFather را ذخیره کنید."}
        />
        <StatusCard
          icon={MessageCircle}
          label="وضعیت گفتگو"
          value={hasChat ? "گفتگو متصل" : "نیازمند گفتگو"}
          detail={hasChat ? setting?.chatTitle ?? setting?.chatId ?? "گفتگو ذخیره شده است." : "شناسه گفتگو را دستی وارد کنید یا از دریافت هوشمند استفاده کنید."}
        />
        <StatusCard
          icon={CheckCircle2}
          label="آخرین ارسال موفق"
          value={setting?.lastSuccessAt ? "متصل" : "آماده تست"}
          detail={formatJalaliDateTime(setting?.lastSuccessAt)}
        />
        <StatusCard
          icon={lastErrorIsCurrent ? AlertTriangle : Clock3}
          label="آخرین خطا"
          value={lastErrorIsCurrent ? "خطا در اتصال" : "ثبت نشده"}
          detail={lastErrorIsCurrent ? preview(setting?.lastErrorMessage, 68) : "خطای فعالی برای اتصال تلگرام ثبت نشده است."}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <LuxuryPanel eyebrow="راه‌اندازی سریع" title="راه‌اندازی سریع تلگرام">
          <div className="grid gap-3">
            {setupSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-[#d8c08b]/62 bg-white/55 p-4"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-sm font-black text-[#17483f]">
                  {toPersianDigits(index + 1)}
                </span>
                <span className="text-sm font-black leading-7 text-[#111827]">{step}</span>
              </div>
            ))}
          </div>
        </LuxuryPanel>

        <aside className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem]">
          <ShieldCheck size={28} className="text-[#f0dba9]" />
          <h2 className="mt-4 text-2xl font-black">اتصال امن و هوشمند</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#d9caa9]">
            توکن بات فقط سمت سرور رمزگشایی می‌شود. دریافت شناسه گفتگو، جستجوی
            گفتگوهای اخیر و ارسال پیام تست همگی server-side انجام می‌شوند.
          </p>
          <div className="gold-divider my-5" />
          <div className="grid gap-3 text-sm font-black">
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
              <KeyRound size={17} className="text-[#f0dba9]" />
              <span dir="ltr">{setting?.botTokenMasked ?? "توکن ثبت نشده"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
              <Search size={17} className="text-[#f0dba9]" />
              دریافت خودکار شناسه و عنوان گفتگو
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
              <Send size={17} className="text-[#f0dba9]" />
              تست اتصال با ثبت لاگ اعلان
            </div>
          </div>
        </aside>
      </div>

      <TelegramSettingsForm
        setting={setting}
        canSendTest={canSendTest}
        testDisabledReason="ابتدا تلگرام را فعال کرده و توکن و شناسه گفتگو را ذخیره کنید."
      />

      <LuxuryPanel eyebrow="لاگ‌های اخیر" title="آخرین پیام‌های تلگرام">
        {recentLogs.length ? (
          <div className="grid gap-3">
            {recentLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/60 p-4 shadow-[0_12px_36px_rgba(17,24,39,0.05)]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusTone(log.status)}`}>
                        {getNotificationStatusLabel(log.status)}
                      </span>
                      <span className="rounded-full border border-[#d8c08b]/70 bg-[#fff7e6] px-2.5 py-1 text-xs font-black text-[#4a3514]">
                        {getNotificationEventLabel(log.eventType)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-black text-[#111827]">
                      {log.title ?? "پیام تلگرام"}
                    </h3>
                    {log.status === "FAILED" && log.errorMessage ? (
                      <p className="mt-2 text-sm font-bold leading-7 text-[#9b2c2c]">
                        {preview(log.errorMessage, 140)}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-1 text-xs font-black text-[#7d6841] lg:text-left">
                    <span>ثبت: {formatJalaliDateTime(log.createdAt)}</span>
                    <span>گیرنده: {log.recipientLabel ?? log.recipient ?? "—"}</span>
                    <span>تلاش: {toPersianDigits(log.attemptCount)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-5 text-center">
            <p className="text-base font-black text-[#111827]">هنوز پیام تلگرامی ثبت نشده است.</p>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              پس از ارسال پیام تست، نتیجه در همین بخش و صفحه لاگ اعلان‌ها نمایش داده می‌شود.
            </p>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Link
            href="/dashboard/settings/notification-logs?channel=TELEGRAM"
            className="inline-flex items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-sm font-black text-[#4a3514] shadow-sm transition hover:bg-[#f4dfaa] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
          >
            مشاهده همه لاگ‌ها
          </Link>
        </div>
      </LuxuryPanel>
    </SettingsPageShell>
  );
}
