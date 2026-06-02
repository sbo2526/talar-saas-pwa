"use client";

import {
  AlertCircle,
  CheckCircle2,
  ListChecks,
  MessageCircle,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useActionState, useRef } from "react";
import {
  discoverTelegramChatAction,
  fetchTelegramRecentChatsAction,
  saveTelegramSettingsAction,
  selectTelegramDiscoveredChatAction,
  sendTelegramTestMessageAction,
} from "@/lib/actions/telegram-settings-actions";
import { initialTelegramSettingsActionState } from "@/lib/actions/telegram-settings-state";
import { toPersianDigits } from "@/lib/date/jalali";

export type TelegramSettingsFormValues = {
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
};

type TelegramSettingsFormProps = {
  setting: TelegramSettingsFormValues | null;
  canSendTest: boolean;
  testDisabledReason: string;
};

const eventToggles = [
  {
    name: "sendContractEvents",
    title: "قراردادها",
    description: "ثبت، ویرایش و تغییر وضعیت قراردادها",
    defaultChecked: true,
  },
  {
    name: "sendPaymentEvents",
    title: "دریافتی‌ها",
    description: "ثبت، ویرایش یا لغو دریافت‌ها",
    defaultChecked: true,
  },
  {
    name: "sendExpenseEvents",
    title: "هزینه‌ها",
    description: "ثبت یا لغو هزینه‌های عملیاتی",
    defaultChecked: true,
  },
  {
    name: "sendCustomerEvents",
    title: "مشتریان",
    description: "ثبت یا ویرایش اطلاعات مشتریان",
    defaultChecked: false,
  },
  {
    name: "sendSecurityEvents",
    title: "اعلان‌های امنیتی",
    description: "رویدادهای حساس حساب و تنظیمات",
    defaultChecked: false,
  },
  {
    name: "sendDailyReports",
    title: "گزارش روزانه",
    description: "خلاصه عملکرد روزانه در تلگرام",
    defaultChecked: false,
  },
  {
    name: "sendWeeklyReports",
    title: "گزارش هفتگی",
    description: "خلاصه هفتگی قراردادها و دریافت‌ها",
    defaultChecked: false,
  },
  {
    name: "sendMonthlyReports",
    title: "گزارش ماهانه",
    description: "خلاصه ماهانه مدیریتی",
    defaultChecked: false,
  },
  {
    name: "sendEventReminders",
    title: "یادآوری مراسم",
    description: "یادآوری مراسم‌های پیش‌رو",
    defaultChecked: false,
  },
  {
    name: "sendOutstandingBalanceReminders",
    title: "یادآوری مانده‌ها",
    description: "پیگیری قراردادهای دارای مانده",
    defaultChecked: false,
  },
] as const;

const weekDays = [
  { value: "SATURDAY", label: "شنبه" },
  { value: "SUNDAY", label: "یکشنبه" },
  { value: "MONDAY", label: "دوشنبه" },
  { value: "TUESDAY", label: "سه‌شنبه" },
  { value: "WEDNESDAY", label: "چهارشنبه" },
  { value: "THURSDAY", label: "پنجشنبه" },
  { value: "FRIDAY", label: "جمعه" },
];

const dailyTimeOptions = [
  "08:00",
  "09:00",
  "10:00",
  "12:00",
  "18:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
];

