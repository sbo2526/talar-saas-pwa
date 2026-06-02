"use client";

import { AlertCircle, CheckCircle2, Mail, Save, Send, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import { saveEmailSettingsAction, sendEmailTestMessageAction } from "@/lib/actions/email-settings-actions";
import { initialEmailSettingsActionState } from "@/lib/actions/email-settings-state";

export type EmailSettingsFormValues = {
  isEnabled: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUsername: string | null;
  smtpPasswordMasked: string | null;
  fromEmail: string | null;
  fromName: string | null;
  managerEmails: string | null;
  sendToManager: boolean;
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
};

type EmailSettingsFormProps = {
  setting: EmailSettingsFormValues | null;
  canSendTest: boolean;
  testDisabledReason: string;
};

const eventToggles = [
  ["sendContractEvents", "ایمیل قراردادها", "ثبت، ویرایش، تغییر وضعیت، لغو و تسویه نهایی قراردادها برای مالک/مدیر ایمیل شود.", true],
  ["sendPaymentEvents", "ایمیل دریافتی‌ها", "ثبت، ویرایش و لغو دریافتی‌ها با جزئیات مالی برای مدیریت ارسال شود.", true],
  ["sendExpenseEvents", "ایمیل هزینه‌ها", "هزینه‌های عملیاتی، وضعیت پرداخت و طرف حساب برای مدیریت ارسال شود.", true],
  ["sendCustomerEvents", "ایمیل مشتریان", "ثبت یا ویرایش مشتریان به مالک/مدیر اطلاع داده شود.", true],
  ["sendSecurityEvents", "هشدارهای امنیتی", "ورودها و رویدادهای حساس امنیتی به ایمیل مدیریت ارسال شود.", true],
  ["sendDailyReports", "گزارش روزانه ایمیلی", "خلاصه قراردادها، مراسم‌ها، دریافت‌ها، هزینه‌ها و مانده‌ها هر روز ارسال شود.", false],
  ["sendWeeklyReports", "گزارش هفتگی ایمیلی", "گزارش هفتگی عملکرد و مانده‌های قابل پیگیری ارسال شود.", false],
  ["sendMonthlyReports", "گزارش ماهانه ایمیلی", "جمع‌بندی ماهانه مالی و عملیاتی برای مدیریت ارسال شود.", false],
  ["sendEventReminders", "یادآوری مراسم فردا", "برنامه مراسم‌های فردا و چک‌لیست مدیریتی ایمیل شود.", true],
  ["sendOutstandingBalanceReminders", "یادآوری مانده‌ها", "مانده‌های قابل پیگیری قراردادها به ایمیل مدیریت ارسال شود.", true],
] as const;

const weekDays = [
  ["SATURDAY", "شنبه"],
  ["SUNDAY", "یکشنبه"],
  ["MONDAY", "دوشنبه"],
  ["TUESDAY", "سه‌شنبه"],
  ["WEDNESDAY", "چهارشنبه"],
  ["THURSDAY", "پنجشنبه"],
  ["FRIDAY", "جمعه"],
] as const;

function getToggleDefault(setting: EmailSettingsFormValues | null, name: string, fallback: boolean) {
  if (!setting) return fallback;
  return Boolean(setting[name as keyof EmailSettingsFormValues]);
}

function ActionAlert({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null;
  return (
    <div className={`flex items-start gap-2 rounded-2xl border p-3 text-sm font-black leading-7 ${ok ? "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]" : "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"}`}>
      {ok ? <CheckCircle2 size={18} className="mt-1 shrink-0" /> : <AlertCircle size={18} className="mt-1 shrink-0" />}
      {message}
    </div>
  );
}

function Field({ label, name, type = "text", defaultValue, placeholder, dir }: { label: string; name: string; type?: string; defaultValue?: string | number | null; placeholder?: string; dir?: "ltr" | "rtl" }) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <input type={type} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} dir={dir} className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15" />
    </label>
  );
}

function ToggleCard({ name, title, description, defaultChecked }: { name: string; title: string; description: string; defaultChecked: boolean }) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d8c08b]/62 bg-white/55 p-4 transition hover:border-[#c7a15a]/70 hover:bg-[#fff7e6]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
      <span className="mt-1 flex h-6 w-11 shrink-0 items-center rounded-full border border-[#d8b76a] bg-[#f8ead0] p-0.5 transition peer-checked:border-[#17483f] peer-checked:bg-[#17483f]">
        <span className="size-4 rounded-full bg-[#9f7131] transition peer-checked:translate-x-5 peer-checked:bg-[#fff8ea]" />
      </span>
      <span>
        <span className="block text-sm font-black text-[#111827]">{title}</span>
        <span className="mt-1 block text-xs font-bold leading-6 text-[#6d5f49]">{description}</span>
      </span>
    </label>
  );
}

