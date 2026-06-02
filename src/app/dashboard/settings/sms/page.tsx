import { AlertTriangle, CheckCircle2, Clock3, MessageSquareText, PhoneForwarded, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SmsSettingsForm, type SmsSettingsFormValues } from "@/components/dashboard/settings/sms-settings-form";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsSecondaryLink,
  SettingsPageShell,
} from "@/components/dashboard/settings/settings-page-shell";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatSmsProviderLabel } from "@/lib/integrations/sms-providers";
import {
  getIntegrationStatusLabel,
  getNotificationLogs,
  getSmsIntegrationSetting,
} from "@/lib/notifications/data";
import {
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";

type SmsSetting = SmsSettingsFormValues & {
  lastTestAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  updatedAt: Date;
};

type SmsLog = {
  id: string;
  eventType: string;
  recipient: string | null;
  recipientLabel: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
};

const setupSteps = [
  "انتخاب ارائه‌دهنده پیامک",
  "دریافت API Key از پنل پیامکی",
  "ثبت شماره ارسال‌کننده",
  "ثبت شماره‌های مالک/مدیر برای پیامک‌های مدیریتی",
  "ارسال پیامک تست",
];

function statusClass(status: string) {
  if (status === "متصل") {
    return "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]";
  }

  if (status === "خطا در اتصال") {
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  }

  if (status === "آماده تست" || status === "نیازمند تکمیل") {
    return "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
  }

  return "border-[#d8c08b]/62 bg-white/60 text-[#5f533f]";
}

function logStatusClass(status: string) {
  switch (status) {
    case "SENT":
      return "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]";
    case "FAILED":
      return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
    case "QUEUED":
      return "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]";
    default:
      return "border-[#d8c08b]/62 bg-white/70 text-[#5f533f]";
  }
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof PhoneForwarded;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "border-[#d8c08b]/62 bg-white/55 text-[#111827]",
    success: "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]",
    warning: "border-[#e4c98a] bg-[#fff7e6] text-[#7a4a12]",
    danger: "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-[0_12px_34px_rgba(17,24,39,0.04)] ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-black opacity-85">
        <Icon size={16} />
        {label}
      </div>
      <p className="mt-3 break-words text-sm font-black leading-7">{value}</p>
    </div>
  );
}

function canSendSmsTest(setting: SmsSetting | null) {
  return Boolean(setting?.isEnabled && setting.provider && setting.apiKeyMasked && setting.managerMobile);
}

function testDisabledReason(setting: SmsSetting | null) {
  if (!setting?.isEnabled) {
    return "ابتدا پیامک را فعال کنید.";
  }

  if (!setting.provider || !setting.apiKeyMasked || !setting.managerMobile) {
    return "ابتدا ارائه‌دهنده، کلید API و شماره‌های مالک/مدیر را ذخیره کنید.";
  }

  return "";
}

export default async function SmsSettingsPage() {
  const membership = await requireTenantMember();
  const setting = (await getSmsIntegrationSetting(membership.tenantId)) as SmsSetting | null;
  const logs = (await getNotificationLogs(membership.tenantId, { channel: "SMS" })) as SmsLog[];
  const latestLogs = logs.slice(0, 5);
  const status = getIntegrationStatusLabel(
    setting
      ? {
          isEnabled: setting.isEnabled,
          hasSecret: Boolean(setting.apiKeyMasked),
          lastSuccessAt: setting.lastSuccessAt,
          lastErrorAt: setting.lastErrorAt,
          lastErrorMessage: setting.lastErrorMessage,
        }
      : null,
  );
  const canTest = canSendSmsTest(setting);

  return (
    <SettingsPageShell
      title="تنظیمات پنل پیامکی"
      subtitle="برای ارسال پیامک‌های مدیریتی و پیامک‌های مشتریان، ارائه‌دهنده پیامک و اطلاعات اتصال را پیکربندی کنید."
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
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <LuxuryPanel eyebrow="وضعیت اتصال" title="خلاصه پنل پیامکی">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard label="وضعیت اتصال" value={status} icon={ShieldCheck} tone={status === "متصل" ? "success" : status === "خطا در اتصال" ? "danger" : "warning"} />
            <SummaryCard label="ارائه‌دهنده" value={formatSmsProviderLabel(setting?.provider)} icon={PhoneForwarded} />
            <SummaryCard label="شماره ارسال‌کننده" value={setting?.senderNumber ?? "ثبت نشده"} icon={MessageSquareText} />
            <SummaryCard label="شماره‌های مالک/مدیر" value={setting?.managerMobile ?? "ثبت نشده"} icon={PhoneForwarded} />
            <SummaryCard label="آخرین تست" value={formatJalaliDateTime(setting?.lastTestAt)} icon={Clock3} />
            <SummaryCard label="آخرین ارسال موفق" value={formatJalaliDateTime(setting?.lastSuccessAt)} icon={CheckCircle2} tone="success" />
          </div>
          {setting?.lastErrorMessage ? (
            <div className="mt-4 rounded-2xl border border-[#d85c5c]/30 bg-[#fff0ef] p-4 text-sm font-black leading-7 text-[#9b2c2c]">
              آخرین خطا: {setting.lastErrorMessage}
            </div>
          ) : null}
        </LuxuryPanel>

        <aside className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem]">
          <PhoneForwarded size={28} className="text-[#f0dba9]" />
          <h2 className="mt-4 text-2xl font-black">راهنمای اتصال پیامک</h2>
          <div className="mt-4 grid gap-2">
            {setupSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3 text-sm font-black text-[#f0dba9]"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0dba9] text-xs text-[#111827]">
                  {toPersianDigits(index + 1)}
                </span>
                {step}
              </div>
            ))}
          </div>
          <div className={`mt-5 rounded-2xl border p-3 text-sm font-black ${statusClass(status)}`}>
            وضعیت: {status}
          </div>
        </aside>
      </div>

      <SmsSettingsForm
        setting={setting}
        canSendTest={canTest}
        testDisabledReason={testDisabledReason(setting)}
      />

      <LuxuryPanel eyebrow="سوابق پیامک" title="آخرین لاگ‌های پیامکی">
        {latestLogs.length > 0 ? (
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
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${logStatusClass(log.status)}`}>
                        {getNotificationStatusLabel(log.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black text-[#111827]">
                      گیرنده: {log.recipientLabel ?? log.recipient ?? "ثبت نشده"}
                    </p>
                    {log.errorMessage ? (
                      <p className="mt-2 text-xs font-bold leading-6 text-[#9b2c2c]">
                        {log.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <time className="text-xs font-black text-[#7d6841]">
                    {formatJalaliDateTime(log.createdAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/55 p-5 text-center">
            <AlertTriangle className="mx-auto text-[#9f7131]" size={28} />
            <h3 className="mt-3 text-lg font-black text-[#111827]">هنوز لاگ پیامکی ثبت نشده است</h3>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              پس از ارسال پیامک تست، نتیجه ارسال در این بخش و صفحه لاگ اعلان‌ها نمایش داده می‌شود.
            </p>
          </div>
        )}
        <div className="mt-5">
          <Link
            href="/dashboard/settings/notification-logs?channel=SMS"
            className="inline-flex items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.16)] transition hover:bg-[#0f172a]"
          >
            مشاهده همه لاگ‌ها
          </Link>
        </div>
      </LuxuryPanel>
    </SettingsPageShell>
  );
}
