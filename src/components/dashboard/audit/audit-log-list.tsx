import { ArrowUpLeft, CalendarClock, ClipboardList, ExternalLink, ShieldCheck, UserCircle } from "lucide-react";
import Link from "next/link";
import { getAuditDiffRows } from "@/lib/audit/audit-display";
import { formatJalaliAuditDateTime, toPersianDigits } from "@/lib/date/jalali";

type AuditLogListItem = {
  id: string;
  title: string;
  message: string;
  action: string;
  actionLabel: string;
  entityType: string;
  entityLabel: string;
  entityId: string | null;
  actorName: string;
  href: string | null;
  createdAt: Date;
  beforeData: unknown;
  afterData: unknown;
};

type AuditLogListProps = {
  items: AuditLogListItem[];
};

function getActionTone(action: string) {
  if (["DELETE", "CANCEL", "PAYMENT_CANCELED", "NOTIFICATION_FAILED"].includes(action)) {
    return "border-[#c56a6a]/35 bg-[#fff1f1] text-[#8f2c2c]";
  }

  if (["CREATE", "PAYMENT_RECEIVED", "EXPENSE_CREATED", "ENABLE", "NOTIFICATION_SENT"].includes(action)) {
    return "border-[#87b59f]/45 bg-[#effaf5] text-[#17483f]";
  }

  return "border-[#d8c08b]/60 bg-[#fff8ea] text-[#7d5d23]";
}

function AuditIcon({ action }: { action: string }) {
  const className = "text-[#c7a15a]";

  if (action.includes("SECURITY")) {
    return <ShieldCheck size={20} className={className} />;
  }

  if (["EXPORT", "BACKUP_EXPORT", "PRINT"].includes(action)) {
    return <ArrowUpLeft size={20} className={className} />;
  }

  return <ClipboardList size={20} className={className} />;
}

export function AuditLogList({ items }: AuditLogListProps) {
  if (!items.length) {
    return (
      <section className="rounded-[2rem] border border-dashed border-[#d8c08b]/70 bg-[#fff8ea]/70 p-8 text-center shadow-[0_18px_60px_rgba(23,32,51,0.07)]">
        <ClipboardList className="mx-auto text-[#c7a15a]" size={34} />
        <h2 className="mt-4 text-xl font-black text-[#172033]">هنوز فعالیتی ثبت نشده است.</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-bold leading-7 text-[#6d5f49]">
          پس از ثبت یا ویرایش اطلاعات، تاریخچه عملیات در این بخش نمایش داده می‌شود.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const diffRows = getAuditDiffRows(item.beforeData, item.afterData);

        return (
          <article key={item.id} className="rounded-[2rem] border border-[#e8c478]/40 bg-white/78 p-4 shadow-[0_18px_60px_rgba(23,32,51,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#d8b46b]/65 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/60 bg-[#172033] shadow-[0_16px_35px_rgba(23,32,51,0.18)]">
                  <AuditIcon action={item.action} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-black text-[#172033] sm:text-lg">{item.title}</h2>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getActionTone(item.action)}`}>{item.actionLabel}</span>
                    <span className="rounded-full border border-[#d8c08b]/55 bg-[#fff8ea]/80 px-3 py-1 text-[11px] font-black text-[#7d6841]">{item.entityLabel}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-7 text-[#4f4638]">{item.message}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#7d6841]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff8ea] px-3 py-1.5">
                      <UserCircle size={14} />
                      {item.actorName}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff8ea] px-3 py-1.5">
                      <CalendarClock size={14} />
                      {formatJalaliAuditDateTime(item.createdAt)}
                    </span>
                    {item.entityId ? (
                      <span className="rounded-full bg-[#fff8ea] px-3 py-1.5">
                        شناسه رکورد: {toPersianDigits(item.entityId.slice(0, 8))}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {item.href ? (
                <Link href={item.href} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-[#fff8ea] px-4 py-2.5 text-xs font-black text-[#7d5d23] transition hover:bg-white">
                  مشاهده رکورد
                  <ExternalLink size={15} />
                </Link>
              ) : null}
            </div>

            {diffRows.length ? (
              <details className="mt-4 rounded-[1.5rem] border border-[#d8c08b]/45 bg-[#fff8ea]/70 p-3">
                <summary className="cursor-pointer text-xs font-black text-[#7d5d23]">مشاهده تغییرات امن</summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-right text-xs font-bold text-[#4f4638]">
                    <thead className="text-[#7d5d23]">
                      <tr className="border-b border-[#d8c08b]/45">
                        <th className="py-2 pl-3">فیلد</th>
                        <th className="py-2 pl-3">مقدار قبلی</th>
                        <th className="py-2">مقدار جدید</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diffRows.map((row) => (
                        <tr key={row.field} className="border-b border-[#d8c08b]/25 last:border-0">
                          <td className="py-2 pl-3 text-[#172033]">{row.field}</td>
                          <td className="py-2 pl-3">{row.before}</td>
                          <td className="py-2">{row.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
