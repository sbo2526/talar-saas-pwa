import { Edit3, Eye, MessageSquareText, RotateCcw, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import {
  resetNotificationTemplateAction,
  toggleNotificationTemplateAction,
} from "@/lib/actions/notification-template-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
} from "@/lib/notifications/constants";
import { getNotificationTemplates } from "@/lib/notifications/data";
import { ensureDefaultNotificationTemplates } from "@/lib/notifications/notification-service";
import { messageTemplateVariables } from "@/lib/settings-hub";

type NotificationTemplateRow = {
  id: string;
  channel: string;
  eventType: string;
  title: string;
  body: string;
  isEnabled: boolean;
  updatedAt: Date;
};

const businessAreaLabels: Record<string, string> = {
  CONTRACT: "قراردادها",
  PAYMENT: "دریافتی‌ها",
  EXPENSE: "هزینه‌ها",
  CUSTOMER: "مشتریان",
  REPORT: "گزارش‌ها",
  SECURITY: "امنیت",
  TEST: "تست",
};

function previewText(value: string) {
  return value.length > 150 ? `${value.slice(0, 150)}…` : value;
}

function getBusinessArea(eventType: string) {
  if (eventType.startsWith("CONTRACT_")) return "CONTRACT";
  if (eventType.startsWith("PAYMENT_")) return "PAYMENT";
  if (eventType.startsWith("EXPENSE_")) return "EXPENSE";
  if (eventType.startsWith("CUSTOMER_")) return "CUSTOMER";
  if (["DAILY_REPORT", "WEEKLY_REPORT", "MONTHLY_REPORT"].includes(eventType)) return "REPORT";
  if (eventType === "SECURITY_EVENT") return "SECURITY";
  return "TEST";
}

function templateStatusClass(isEnabled: boolean) {
  return isEnabled
    ? "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"
    : "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]";
}

