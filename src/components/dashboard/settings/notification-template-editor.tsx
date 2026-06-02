"use client";

import { AlertCircle, CheckCircle2, RotateCcw, Save } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  resetNotificationTemplateAction,
  updateNotificationTemplateAction,
} from "@/lib/actions/notification-template-actions";
import { initialNotificationTemplateActionState } from "@/lib/actions/notification-template-state";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/constants";
import { renderNotificationTemplate } from "@/lib/notifications/template-renderer";

type NotificationTemplateEditorProps = {
  template: {
    id: string;
    channel: string;
    eventType: string;
    title: string;
    body: string;
    isEnabled: boolean;
  };
  variables: string[];
};

const sampleVariables: Record<string, string> = {
  tenantName: "تالار منیجر",
  currentDate: "۸ اردیبهشت ۱۴۰۵",
  currentDateTime: "۸ اردیبهشت ۱۴۰۵، ساعت ۱۸:۳۰",
  operatorName: "مدیر تالار",
  userName: "مدیر تالار",
  userEmail: "mo***@example.com",
  customerName: "سبحان باوفا",
  customerMobile: "۰۹۱۲۳۴۵۶۷۸۹",
  customerNationalCode: "۰۰۱۲۳۴۵۶۷۸",
  customerSupportPhone: "۰۹۱۲۳۳۹۷۹۷۷، ۰۹۱۲۶۴۹۹۸۷۷",
  supportPhone: "۰۹۱۲۳۳۹۷۹۷۷، ۰۹۱۲۶۴۹۹۸۷۷",
  hallAddress: "تهران، جاده مخصوص، باغ تالار مجلل باوفا",
  tenantAddress: "تهران، جاده مخصوص، باغ تالار مجلل باوفا",
  contractNumber: "TLR-۰۰۰۱",
  eventType: "عروسی",
  eventDate: "۸ اردیبهشت ۱۴۰۵",
  eventDay: "سه‌شنبه",
  eventDateFull: "سه‌شنبه ۸ اردیبهشت ۱۴۰۵",
  eventTime: "۲۰:۰۰",
  eventTimeRange: "۲۰:۰۰ تا ۲۳:۳۰",
  guestCount: "۳۰۰ نفر",
  contractStatus: "قطعی شده",
  paymentStatus: "تأییدشده",
  contractPaymentStatus: "تسویه‌شده",
  finalTotal: "۵۰۰٬۰۰۰٬۰۰۰ ریال",
  depositAmount: "۱۰۰٬۰۰۰٬۰۰۰ ریال",
  paidAmount: "۵۰۰٬۰۰۰٬۰۰۰ ریال",
  remainingAmount: "۰ ریال",
  hallName: "تالار اصلی",
  salonName: "سالن زمرد",
  packageName: "پکیج طلایی",
  contractNotes: "هماهنگی گل‌آرایی با مشتری انجام شود.",
  lineItemsSummary: "۱) خدمات: دیزاین جایگاه - ۱ عدد - ۳۰٬۰۰۰٬۰۰۰ ریال\n۲) منو: شام ویژه - ۳۰۰ نفر - ۲۲۰٬۰۰۰٬۰۰۰ ریال",
  paymentAmount: "۵۰٬۰۰۰٬۰۰۰ ریال",
  paymentType: "بیعانه",
  paymentMethod: "کارت‌خوان سالن اصلی",
  paidAt: "۸ اردیبهشت ۱۴۰۵",
  trackingCode: "۱۲۳۴۵۶",
  referenceNumber: "INV-۱۰۰۱",
  expenseTitle: "خرید مواد غذایی",
  expenseAmount: "۳۰٬۰۰۰٬۰۰۰ ریال",
  expenseCategory: "خرید مواد غذایی",
  expenseStatus: "ثبت‌شده",
  occurredAt: "۸ اردیبهشت ۱۴۰۵",
  vendorName: "تأمین‌کننده تشریفات",
  todayContractsCount: "۲",
  todayEventsCount: "۱",
  tomorrowEventsCount: "۳",
  contractsCount: "۱۲",
  paymentsCount: "۵",
  expensesCount: "۳",
  reportPeriod: "اردیبهشت ۱۴۰۵",
  contractsTotal: "۱٬۲۰۰٬۰۰۰٬۰۰۰ ریال",
  paymentsTotal: "۸۵۰٬۰۰۰٬۰۰۰ ریال",
  expensesTotal: "۲۲۰٬۰۰۰٬۰۰۰ ریال",
  estimatedProfit: "۶۳۰٬۰۰۰٬۰۰۰ ریال",
  outstandingTotal: "۳۵۰٬۰۰۰٬۰۰۰ ریال",
  outstandingContractsCount: "۴",
  latestPaymentsSummary: "- سبحان باوفا · TLR-۰۰۰۱ · ۵۰٬۰۰۰٬۰۰۰ ریال",
  latestExpensesSummary: "- خرید مواد غذایی · خرید مواد غذایی · ۳۰٬۰۰۰٬۰۰۰ ریال",
  upcomingEventsSummary: "- سبحان باوفا · عروسی · ۲۰:۰۰ · ۳۰۰ مهمان · سالن زمرد",
  outstandingBalancesSummary: "- TLR-۰۰۰۱ · سبحان باوفا · ۸ اردیبهشت ۱۴۰۵ · مانده: ۳۵۰٬۰۰۰٬۰۰۰ ریال",
  invoiceNumber: "INV-۱۰۰۱",
  payableAmount: "۱۲۰٬۰۰۰٬۰۰۰ ریال",
  portalUrl: "https://example.com/g/abc123",
};

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

