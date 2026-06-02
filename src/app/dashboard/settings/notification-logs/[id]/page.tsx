import { AlertTriangle, ArrowLeft, Link as LinkIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BackToSettingsLink,
  LuxuryPanel,
  SettingsPageShell,
  SettingsSecondaryLink,
} from "@/components/dashboard/settings/settings-page-shell";
import { MessageLogRetryDialog } from "@/components/dashboard/messages/message-log-retry-dialog";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";
import { getNotificationLogById } from "@/lib/notifications/data";

type NotificationLogDetailPageProps = {
  params: Promise<{ id: string }>;
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
  relatedContractId: string | null;
  relatedPaymentId: string | null;
  relatedExpenseId: string | null;
  relatedCustomerId: string | null;
  sentAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function statusClass(status: string) {
  if (status === "SENT") {
    return "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]";
  }

  if (status === "FAILED") {
    return "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]";
  }

  if (status === "QUEUED" || status === "SKIPPED") {
    return "border-[#d6b15f]/40 bg-[#f4dfaa]/35 text-[#6f4a18]";
  }

  return "border-[#d8c08b]/62 bg-white/55 text-[#5f533f]";
}

function relatedLinks(log: NotificationLogRow) {
  return [
    log.relatedContractId
      ? { label: "قرارداد", value: log.relatedContractId, href: `/dashboard/contracts/${log.relatedContractId}` }
      : null,
    log.relatedPaymentId
      ? { label: "دریافت", value: log.relatedPaymentId, href: `/dashboard/payments/${log.relatedPaymentId}` }
      : null,
    log.relatedExpenseId
      ? { label: "هزینه", value: log.relatedExpenseId, href: `/dashboard/expenses/${log.relatedExpenseId}` }
      : null,
    log.relatedCustomerId
      ? { label: "مشتری", value: log.relatedCustomerId, href: `/dashboard/customers/${log.relatedCustomerId}` }
      : null,
  ].filter(Boolean) as { label: string; value: string; href: string }[];
}

export default async function NotificationLogDetailPage({ params }: NotificationLogDetailPageProps) {
  const membership = await requireTenantMember();
  const { id } = await params;
  const log = (await getNotificationLogById(membership.tenantId, id)) as NotificationLogRow | null;

  if (!log) {
    notFound();
  }

  const links = relatedLinks(log);

  return (
    <SettingsPageShell
      title="جزئیات لاگ اعلان"
      subtitle={`${getNotificationChannelLabel(log.channel)} · ${getNotificationEventLabel(log.eventType)} · ${getNotificationStatusLabel(log.status)}`}
      badge="پیگیری ارسال"
      tenantName={membership.tenant.name}
      actions={
        <>
          <SettingsSecondaryLink href="/dashboard/settings/notification-logs">
            بازگشت به لاگ‌ها
          </SettingsSecondaryLink>
          <BackToSettingsLink />
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <LuxuryPanel eyebrow="متن کامل پیام" title={log.title ?? getNotificationEventLabel(log.eventType)}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#17483f]">
              {getNotificationChannelLabel(log.channel)}
            </span>
            <span className="rounded-full border border-[#d8c08b]/62 bg-[#fff9ee] px-3 py-1 text-xs font-black text-[#5f533f]">
              {getNotificationEventLabel(log.eventType)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(log.status)}`}>
              {getNotificationStatusLabel(log.status)}
            </span>
          </div>
          <pre className="mt-5 whitespace-pre-wrap rounded-[1.5rem] border border-[#d8c08b]/55 bg-white/65 p-4 text-sm font-bold leading-8 text-[#4f4638]">
            {log.message}
          </pre>
          {log.errorMessage ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-[#d85c5c]/30 bg-[#fff0ef] p-4 text-sm font-bold leading-7 text-[#9b2c2c]">
              <AlertTriangle size={18} className="mt-1 shrink-0" />
              {log.errorMessage}
            </div>
          ) : null}
        </LuxuryPanel>

        <aside className="grid gap-4">
          <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.07)]">
            <p className="text-xs font-black text-[#17483f]">اطلاعات ارسال</p>
            <dl className="mt-4 grid gap-3 text-sm font-bold text-[#6d5f49]">
              <div>
                <dt className="text-xs font-black text-[#111827]">گیرنده</dt>
                <dd className="mt-1">{log.recipientLabel ?? log.recipient ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-black text-[#111827]">تعداد تلاش</dt>
                <dd className="mt-1">{toPersianDigits(log.attemptCount)}</dd>
              </div>
              <div>
                <dt className="text-xs font-black text-[#111827]">ثبت</dt>
                <dd className="mt-1">{formatJalaliDateTime(log.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-black text-[#111827]">ارسال موفق</dt>
                <dd className="mt-1">{formatJalaliDateTime(log.sentAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-black text-[#111827]">آخرین خطا</dt>
                <dd className="mt-1">{formatJalaliDateTime(log.failedAt)}</dd>
              </div>
            </dl>
          </section>

          {links.length > 0 ? (
            <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-white/70 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.06)]">
              <p className="text-xs font-black text-[#17483f]">ارتباط با رکوردها</p>
              <div className="mt-4 grid gap-2">
                {links.map((item) => (
                  <Link
                    key={`${item.label}-${item.value}`}
                    href={item.href}
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LinkIcon size={16} />
                      {item.label} {item.value}
                    </span>
                    <ArrowLeft size={16} />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {(log.status === "FAILED" || log.status === "QUEUED") ? (
            <section className="rounded-[1.75rem] border border-[#d85c5c]/22 bg-[#fff0ef]/70 p-5 shadow-[0_18px_60px_rgba(17,24,39,0.06)]">
              <p className="mb-3 text-sm font-black text-[#8f2c2c]">ارسال مجدد پیام</p>
              <MessageLogRetryDialog
                logId={log.id}
                channel={log.channel}
                eventType={log.eventType}
                status={log.status}
                recipient={log.recipientLabel ?? log.recipient ?? "—"}
                title={log.title ?? getNotificationEventLabel(log.eventType)}
                message={log.message}
              />
            </section>
          ) : null}
        </aside>
      </div>
    </SettingsPageShell>
  );
}
