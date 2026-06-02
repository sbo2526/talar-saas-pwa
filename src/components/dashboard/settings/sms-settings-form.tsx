"use client";

import { AlertCircle, CheckCircle2, Save, Send, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import {
  saveSmsSettingsAction,
  sendSmsTestMessageAction,
} from "@/lib/actions/sms-settings-actions";
import { initialSmsSettingsActionState } from "@/lib/actions/sms-settings-state";
import { SMS_PROVIDERS, smsProviderLabels } from "@/lib/integrations/sms-providers";

export type SmsSettingsFormValues = {
  isEnabled: boolean;
  provider: string | null;
  apiKeyMasked: string | null;
  senderNumber: string | null;
  managerMobile: string | null;
  sendToManager: boolean;
  sendToCustomer: boolean;
  sendContractEvents: boolean;
  sendPaymentEvents: boolean;
  sendExpenseEvents: boolean;
  sendCustomerEvents: boolean;
  sendDailyReports: boolean;
  sendWeeklyReports: boolean;
  sendMonthlyReports: boolean;
  sendEventReminders: boolean;
  sendOutstandingBalanceReminders: boolean;
};

type SmsSettingsFormProps = {
  setting: SmsSettingsFormValues | null;
  canSendTest: boolean;
  testDisabledReason: string;
};

const deliveryToggles = [
  {
    name: "sendToManager",
    title: "ارسال به مالک/مدیر",
    description: "پیامک‌های مدیریتی به همه شماره‌های ثبت‌شده ارسال شود.",
    defaultChecked: true,
  },
  {
    name: "sendToCustomer",
    title: "ارسال مستقیم به مشتریان",
    description: "خوش‌آمدگویی، جزئیات قرارداد، ثبت دریافت و صورتحساب برای شماره خود مشتری ارسال شود.",
    defaultChecked: true,
  },
] as const;

const eventToggles = [
  {
    name: "sendContractEvents",
    title: "اعلان قراردادها",
    description: "برای مدیر: ثبت و تغییر قراردادها؛ برای مشتری: جزئیات قرارداد جدید",
    defaultChecked: true,
  },
  {
    name: "sendPaymentEvents",
    title: "اعلان دریافتی‌ها",
    description: "برای مدیر: ثبت و تغییر دریافت‌ها؛ برای مشتری: ثبت دریافت جدید",
    defaultChecked: true,
  },
  {
    name: "sendExpenseEvents",
    title: "اعلان هزینه‌ها",
    description: "ثبت و لغو هزینه‌های عملیاتی",
    defaultChecked: true,
  },
  {
    name: "sendCustomerEvents",
    title: "اعلان مشتریان",
    description: "برای مدیر: ثبت یا ویرایش مشتری. پیام خوش‌آمدگویی مشتری با گزینه ارسال مستقیم به مشتریان کنترل می‌شود.",
    defaultChecked: true,
  },
  {
    name: "sendDailyReports",
    title: "گزارش روزانه پیامکی",
    description: "خلاصه کوتاه روزانه برای مدیر ارسال شود.",
    defaultChecked: false,
  },
  {
    name: "sendWeeklyReports",
    title: "گزارش هفتگی پیامکی",
    description: "خلاصه کوتاه هفته برای مدیر ارسال شود.",
    defaultChecked: false,
  },
  {
    name: "sendMonthlyReports",
    title: "گزارش ماهانه پیامکی",
    description: "خلاصه کوتاه ماه برای مدیر ارسال شود.",
    defaultChecked: false,
  },
  {
    name: "sendEventReminders",
    title: "یادآوری مراسم فردا",
    description: "یادآوری کوتاه مراسم‌های فردا برای مدیر",
    defaultChecked: true,
  },
  {
    name: "sendOutstandingBalanceReminders",
    title: "یادآوری مانده‌ها",
    description: "پیگیری خلاصه مانده‌های مهم برای مدیر",
    defaultChecked: true,
  },
] as const;

function getToggleDefault(setting: SmsSettingsFormValues | null, name: string, fallback: boolean) {
  if (!setting) {
    return fallback;
  }

  return Boolean(setting[name as keyof SmsSettingsFormValues]);
}

function ActionAlert({ ok, message }: { ok: boolean; message: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border p-3 text-sm font-black leading-7 ${
        ok
          ? "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]"
          : "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"
      }`}
    >
      {ok ? <CheckCircle2 size={18} className="mt-1 shrink-0" /> : <AlertCircle size={18} className="mt-1 shrink-0" />}
      {message}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        dir={dir}
        className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
      >
        {children}
      </select>
    </label>
  );
}

function ToggleCard({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d8c08b]/62 bg-white/55 p-4 transition hover:border-[#c7a15a]/70 hover:bg-[#fff7e6]">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
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

export function SmsSettingsForm({
  setting,
  canSendTest,
  testDisabledReason,
}: SmsSettingsFormProps) {
  const [saveState, saveAction, isSaving] = useActionState(
    saveSmsSettingsAction,
    initialSmsSettingsActionState,
  );
  const [testState, testAction, isTesting] = useActionState(
    sendSmsTestMessageAction,
    initialSmsSettingsActionState,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_21rem]">
      <form
        action={saveAction}
        className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black text-[#9f7131]">پیکربندی اتصال</p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">اطلاعات پنل پیامکی</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              اگر کلید API قبلاً ثبت شده است، برای حفظ مقدار فعلی این فیلد را خالی بگذارید.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-4 py-3 text-sm font-black text-[#111827]">
            <input
              type="checkbox"
              name="isEnabled"
              defaultChecked={Boolean(setting?.isEnabled)}
              className="peer sr-only"
            />
            <span className="flex h-6 w-11 items-center rounded-full border border-[#d8b76a] bg-[#f8ead0] p-0.5 transition peer-checked:border-[#17483f] peer-checked:bg-[#17483f]">
              <span className="size-4 rounded-full bg-[#9f7131] transition peer-checked:translate-x-5 peer-checked:bg-[#fff8ea]" />
            </span>
            فعال‌سازی پیامک
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Select label="ارائه‌دهنده پیامک" name="provider" defaultValue={setting?.provider}>
            <option value="">انتخاب ارائه‌دهنده</option>
            {SMS_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {smsProviderLabels[provider]}
              </option>
            ))}
          </Select>
          <Field
            label="شماره ارسال‌کننده"
            name="senderNumber"
            defaultValue={setting?.senderNumber}
            placeholder="مثلاً ۱۰۰۰xxxx"
            dir="ltr"
          />
          <label className="grid gap-2 text-sm font-black text-[#111827] md:col-span-2">
            <span className="flex flex-wrap items-center gap-2">
              کلید API
              {setting?.apiKeyMasked ? (
                <span className="rounded-full border border-[#c7a15a]/35 bg-[#c7a15a]/10 px-2.5 py-1 text-xs text-[#4a3514]" dir="ltr">
                  {setting.apiKeyMasked}
                </span>
              ) : null}
            </span>
            <input
              type="password"
              name="apiKey"
              placeholder="اگر قبلاً ثبت شده، برای حفظ کلید این فیلد را خالی بگذارید"
              dir="ltr"
              autoComplete="new-password"
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            />
          </label>
          <Field
            label="شماره‌های مالک/مدیر"
            name="managerMobile"
            defaultValue={setting?.managerMobile}
            placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹، ۰۹۱۲۳۴۵۶۷۸۸"
            dir="ltr"
          />
          <p className="-mt-2 text-xs font-bold leading-6 text-[#7d6841] md:col-span-2">
            برای چند گیرنده، شماره‌ها را با ویرگول یا خط جدید جدا کنید. حداکثر ۱۰ شماره معتبر ایران پذیرفته می‌شود.
          </p>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#111827]">
            <ShieldCheck size={18} className="text-[#17483f]" />
            مقصدهای ارسال
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {deliveryToggles.map((item) => (
              <ToggleCard
                key={item.name}
                name={item.name}
                title={item.title}
                description={item.description}
                defaultChecked={getToggleDefault(setting, item.name, item.defaultChecked)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#111827]">
            <ShieldCheck size={18} className="text-[#17483f]" />
            دسته‌های اعلان فعال
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {eventToggles.map((item) => (
              <ToggleCard
                key={item.name}
                name={item.name}
                title={item.title}
                description={item.description}
                defaultChecked={getToggleDefault(setting, item.name, item.defaultChecked)}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <ActionAlert ok={saveState.ok} message={saveState.message} />
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
          </button>
        </div>
      </form>

      <aside className="grid content-start gap-4">
        <form
          action={testAction}
          className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.94))] p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]"
        >
          <p className="text-xs font-black text-[#9f7131]">پیامک تست</p>
          <h3 className="mt-2 text-xl font-black text-[#111827]">بررسی اتصال پنل پیامکی</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            با ارسال پیامک تست، یک لاگ اعلان ثبت می‌شود و نتیجه ارسال در سوابق اعلان‌ها قابل پیگیری است.
          </p>
          {!canSendTest ? (
            <div className="mt-4 rounded-2xl border border-[#e4c98a] bg-white/65 p-3 text-xs font-black leading-6 text-[#7a4a12]">
              {testDisabledReason}
            </div>
          ) : null}
          <ActionAlert ok={testState.ok} message={testState.message} />
          <button
            type="submit"
            disabled={!canSendTest || isTesting}
            aria-disabled={!canSendTest || isTesting}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#17483f] bg-[#17483f] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(23,72,63,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0f3a33] disabled:cursor-not-allowed disabled:border-[#d8c08b] disabled:bg-[#f4ead5] disabled:text-[#7d6841] disabled:shadow-none"
          >
            <Send size={18} />
            {isTesting ? "در حال ارسال..." : "ارسال پیامک تست"}
          </button>
        </form>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
          <p className="text-xs font-black text-[#9f7131]">نکته امنیتی</p>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            کلید API پس از ذخیره رمزگذاری می‌شود و فقط نسخه پوشیده‌شده آن در رابط کاربری دیده می‌شود.
          </p>
        </div>
      </aside>
    </div>
  );
}