export function NotificationTemplateEditor({ template, variables }: NotificationTemplateEditorProps) {
  const [state, action, isPending] = useActionState(
    updateNotificationTemplateAction,
    initialNotificationTemplateActionState,
  );
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);

  const titlePreview = useMemo(() => renderNotificationTemplate(title, sampleVariables), [title]);
  const bodyPreview = useMemo(() => renderNotificationTemplate(body, sampleVariables), [body]);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <form
        action={action}
        className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6"
      >
        <input type="hidden" name="templateId" value={template.id} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-[#17483f]">
              {getNotificationChannelLabel(template.channel)} · {getNotificationEventLabel(template.eventType)}
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#111827]">ویرایش متن پیام</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              فقط عنوان، متن و وضعیت فعال بودن این قالب تغییر می‌کند.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d8c08b]/70 bg-white/70 px-4 py-3 text-sm font-black text-[#111827]">
            <input type="checkbox" name="isEnabled" defaultChecked={template.isEnabled} className="size-5 accent-[#17483f]" />
            فعال باشد
          </label>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            عنوان پیام
            <input
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 text-sm font-bold text-[#111827] shadow-inner shadow-white/40 outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            متن پیام
            <textarea
              name="body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={12}
              className="min-h-72 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 py-3 text-sm font-bold leading-8 text-[#111827] shadow-inner shadow-white/40 outline-none transition focus:border-[#c7a15a] focus:ring-4 focus:ring-[#c7a15a]/15"
            />
          </label>
          <div className="text-left text-xs font-black text-[#7d6841]" dir="rtl">
            {body.length.toLocaleString("fa-IR")} / ۲٬۰۰۰ کاراکتر
          </div>
          <ActionAlert ok={state.ok} message={state.message} />
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Save size={18} />
            {isPending ? "در حال ذخیره..." : "ذخیره قالب"}
          </button>
          <button
            formAction={resetNotificationTemplateAction}
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] shadow-sm transition hover:bg-[#f4dfaa] hover:text-[#111827]"
          >
            <RotateCcw size={18} />
            بازنشانی متن پیشنهادی
          </button>
        </div>
      </form>

      <aside className="grid gap-4">
        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-white/70 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.06)] sm:p-5">
          <p className="text-xs font-black text-[#17483f]">پیش‌نمایش با داده نمونه</p>
          <h3 className="mt-2 text-lg font-black text-[#111827]">{titlePreview || "عنوان پیام"}</h3>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-[#d8c08b]/50 bg-[#fff9ee] p-4 text-sm font-bold leading-8 text-[#5f533f]">
            {bodyPreview || "متن پیام"}
          </pre>
        </section>
        <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)]">
          <p className="text-xs font-black text-[#f0dba9]">متغیرهای قابل استفاده</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {variables.map((variable) => (
              <code
                key={variable}
                dir="ltr"
                className="rounded-full border border-white/[0.10] bg-white/[0.055] px-3 py-1.5 text-xs font-black text-[#f0dba9]"
              >
                {variable}
              </code>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
