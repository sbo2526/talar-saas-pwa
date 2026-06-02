import {
  CheckCircle2,
  Clock3,
  Mail,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  EmailSettingsForm,
  type EmailSettingsFormValues,
} from "@/components/dashboard/settings/email-settings-form";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsSecondaryLink,
  SettingsPageShell,
} from "@/components/dashboard/settings/settings-page-shell";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getEmailIntegrationSetting,
  getEmailIntegrationStorageStatus,
  getIntegrationStatusLabel,
  getNotificationLogs,
} from "@/lib/notifications/data";
import {
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";

export const metadata = {
  title: "تنظیمات ایمیل | تالار منیجر",
};

type EmailSetting = EmailSettingsFormValues & {
  lastTestAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  updatedAt: Date;
};

type EmailLog = {
  id: string;
  eventType: string;
  recipient: string | null;
  recipientLabel: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

function statusTone(status: string) {
  if (status === "متصل")
    return "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]";
  if (status === "خطا در اتصال")
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  return "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
}

function logStatusClass(status: string) {
  if (status === "SENT")
    return "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]";
  if (status === "FAILED")
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  if (status === "QUEUED")
    return "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
  return "border-[#d8c08b]/62 bg-white/70 text-[#5f533f]";
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof Mail;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "border-[#d8c08b]/62 bg-white/55 text-[#111827]",
    success: "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]",
    warning: "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]",
    danger: "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]",
  }[tone];
  return (
    <div
      className={`rounded-2xl border p-4 shadow-[0_12px_34px_rgba(17,24,39,0.04)] ${toneClass}`}
    >
      <div className="flex items-center gap-2 text-xs font-black opacity-85">
        <Icon size={16} />
        {label}
      </div>
      <p className="mt-3 break-words text-sm font-black leading-7">{value}</p>
    </div>
  );
}

function canSendEmailTest(setting: EmailSetting | null) {
  return Boolean(
    setting?.isEnabled &&
    setting.smtpHost &&
    setting.smtpPort &&
    setting.fromEmail &&
    setting.managerEmails,
  );
}

function testDisabledReason(setting: EmailSetting | null) {
  if (!setting?.isEnabled) return "ابتدا ایمیل را فعال کنید.";
  if (
    !setting.smtpHost ||
    !setting.smtpPort ||
    !setting.fromEmail ||
    !setting.managerEmails
  )
    return "ابتدا SMTP، ایمیل فرستنده و ایمیل‌های مالک/مدیر را ذخیره کنید.";
  return "";
}

export default async function EmailSettingsPage() {
  const membership = await requireTenantMember();
  const emailStorageStatus = await getEmailIntegrationStorageStatus();
  const setting = emailStorageStatus.ready
    ? ((await getEmailIntegrationSetting(
        membership.tenantId,
      )) as EmailSetting | null)
    : null;
  const logs = (await getNotificationLogs(membership.tenantId, {
    channel: "EMAIL",
  })) as EmailLog[];
  const latestLogs = logs.slice(0, 5);
  const status = getIntegrationStatusLabel(
    setting
      ? {
          isEnabled: setting.isEnabled,
          hasSecret: Boolean(
            setting.smtpHost && setting.fromEmail && setting.managerEmails,
          ),
          lastSuccessAt: setting.lastSuccessAt,
          lastErrorAt: setting.lastErrorAt,
          lastErrorMessage: setting.lastErrorMessage,
        }
      : null,
  );
  const canTest = canSendEmailTest(setting);

  return (
    <SettingsPageShell
      title="تنظیمات ایمیل مدیریتی"
      subtitle="ایمیل‌های مدیریتی قرارداد، دریافت، هزینه، مشتری، امنیت و گزارش‌ها را به ایمیل مالک/مدیر ارسال کنید."
      badge={status}
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/messages">
            مرکز پیام‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <LuxuryPanel eyebrow="وضعیت اتصال" title="خلاصه ایمیل مدیریتی">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              label="وضعیت اتصال"
              value={status}
              icon={ShieldCheck}
              tone={
                status === "متصل"
                  ? "success"
                  : status === "خطا در اتصال"
                    ? "danger"
                    : "warning"
              }
            />
            <SummaryCard
              label="SMTP"
              value={
                setting?.smtpHost
                  ? `${setting.smtpHost}:${toPersianDigits(setting.smtpPort ?? "—")}`
                  : "ثبت نشده"
              }
              icon={ServerCog}
            />
            <SummaryCard
              label="فرستنده"
              value={setting?.fromEmail ?? "ثبت نشده"}
              icon={Mail}
            />
            <SummaryCard
              label="گیرنده‌های مدیریت"
              value={setting?.managerEmails ?? "ثبت نشده"}
              icon={Mail}
            />
            <SummaryCard
              label="آخرین تست"
              value={formatJalaliDateTime(setting?.lastTestAt)}
              icon={Clock3}
            />
            <SummaryCard
              label="آخرین ارسال موفق"
              value={formatJalaliDateTime(setting?.lastSuccessAt)}
              icon={CheckCircle2}
              tone="success"
            />
          </div>
          {setting?.lastErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-[#d85c5c]/30 bg-[#fff0ef] p-4 text-sm font-black leading-7 text-[#9b2c2c]">
              آخرین خطا: {setting.lastErrorMessage}
            </div>
          ) : null}
        </LuxuryPanel>

        <aside className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem]">
          <Mail size={30} className="text-[#f0dba9]" />
          <h2 className="mt-4 text-2xl font-black">ایمیل‌های مدیریتی</h2>
          <p className="mt-3 text-sm font-bold leading-8 text-[#f7e8be]/88">
            با فعال‌سازی این بخش، همه پیام‌های مدیریتی مهم علاوه بر کانال‌های
            فعلی، به ایمیل‌های مالک/مدیر هم ارسال و در مرکز پیام‌ها لاگ می‌شوند.
          </p>
          <div
            className={`mt-5 rounded-2xl border p-3 text-sm font-black ${statusTone(status)}`}
          >
            وضعیت: {status}
          </div>
          <Link
            href="/dashboard/settings/message-templates?channel=EMAIL"
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/12 px-4 py-3 text-sm font-black text-[#f0dba9] transition hover:bg-[#e8c478]/18"
          >
            قالب‌های ایمیل
          </Link>
        </aside>
      </div>

      {!emailStorageStatus.ready ? (
        <LuxuryPanel
          eyebrow="آماده‌سازی دیتابیس"
          title="تنظیمات ایمیل هنوز آماده ذخیره نیست"
        >
          <div className="rounded-2xl border border-[#d85c5c]/25 bg-[#fff0ef] p-4 text-sm font-black leading-8 text-[#9b2c2c]">
            {emailStorageStatus.message}
          </div>
          <div className="mt-4 rounded-2xl border border-[#d8c08b]/62 bg-white/60 p-4 text-xs font-bold leading-7 text-[#6d5f49]">
            بعد از اجرای migration/generate و ری‌استارت سرور، همین صفحه بدون خطا
            باز می‌شود و می‌توانید SMTP و ایمیل‌های مالک/مدیر را ذخیره کنید.
          </div>
        </LuxuryPanel>
      ) : null}

      <EmailSettingsForm
        setting={setting}
        canSendTest={canTest}
        testDisabledReason={
          emailStorageStatus.ready
            ? testDisabledReason(setting)
            : "ابتدا آماده‌سازی دیتابیس و Prisma Client را کامل کنید."
        }
      />

      <LuxuryPanel eyebrow="سوابق ایمیل" title="آخرین ایمیل‌های مدیریتی">
        {latestLogs.length ? (
          <div className="grid gap-3">
            {latestLogs.map((log) => (
              <article
                key={log.id}
                className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/55 p-4 shadow-[0_12px_34px_rgba(17,24,39,0.04)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#17483f]">
                        {getNotificationEventLabel(log.eventType)}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${logStatusClass(log.status)}`}
                      >
                        {getNotificationStatusLabel(log.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black text-[#111827]">
                      گیرنده:{" "}
                      {log.recipientLabel ?? log.recipient ?? "ثبت نشده"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#7d6841]">
                      {formatJalaliDateTime(log.createdAt)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/messages?channel=EMAIL&q=${encodeURIComponent(log.recipient ?? "")}`}
                    className="rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-xs font-black text-[#4a3514]"
                  >
                    مشاهده
                  </Link>
                </div>
                {log.errorMessage ? (
                  <p className="mt-3 rounded-2xl border border-[#d85c5c]/25 bg-[#fff0ef] p-3 text-xs font-black leading-6 text-[#9b2c2c]">
                    {log.errorMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-white/55 p-6 text-sm font-black text-[#6d5f49]">
            هنوز ایمیلی ثبت نشده است.
          </div>
        )}
      </LuxuryPanel>
    </SettingsPageShell>
  );
}