export default async function MessageTemplatesPage() {
  const membership = await requireTenantMember();
  await ensureDefaultNotificationTemplates(membership.tenantId);
  const templates = (await getNotificationTemplates(
    membership.tenantId,
  )) as NotificationTemplateRow[];
  const enabledCount = templates.filter((template) => template.isEnabled).length;
  const disabledCount = templates.length - enabledCount;
  const groupedTemplates = templates.reduce<Record<string, Record<string, NotificationTemplateRow[]>>>(
    (groups, template) => {
      groups[template.channel] ??= {};
      const area = getBusinessArea(template.eventType);
      groups[template.channel][area] ??= [];
      groups[template.channel][area].push(template);
      return groups;
    },
    {},
  );

  return (
    <SettingsPageShell
      title="قالب پیام‌ها"
      subtitle="متن اعلان‌های تلگرام، بله، روبیکا و پیامک را برای قراردادها، دریافتی‌ها، هزینه‌ها، مشتریان و گزارش‌ها مدیریت کنید."
      badge={`${toPersianDigits(templates.length)} قالب پیام`}
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
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["قالب‌های فعال", enabledCount, "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"],
          ["قالب‌های غیرفعال", disabledCount, "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]"],
          ["کانال‌های پشتیبانی‌شده", 4, "border-[#c7a15a]/28 bg-[#c7a15a]/10 text-[#17483f]"],
        ].map(([label, value, className]) => (
          <article
            key={String(label)}
            className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.06)]"
          >
            <p className="text-sm font-black text-[#6d5f49]">{label}</p>
            <p className="mt-2 text-3xl font-black text-[#111827]">{toPersianDigits(Number(value))}</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${className}`}>
              مدیریت tenant فعلی
            </span>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <LuxuryPanel eyebrow="قالب‌های ذخیره‌شده" title="مدیریت قالب‌ها بر اساس کانال و حوزه کاری">
          <div className="space-y-5">
            {Object.entries(groupedTemplates).map(([channel, areaGroups]) => (
              <section
                key={channel}
                className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/55 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
                      <MessageSquareText size={20} />
                    </span>
                    <div>
                      <h3 className="text-lg font-black text-[#111827]">
                        {getNotificationChannelLabel(channel)}
                      </h3>
                      <p className="text-xs font-bold text-[#7d6841]">
                        قالب‌های قابل استفاده برای این کانال
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/9 px-3 py-1 text-xs font-black text-[#17483f]">
                    {toPersianDigits(Object.values(areaGroups).flat().length)} قالب
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {Object.entries(areaGroups).map(([area, areaTemplates]) => (
                    <div key={`${channel}-${area}`} className="rounded-3xl border border-[#ead6a6] bg-[#fff9ee]/80 p-3">
                      <div className="flex items-center justify-between gap-3 px-1">
                        <h4 className="text-sm font-black text-[#17483f]">
                          {businessAreaLabels[area] ?? "سایر"}
                        </h4>
                        <span className="text-xs font-black text-[#7d6841]">
                          {toPersianDigits(areaTemplates.length)} قالب
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {areaTemplates.map((template) => (
                          <article
                            key={template.id}
                            className="flex min-h-72 flex-col rounded-2xl border border-[#ead6a6] bg-white/72 p-4 shadow-[0_12px_34px_rgba(17,24,39,0.05)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-[#17483f]">
                                  {getNotificationEventLabel(template.eventType)}
                                </p>
                                <h5 className="mt-1 text-base font-black text-[#111827]">
                                  {template.title}
                                </h5>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${templateStatusClass(template.isEnabled)}`}
                              >
                                {template.isEnabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                {template.isEnabled ? "فعال" : "غیرفعال"}
                              </span>
                            </div>
                            <p className="mt-3 whitespace-pre-line rounded-2xl border border-[#d8c08b]/45 bg-[#fff9ee]/85 p-3 text-sm font-bold leading-7 text-[#5f533f]">
                              {previewText(template.body)}
                            </p>
                            <p className="mt-3 text-xs font-black text-[#7d6841]">
                              آخرین ویرایش: {formatJalaliDateTime(template.updatedAt)}
                            </p>
                            <div className="mt-auto grid gap-2 pt-4 sm:grid-cols-2">
                              <Link
                                href={`/dashboard/settings/message-templates/${template.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-3 py-2.5 text-xs font-black text-[#fff8ea] transition hover:bg-[#0f172a]"
                              >
                                <Edit3 size={15} />
                                ویرایش
                              </Link>
                              <Link
                                href={`/dashboard/settings/message-templates/${template.id}`}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-3 py-2.5 text-xs font-black text-[#4a3514] transition hover:bg-[#f4dfaa]"
                              >
                                <Eye size={15} />
                                پیش‌نمایش
                              </Link>
                              <form action={toggleNotificationTemplateAction}>
                                <input type="hidden" name="templateId" value={template.id} />
                                <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-white/75 px-3 py-2.5 text-xs font-black text-[#4a3514] transition hover:bg-[#fff1d6]">
                                  {template.isEnabled ? "غیرفعال‌سازی" : "فعال‌سازی"}
                                </button>
                              </form>
                              <form action={resetNotificationTemplateAction}>
                                <input type="hidden" name="templateId" value={template.id} />
                                <button className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-white/75 px-3 py-2.5 text-xs font-black text-[#4a3514] transition hover:bg-[#fff1d6]">
                                  <RotateCcw size={15} />
                                  بازنشانی
                                </button>
                              </form>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </LuxuryPanel>

        <aside className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem]">
          <p className="text-xs font-black text-[#f0dba9]">متغیرهای پیام</p>
          <h2 className="mt-2 text-2xl font-black">جای‌گذاری خودکار اطلاعات</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-[#d9caa9]">
            متغیرها هنگام ارسال پیام با اطلاعات واقعی قرارداد، دریافت، هزینه یا مشتری جایگزین می‌شوند.
          </p>
          <div className="gold-divider my-5" />
          <div className="flex flex-wrap gap-2">
            {messageTemplateVariables.map((variable) => (
              <code
                key={variable}
                className="rounded-full border border-white/[0.10] bg-white/[0.055] px-3 py-1.5 text-left text-xs font-black text-[#f0dba9] ltr"
                dir="ltr"
              >
                {variable}
              </code>
            ))}
          </div>
        </aside>
      </div>
    </SettingsPageShell>
  );
}
