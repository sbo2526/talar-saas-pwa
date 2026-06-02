import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  History,
  Lock,
  MessageSquare,
  Paperclip,
  RotateCcw,
  Save,
  Send,
  UserRound,
  XCircle,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import {
  formatWaitingTime,
  getAdminSupportTicketDetail,
  type AdminSupportMessageItem,
} from "@/lib/admin/support-admin-data";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliAuditDateTime, formatJalaliDate } from "@/lib/date/jalali";
import {
  addInternalTicketNoteAction,
  closeSupportTicketAction,
  reopenSupportTicketAction,
  replyToSupportTicketAction,
  updateSupportTicketPriorityAction,
  updateSupportTicketStatusAction,
} from "@/lib/actions/admin-support-actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    replied?: string;
    statusUpdated?: string;
    priorityUpdated?: string;
    noteAdded?: string;
    supportError?: string;
  }>;
};

function getNotice(params: Awaited<NonNullable<PageProps["searchParams"]>>) {
  if (params.replied) return { tone: "success", text: "پاسخ پشتیبانی ثبت شد." };
  if (params.statusUpdated) return { tone: "success", text: "وضعیت تیکت به‌روزرسانی شد." };
  if (params.priorityUpdated) return { tone: "success", text: "اولویت تیکت به‌روزرسانی شد." };
  if (params.noteAdded) return { tone: "success", text: "یادداشت داخلی ثبت شد." };
  if (params.supportError === "closed") return { tone: "danger", text: "این تیکت بسته شده است. برای ارسال پاسخ ابتدا آن را بازگشایی کنید." };
  if (params.supportError) return { tone: "danger", text: "درخواست پشتیبانی معتبر نیست." };
  return null;
}

function fileSizeLabel(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  const kb = Math.round(size / 1024);
  if (kb < 1024) return `${formatPersianNumber(kb)} کیلوبایت`;
  return `${formatPersianNumber((kb / 1024).toFixed(1))} مگابایت`;
}