function getToggleDefault(setting: TelegramSettingsFormValues | null, name: string, fallback: boolean) {
  if (!setting) {
    return fallback;
  }

  return Boolean(setting[name as keyof TelegramSettingsFormValues]);
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
  value,
  defaultValue,
  onChange,
  type = "text",
  placeholder,
  dir,
  readOnly = false,
}: {
  label: string;
  name: string;
  value?: string;
  defaultValue?: string | number | null;
  onChange?: (value: string) => void;
  type?: string;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        defaultValue={value === undefined ? (defaultValue ?? "") : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        dir={dir}
        readOnly={readOnly}
        className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15 read-only:bg-[#fff7e6]"
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

function ChatTypeLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    private: "خصوصی",
    group: "گروه",
    supergroup: "سوپرگروه",
    channel: "کانال",
  };

  return labels[type] ?? "گفتگو";
}

export function TelegramSettingsForm({
  setting,
  canSendTest,
  testDisabledReason,
}: TelegramSettingsFormProps) {
  const tokenRef = useRef<HTMLInputElement>(null);
  const [saveState, saveAction, isSaving] = useActionState(
    saveTelegramSettingsAction,
    initialTelegramSettingsActionState,
  );
  const [testState, testAction, isTesting] = useActionState(
    sendTelegramTestMessageAction,
    initialTelegramSettingsActionState,
  );
  const [discoverState, discoverAction, isDiscovering] = useActionState(
    discoverTelegramChatAction,
    initialTelegramSettingsActionState,
  );
  const [recentState, recentAction, isFetchingRecent] = useActionState(
    fetchTelegramRecentChatsAction,
    initialTelegramSettingsActionState,
  );
  const [selectState, selectAction, isSelecting] = useActionState(
    selectTelegramDiscoveredChatAction,
    initialTelegramSettingsActionState,
  );

  const hasToken = Boolean(setting?.botTokenMasked);
  const chatId = selectState.chatId ?? discoverState.chatId ?? setting?.chatId ?? "";
  const chatTitle = selectState.chatTitle ?? discoverState.chatTitle ?? setting?.chatTitle ?? "";

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
      <div className="grid gap-5">
        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#9f7131]">توکن بات</p>
              <h2 className="mt-2 text-2xl font-black text-[#111827]">
                توکن بات تلگرام
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                اگر می‌خواهید بات را تغییر دهید، توکن جدید را وارد کنید؛ در غیر
                این صورت فیلد را خالی بگذارید.
              </p>
            </div>
            <span
              className={
                hasToken
                  ? "inline-flex w-fit items-center gap-2 rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"
                  : "inline-flex w-fit items-center gap-2 rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1.5 text-xs font-black text-[#7d6841]"
              }
            >
              {hasToken ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {hasToken ? "توکن بات ثبت شده است" : "نیازمند ثبت توکن"}
            </span>
          </div>

          {hasToken ? (
            <div className="mt-4 rounded-2xl border border-[#25a46d]/20 bg-[#ecfff5] px-4 py-3 text-sm font-black text-[#176246]">
              توکن ذخیره‌شده: <span dir="ltr">{setting?.botTokenMasked}</span>
            </div>
          ) : null}

          <form action={saveAction} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black text-[#111827]">
              <span>توکن بات تلگرام</span>
              <input
                ref={tokenRef}
                type="password"
                name="botToken"
                placeholder="برای حفظ توکن فعلی، این فیلد را خالی بگذارید"
                dir="ltr"
                autoComplete="new-password"
                className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition placeholder:text-[#9a8866] focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
              />
            </label>

            {setting?.isEnabled && chatId ? (
              <input type="hidden" name="isEnabled" value="on" />
            ) : null}
            <input type="hidden" name="chatId" value={chatId} />
            <input type="hidden" name="chatTitle" value={chatTitle} />
            {eventToggles.map((item) =>
              getToggleDefault(setting, item.name, item.defaultChecked) ? (
                <input key={item.name} type="hidden" name={item.name} value="on" />
              ) : null,
            )}
            <input type="hidden" name="dailyReportTime" value={setting?.dailyReportTime ?? "09:00"} />
            <input type="hidden" name="weeklyReportDay" value={setting?.weeklyReportDay ?? "SATURDAY"} />
            <input type="hidden" name="monthlyReportDay" value={setting?.monthlyReportDay ?? 1} />

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={18} />
                {isSaving ? "در حال ذخیره..." : "ذخیره توکن"}
              </button>
              <button
                type="button"
                onClick={() => tokenRef.current?.focus()}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-5 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa] hover:text-[#111827]"
              >
                تغییر توکن
              </button>
            </div>
            <ActionAlert ok={saveState.ok} message={saveState.message} />
          </form>
        </section>

        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#9f7131]">گفتگو</p>
              <h2 className="mt-2 text-2xl font-black text-[#111827]">
                اتصال گفتگو یا کانال تلگرام
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                لینک عمومی، نام کاربری یا شناسه عددی گفتگو را وارد کنید. اگر دریافت هوشمند به‌خاطر فیلترینگ یا قطع دسترسی تلگرام جواب نداد، همان مقدار به‌صورت دستی قابل ذخیره است.
              </p>
            </div>
            <span
              className={
                chatId
                  ? "inline-flex w-fit items-center gap-2 rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"
                  : "inline-flex w-fit items-center gap-2 rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1.5 text-xs font-black text-[#7d6841]"
              }
            >
              <MessageCircle size={15} />
              {chatId ? "گفتگو متصل است" : "نیازمند شناسه گفتگو"}
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <form action={discoverAction} className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Field
                label="شناسه یا لینک گفتگو"
                name="chatLookup"
                placeholder="مثلاً @my_channel یا t.me/my_channel یا -1001234567890"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={isDiscovering}
                className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#17483f] bg-[#17483f] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(23,72,63,0.16)] transition hover:-translate-y-0.5 hover:bg-[#0f3a33] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Search size={18} />
                {isDiscovering ? "در حال دریافت..." : "دریافت اطلاعات گفتگو"}
              </button>
            </form>
            <ActionAlert ok={discoverState.ok} message={discoverState.message} />
            <div className="rounded-2xl border border-[#e4c98a] bg-[#fff7e6]/80 p-3 text-xs font-black leading-6 text-[#7a4a12]">
              اگر پیام «زمان مناسب دریافت نشد» دیدید، مشکل معمولاً از دسترسی سرور برنامه به Telegram Bot API است. می‌توانید مقدار نرمال‌شده مثل <span dir="ltr">@talarbavafa1</span> را ذخیره کنید، اما ارسال پیام تست همچنان VPN/Proxy سراسری یا دسترسی مستقیم سرور به تلگرام می‌خواهد.
            </div>

            <form action={selectAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <Field
                label="شناسه گفتگو"
                name="chatId"
                key={`chat-id-${chatId}`}
                defaultValue={chatId}
                placeholder="@my_channel یا -1001234567890 یا t.me/my_channel"
                dir="ltr"
              />
              <Field
                label="عنوان گفتگو"
                name="chatTitle"
                key={`chat-title-${chatTitle}`}
                defaultValue={chatTitle}
                placeholder="عنوان گفتگو پس از دریافت تکمیل می‌شود"
              />
              <button
                type="submit"
                disabled={isSelecting}
                className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={18} />
                ذخیره گفتگو / ثبت دستی
              </button>
            </form>

            <form action={recentAction}>
              <button
                type="submit"
                disabled={isFetchingRecent}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-5 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                <ListChecks size={18} />
                {isFetchingRecent ? "در حال جستجو..." : "جستجو در گفتگوهای اخیر بات"}
              </button>
            </form>
            <ActionAlert ok={recentState.ok} message={recentState.message} />
            <ActionAlert ok={selectState.ok} message={selectState.message} />

            {recentState.recentChats?.length ? (
              <div className="grid gap-3">
                {recentState.recentChats.map((chat) => (
                  <form
                    key={chat.chatId}
                    action={selectAction}
                    className="grid gap-3 rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/60 p-4 shadow-[0_12px_36px_rgba(17,24,39,0.05)] sm:grid-cols-[1fr_auto]"
                  >
                    <input type="hidden" name="chatId" value={chat.chatId} />
                    <input type="hidden" name="chatTitle" value={chat.title} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-[#111827]">
                          {chat.title}
                        </p>
                        <span className="rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-2.5 py-1 text-xs font-black text-[#7d6841]">
                          <ChatTypeLabel type={chat.type} />
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-black text-[#6d5f49]" dir="ltr">
                        {chat.chatId}
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isSelecting}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-2.5 text-sm font-black text-[#fff8ea] transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <CheckCircle2 size={17} />
                      انتخاب این گفتگو
                    </button>
                  </form>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <form
          action={saveAction}
          className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black text-[#9f7131]">اعلان‌ها</p>
              <h2 className="mt-2 text-2xl font-black text-[#111827]">
                رویدادها و زمان‌بندی گزارش‌ها
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                دسته‌های پیام و زمان ارسال گزارش‌ها را برای گفتگوی متصل‌شده
                تنظیم کنید.
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
              فعال‌سازی تلگرام
            </label>
          </div>

          <input type="hidden" name="chatId" value={chatId} />
          <input type="hidden" name="chatTitle" value={chatTitle} />

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Select
              label="ساعت ارسال گزارش روزانه"
              name="dailyReportTime"
              defaultValue={setting?.dailyReportTime ?? "09:00"}
            >
              {dailyTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {toPersianDigits(time)}
                </option>
              ))}
            </Select>
            <Select
              label="روز گزارش هفتگی"
              name="weeklyReportDay"
              defaultValue={setting?.weeklyReportDay ?? "SATURDAY"}
            >
              <option value="">بدون گزارش هفتگی</option>
              {weekDays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </Select>
            <Select
              label="روز گزارش ماهانه"
              name="monthlyReportDay"
              defaultValue={String(setting?.monthlyReportDay ?? 1)}
            >
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  روز {toPersianDigits(day)}
                </option>
              ))}
            </Select>
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
              {isSaving ? "در حال ذخیره..." : "ذخیره تنظیمات اعلان‌ها"}
            </button>
          </div>
        </form>
      </div>

      <aside className="grid content-start gap-4">
        <form
          action={testAction}
          className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[linear-gradient(145deg,rgba(255,249,238,0.98),rgba(247,236,211,0.94))] p-5 shadow-[0_18px_60px_rgba(17,24,39,0.08)]"
        >
          <p className="text-xs font-black text-[#9f7131]">پیام تست</p>
          <h3 className="mt-2 text-xl font-black text-[#111827]">
            بررسی اتصال تلگرام
          </h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            با ارسال پیام تست، یک لاگ اعلان ثبت می‌شود و نتیجه ارسال در همین
            صفحه نمایش داده می‌شود.
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
            {isTesting ? "در حال ارسال..." : "ارسال پیام تست"}
          </button>
        </form>

        <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
          <p className="text-xs font-black text-[#9f7131]">راهنمای اتصال</p>
          <div className="mt-3 grid gap-3 text-sm font-bold leading-7 text-[#6d5f49]">
            <div className="flex items-start gap-2">
              <Sparkles size={17} className="mt-1 shrink-0 text-[#17483f]" />
              برای کانال یا گروه عمومی، نام کاربری یا لینک t.me کافی است.
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={17} className="mt-1 shrink-0 text-[#17483f]" />
              برای گروه یا کانال خصوصی، بات باید عضو یا مدیر باشد.
            </div>
            <div className="flex items-start gap-2">
              <Sparkles size={17} className="mt-1 shrink-0 text-[#17483f]" />
              برای جستجوی گفتگوهای اخیر، ابتدا به بات پیام بدهید یا آن را به
              گروه اضافه کنید.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