export function EmailSettingsForm({ setting, canSendTest, testDisabledReason }: EmailSettingsFormProps) {
  const [saveState, saveAction, isSaving] = useActionState(saveEmailSettingsAction, initialEmailSettingsActionState);
  const [testState, testAction, isTesting] = useActionState(sendEmailTestMessageAction, initialEmailSettingsActionState);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
      <form action={saveAction} className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black text-[#9f7131]">پیکربندی ایمیل مدیریتی</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">اتصال SMTP و گیرنده‌های مدیریت</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">رمز SMTP رمزگذاری می‌شود. اگر قبلاً رمز را ذخیره کرده‌اید، برای حفظ مقدار فعلی فیلد رمز را خالی بگذارید.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-4 py-3 text-sm font-black text-[#111827]">
            <input type="checkbox" name="isEnabled" defaultChecked={Boolean(setting?.isEnabled)} className="peer sr-only" />
            <span className="flex h-6 w-11 items-center rounded-full border border-[#d8b76a] bg-[#f8ead0] p-0.5 transition peer-checked:border-[#17483f] peer-checked:bg-[#17483f]"><span className="size-4 rounded-full bg-[#9f7131] transition peer-checked:translate-x-5 peer-checked:bg-[#fff8ea]" /></span>
            فعال‌سازی ایمیل
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="هاست SMTP" name="smtpHost" defaultValue={setting?.smtpHost} placeholder="smtp.example.com" dir="ltr" />
          <Field label="پورت SMTP" name="smtpPort" defaultValue={setting?.smtpPort ?? 465} placeholder="465 یا 587" dir="ltr" />
          <Field label="نام کاربری SMTP" name="smtpUsername" defaultValue={setting?.smtpUsername} placeholder="معمولاً ایمیل فرستنده" dir="ltr" />
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            <span className="flex flex-wrap items-center gap-2">رمز SMTP {setting?.smtpPasswordMasked ? <span className="rounded-full border border-[#c7a15a]/35 bg-[#c7a15a]/10 px-2.5 py-1 text-xs text-[#4a3514]" dir="ltr">{setting.smtpPasswordMasked}</span> : null}</span>
            <input type="password" name="smtpPassword" placeholder="برای حفظ رمز فعلی خالی بگذارید" dir="ltr" autoComplete="new-password" className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15" />
          </label>
          <Field label="ایمیل فرستنده" name="fromEmail" defaultValue={setting?.fromEmail} placeholder="noreply@example.com" dir="ltr" />
          <Field label="نام فرستنده" name="fromName" defaultValue={setting?.fromName} placeholder="تالار منیجر / نام تالار" />
          <label className="grid gap-2 text-sm font-black text-[#111827] md:col-span-2">
            <span>ایمیل‌های مالک/مدیر</span>
            <textarea name="managerEmails" defaultValue={setting?.managerEmails ?? ""} placeholder="owner@example.com&#10;manager@example.com" dir="ltr" rows={4} className="rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 py-3 text-sm font-bold leading-7 text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15" />
            <span className="text-xs font-bold leading-6 text-[#7d6841]">برای چند گیرنده، ایمیل‌ها را با ویرگول یا خط جدید جدا کنید. پیام‌های مدیریتی به همین ایمیل‌ها ارسال می‌شوند.</span>
          </label>
          <ToggleCard name="smtpSecure" title="اتصال امن SSL/TLS" description="برای پورت ۴۶۵ روشن باشد. برای پورت ۵۸۷ می‌توانید خاموش بگذارید تا STARTTLS استفاده شود." defaultChecked={setting?.smtpSecure ?? true} />
          <ToggleCard name="sendToManager" title="ارسال به مالک/مدیر" description="تمام ایمیل‌های مدیریتی به گیرنده‌های بالا ارسال شود." defaultChecked={setting?.sendToManager ?? true} />
        </div>

        <div className="mt-6 grid gap-4 rounded-[1.5rem] border border-[#d8c08b]/55 bg-white/45 p-4 md:grid-cols-3">
          <Field label="ساعت گزارش روزانه" name="dailyReportTime" defaultValue={setting?.dailyReportTime ?? "09:00"} placeholder="09:00" dir="ltr" />
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            <span>روز گزارش هفتگی</span>
            <select name="weeklyReportDay" defaultValue={setting?.weeklyReportDay ?? ""} className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15">
              <option value="">هر هفته طبق cron</option>
              {weekDays.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Field label="روز گزارش ماهانه" name="monthlyReportDay" defaultValue={setting?.monthlyReportDay} placeholder="مثلاً 1" dir="ltr" />
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#111827]"><ShieldCheck size={18} className="text-[#17483f]" />دسته‌های ایمیل فعال</div>
          <div className="grid gap-3 md:grid-cols-2">
            {eventToggles.map(([name, title, description, fallback]) => (
              <ToggleCard key={name} name={name} title={title} description={description} defaultChecked={getToggleDefault(setting, name, fallback)} />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <ActionAlert ok={saveState.ok} message={saveState.message} />
          <button type="submit" disabled={isSaving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"><Save size={18} />{isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات ایمیل"}</button>
        </div>
      </form>

      <aside className="grid content-start gap-4">
        <form action={testAction} className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.94))] p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]">
          <Mail size={28} className="text-[#17483f]" />
          <p className="mt-3 text-xs font-black text-[#9f7131]">ایمیل تست</p>
          <h3 className="mt-2 text-xl font-black text-[#111827]">بررسی اتصال SMTP</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">یک ایمیل تست به گیرنده‌های مدیریت ارسال می‌شود و نتیجه در مرکز پیام‌ها ثبت می‌شود.</p>
          {!canSendTest ? <div className="mt-4 rounded-2xl border border-[#e4c98a] bg-white/65 p-3 text-xs font-black leading-6 text-[#7a4a12]">{testDisabledReason}</div> : null}
          <ActionAlert ok={testState.ok} message={testState.message} />
          <button type="submit" disabled={!canSendTest || isTesting} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#17483f] bg-[#17483f] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(23,72,63,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0f3a33] disabled:cursor-not-allowed disabled:border-[#d8c08b] disabled:bg-[#f4ead5] disabled:text-[#7d6841] disabled:shadow-none"><Send size={18} />{isTesting ? "در حال ارسال..." : "ارسال ایمیل تست"}</button>
        </form>
        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
          <p className="text-xs font-black text-[#9f7131]">پیشنهاد پیکربندی</p>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">برای Gmail و سرویس‌های مشابه معمولاً باید App Password بسازید. برای SMTP اختصاصی، host، port، username، password و fromEmail را از سرویس‌دهنده ایمیل بگیرید.</p>
        </div>
      </aside>
    </div>
  );
}