export default async function AdminSupportTicketPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const data = await getAdminSupportTicketDetail(id);
  if (!data) notFound();

  const notice = getNotice(query);
  const isClosed = data.ticket.status === "CLOSED";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.22),transparent_28%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(10,16,27,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link href="/admin/support" className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1.5 text-xs font-black text-[#f0dba9]"><ArrowRight size={15} /> بازگشت به تیکت‌ها</Link>
            <h1 className="mt-3 text-2xl font-black leading-10 tracking-tight sm:text-3xl">{data.ticket.ticketNumber} — {data.ticket.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip tone={data.ticket.statusTone as AdminChipTone}>وضعیت: {data.ticket.statusLabel}</StatusChip>
              <StatusChip tone={data.ticket.priorityTone as AdminChipTone}>اولویت: {data.ticket.priorityLabel}</StatusChip>
              <StatusChip tone="navy">موضوع: {data.ticket.categoryLabel}</StatusChip>
              <StatusChip tone={data.ticket.operationalTone as AdminChipTone}>{formatWaitingTime(data.ticket.waitingMinutes, data.ticket.operationalState)}</StatusChip>
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-[#d9caa9]">
              ثبت: {formatJalaliAuditDateTime(data.ticket.createdAt)} · آخرین پیام: {formatJalaliAuditDateTime(data.ticket.lastMessageAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={data.relatedHall.detailHref} className="rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]">مشاهده تالار</Link>
            {isClosed ? (
              <form action={reopenSupportTicketAction}>
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <button className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100"><RotateCcw size={15} /> بازگشایی تیکت</button>
              </form>
            ) : (
              <form action={closeSupportTicketAction}>
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <button className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/35 bg-rose-300/10 px-4 py-2 text-xs font-black text-rose-100"><XCircle size={15} /> بستن تیکت</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {notice ? <div className={`rounded-2xl border p-4 text-sm font-black ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{notice.text}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <AdminCard className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#172033]">مکالمه تیکت</h2>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">پیام‌های کاربر، پاسخ‌های پشتیبانی، رویدادهای وضعیت و یادداشت‌های داخلی.</p>
              </div>
              <StatusChip tone={data.ticket.operationalTone as AdminChipTone}>{data.ticket.operationalLabel}</StatusChip>
            </div>
            <div className="space-y-3">
              {data.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            </div>
          </AdminCard>

          {isClosed ? (
            <AdminCard className="border-amber-200 bg-amber-50/80">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black leading-7 text-amber-800">این تیکت بسته شده است. برای ارسال پاسخ ابتدا تیکت را بازگشایی کنید.</p>
                <form action={reopenSupportTicketAction}>
                  <input type="hidden" name="ticketId" value={data.ticket.id} />
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-xs font-black text-[#f0dba9]"><RotateCcw size={15} /> بازگشایی تیکت</button>
                </form>
              </div>
            </AdminCard>
          ) : (
            <AdminCard className="space-y-3">
              <h2 className="text-lg font-black text-[#172033]">ارسال پاسخ به کاربر</h2>
              <form action={replyToSupportTicketAction} className="space-y-3">
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <label className="grid gap-2 text-xs font-black text-[#172033]">
                  <span>پیام پاسخ</span>
                  <textarea name="body" rows={7} required placeholder="پاسخ دقیق، محترمانه و قابل اجرا را برای کاربر تالار بنویسید..." className="w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 p-3 text-sm font-bold leading-8 outline-none focus:border-[#c79b3b]" />
                </label>
                <label className="inline-flex items-center gap-2 rounded-2xl border border-[#e8c478]/35 bg-[#fffaf0] px-4 py-3 text-xs font-black text-[#172033]">
                  <input type="checkbox" name="setWaitingForUser" defaultChecked className="size-4 accent-[#172033]" />
                  تغییر وضعیت به «منتظر پاسخ کاربر» پس از ارسال پاسخ
                </label>
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#f0dba9]"><Send size={16} /> ارسال پاسخ</button>
              </form>
            </AdminCard>
          )}

          <section className="grid gap-4 lg:grid-cols-2">
            <AdminCard className="space-y-3">
              <h2 className="text-lg font-black text-[#172033]">یادداشت داخلی پشتیبانی</h2>
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black leading-6 text-amber-800">فقط برای پشتیبانی قابل مشاهده است.</p>
              <form action={addInternalTicketNoteAction} className="space-y-3">
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <textarea name="body" rows={5} required placeholder="نکته داخلی، تصمیم تیم یا پیگیری بعدی را ثبت کنید..." className="w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 p-3 text-sm font-bold leading-8 outline-none focus:border-[#c79b3b]" />
                <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-5 py-3 text-xs font-black text-[#172033]"><Save size={15} /> ثبت یادداشت داخلی</button>
              </form>
            </AdminCard>

            <AdminCard className="space-y-3">
              <h2 className="text-lg font-black text-[#172033]">مدیریت وضعیت و اولویت</h2>
              <form action={updateSupportTicketStatusAction} className="space-y-3">
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <p className="text-xs font-black text-[#7b6a4b]">وضعیت فعلی: {data.ticket.statusLabel}</p>
                <select name="status" defaultValue={data.ticket.status} className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
                  <option value="OPEN">باز</option>
                  <option value="IN_REVIEW">در حال بررسی</option>
                  <option value="ANSWERED">پاسخ داده‌شده</option>
                  <option value="WAITING_FOR_USER">منتظر پاسخ کاربر</option>
                  <option value="WAITING_FOR_SUPPORT">منتظر پاسخ پشتیبانی</option>
                  <option value="CLOSED">بسته‌شده</option>
                </select>
                <input name="reason" placeholder="علت تغییر وضعیت (اختیاری)" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none" />
                <button className="w-full rounded-2xl bg-[#172033] px-4 py-3 text-xs font-black text-[#f0dba9]">ذخیره تغییر وضعیت</button>
              </form>
              <div className="gold-divider" />
              <form action={updateSupportTicketPriorityAction} className="space-y-3">
                <p className="text-xs font-black text-[#7b6a4b]">اولویت فعلی: {data.ticket.priorityLabel}</p>
                <input type="hidden" name="ticketId" value={data.ticket.id} />
                <select name="priority" defaultValue={data.ticket.priority} className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
                  <option value="LOW">کم</option>
                  <option value="NORMAL">متوسط</option>
                  <option value="HIGH">زیاد</option>
                  <option value="URGENT">فوری</option>
                </select>
                <input name="reason" placeholder="علت تغییر اولویت (اختیاری)" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none" />
                <button className="w-full rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-3 text-xs font-black text-[#172033]">ذخیره تغییر اولویت</button>
              </form>
            </AdminCard>
          </section>

          <AdminCard className="space-y-4">
            <div className="flex items-center gap-2">
              <History size={19} className="text-[#9a6a15]" />
              <h2 className="text-lg font-black text-[#172033]">تاریخچه تیکت</h2>
            </div>
            <div className="space-y-3">
              {data.timeline.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                  <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[#c79b3b]" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[#172033]">{item.label}</p>
                      <StatusChip tone={item.tone as AdminChipTone}>{item.actor}</StatusChip>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#6d5f49]">{formatJalaliAuditDateTime(item.at)}</p>
                    {item.description ? <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{item.description}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        <aside className="space-y-4">
          <AdminCard className="space-y-3">
            <h2 className="text-lg font-black text-[#172033]">تالار مرتبط</h2>
            <p className="text-base font-black text-[#172033]">{data.relatedHall.name}</p>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={data.relatedHall.subscriptionTone as AdminChipTone}>{data.relatedHall.subscriptionLabel}</StatusChip>
              {data.relatedHall.periodEnd ? <StatusChip tone="navy">پایان دوره: {formatJalaliDate(data.relatedHall.periodEnd)}</StatusChip> : null}
            </div>
            <div className="grid gap-2 text-xs font-bold leading-6 text-[#6d5f49]">
              <span>مالک: {data.relatedHall.ownerName}</span>
              <span>موبایل: {data.relatedHall.ownerMobile || "ثبت نشده"}</span>
              <span>ایمیل: {data.relatedHall.ownerEmail}</span>
              <span>آخرین فعالیت: {data.relatedHall.lastActivityAt ? formatJalaliAuditDateTime(data.relatedHall.lastActivityAt) : "ثبت نشده"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SideMetric label="تیکت باز" value={formatPersianNumber(data.relatedHall.openTicketsCount)} />
              <SideMetric label="کل تیکت‌ها" value={formatPersianNumber(data.relatedHall.totalTicketsCount)} />
              <SideMetric label="قراردادها" value={formatPersianNumber(data.relatedHall.contractsCount)} />
              <SideMetric label="دریافتی‌ها" value={formatIRR(data.relatedHall.receiptsTotal)} />
            </div>
            <div className="grid gap-2">
              <Link href={data.relatedHall.detailHref} className="rounded-2xl bg-[#172033] px-4 py-3 text-center text-xs font-black text-[#f0dba9]">مشاهده تالار</Link>
              <Link href={data.relatedHall.supportHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-3 text-center text-xs font-black text-[#172033]">همه تیکت‌های این تالار</Link>
            </div>
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="text-lg font-black text-[#172033]">کاربر ارسال‌کننده</h2>
            <div className="flex items-start gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><UserRound size={18} /></span>
              <div>
                <p className="font-black text-[#172033]">{data.createdByUser.name}</p>
                <p className="text-xs font-bold leading-6 text-[#6d5f49]">{data.createdByUser.role}</p>
              </div>
            </div>
            <div className="grid gap-2 text-xs font-bold leading-6 text-[#6d5f49]">
              <span>ایمیل: {data.createdByUser.email || "ثبت نشده"}</span>
              <span>موبایل: {data.createdByUser.mobile || "ثبت نشده"}</span>
              <span>آخرین ورود: {data.createdByUser.lastLoginAt ? formatJalaliAuditDateTime(data.createdByUser.lastLoginAt) : "ثبت نشده"}</span>
            </div>
            {data.createdByUser.href ? <Link href={data.createdByUser.href} className="block rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-3 text-center text-xs font-black text-[#172033]">مشاهده کاربر</Link> : null}
          </AdminCard>

          <AdminCard className="space-y-3">
            <h2 className="text-lg font-black text-[#172033]">تیکت‌های قبلی این تالار</h2>
            {data.previousTickets.length > 0 ? (
              <div className="space-y-2">
                {data.previousTickets.map((ticket) => (
                  <Link key={ticket.id} href={ticket.href} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-[#172033]">{ticket.ticketNumber}</span>
                      <StatusChip tone={ticket.statusTone as AdminChipTone}>{ticket.statusLabel}</StatusChip>
                    </div>
                    <p className="mt-2 line-clamp-1 text-xs font-bold text-[#6d5f49]">{ticket.title}</p>
                    <p className="mt-1 text-[11px] font-bold text-[#7b6a4b]">{formatJalaliDate(ticket.createdAt)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 text-xs font-bold leading-6 text-[#7b6a4b]">تیکت قبلی برای این تالار ثبت نشده است.</p>
            )}
          </AdminCard>
        </aside>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: AdminSupportMessageItem }) {
  const toneClass = message.senderType === "SUPPORT"
    ? "border-emerald-200 bg-emerald-50/80"
    : message.senderType === "INTERNAL_NOTE"
      ? "border-amber-200 bg-amber-50/85"
      : message.senderType === "SYSTEM"
        ? "border-[#d8c08b]/55 bg-[#172033]/[0.06]"
        : "border-[#e8c478]/28 bg-[#fffaf0]";

  return (
    <article className={`rounded-[1.5rem] border p-4 ${toneClass}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]">{message.senderType === "INTERNAL_NOTE" ? <Lock size={17} /> : <MessageSquare size={17} />}</span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-black text-[#172033]">{message.senderLabel}</p>
              <StatusChip tone={message.tone as AdminChipTone}>{message.senderName}</StatusChip>
            </div>
            <p className="text-xs font-bold text-[#7d6841]">{message.senderRole} · {formatJalaliAuditDateTime(message.createdAt)}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm font-bold leading-8 text-[#334155]">{message.body}</p>
      {message.attachments.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {message.attachments.map((attachment) => (
            <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-[#d8c08b]/65 bg-white/75 px-3 py-1.5 text-xs font-black text-[#7d6841]">
              <Paperclip size={13} /> {attachment.fileName} {fileSizeLabel(attachment.sizeBytes)}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function SideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 text-center">
      <p className="break-words text-sm font-black text-[#172033]">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-[#7b6a4b]">{label}</p>
    </div>
  );
}
