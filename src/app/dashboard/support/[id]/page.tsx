import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, Lock, MessageCircle, Paperclip, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { closeSupportTicketAction, reopenSupportTicketAction } from "@/lib/actions/support-ticket-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliAuditDateTime, toPersianDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { SupportReplyForm } from "@/components/dashboard/support/support-reply-form";
import {
  getSupportCategoryLabel,
  getSupportPriorityClass,
  getSupportPriorityLabel,
  getSupportStatusClass,
  getSupportStatusLabel,
} from "@/lib/support/tickets";

type SupportTicketDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ created?: string; closed?: string; reopened?: string; purchaseRequest?: string }>;
};

type SupportTicketMessageItem = NonNullable<Awaited<ReturnType<typeof getSupportTicketForPage>>>["messages"][number];

async function getSupportTicketForPage(input: { id: string; tenantId: string }) {
  const db = await getPrisma();
  return db.supportTicket.findFirst({
    where: { id: input.id, tenantId: input.tenantId },
    include: {
      messages: { where: { senderType: { not: "INTERNAL_NOTE" } }, orderBy: { createdAt: "asc" }, include: { attachments: true } },
      attachments: true,
    },
  });
}

export default async function SupportTicketDetailPage({ params, searchParams }: SupportTicketDetailPageProps) {
  const membership = await requireTenantMember();
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const ticket = await getSupportTicketForPage({ id, tenantId: membership.tenantId });

  if (!ticket) notFound();
  const isClosed = ticket.status === "CLOSED";

  return (
    <main className="space-y-5">
      <div className="rounded-[2rem] border border-[#e8c478]/32 bg-[linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_22px_70px_rgba(17,24,39,0.22)] sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <Link href="/dashboard/support" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-[#f0dba9] transition hover:bg-white/[0.12]"><ArrowRight size={15} /> بازگشت به پشتیبانی</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#e8c478]/30 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">{toPersianDigits(ticket.ticketNumber)}</span>
              <Badge className={getSupportStatusClass(ticket.status)}>{getSupportStatusLabel(ticket.status)}</Badge>
              <Badge className={getSupportPriorityClass(ticket.priority)}>{getSupportPriorityLabel(ticket.priority)}</Badge>
              <Badge className="border-[#e8c478]/25 bg-white/[0.07] text-[#f0dba9]">{getSupportCategoryLabel(ticket.category)}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-10 sm:text-3xl">{ticket.title}</h1>
            <p className="mt-1 text-sm font-bold leading-7 text-[#d9caa9]">آخرین پیام: {formatJalaliAuditDateTime(ticket.lastMessageAt)}</p>
          </div>
          {isClosed ? (
            <form action={reopenSupportTicketAction}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <button className="btn-luxury-primary justify-center px-5 py-3"><RotateCcw size={17} /> بازگشایی تیکت</button>
            </form>
          ) : (
            <form action={closeSupportTicketAction}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#b45353]/35 bg-[#fff1f1] px-5 py-3 text-sm font-black text-[#8f2c2c]"><XCircle size={17} /> بستن تیکت</button>
            </form>
          )}
        </div>
      </div>

      {query.created ? <Alert tone="success">تیکت پشتیبانی ثبت شد.</Alert> : null}
      {query.purchaseRequest ? <Alert tone="success">درخواست خرید پلن ثبت شد و ادامه هماهنگی از همین تیکت انجام می‌شود.</Alert> : null}
      {query.closed ? <Alert tone="success">تیکت بسته شد.</Alert> : null}
      {query.reopened ? <Alert tone="success">تیکت بازگشایی شد.</Alert> : null}
      {isClosed ? <Alert tone="warning">این تیکت بسته شده است. برای ارسال پاسخ جدید، ابتدا آن را بازگشایی کنید.</Alert> : null}

      <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-3 shadow-[0_16px_50px_rgba(17,24,39,0.06)] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#d8c08b]/45 pb-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black text-[#9f7131]"><MessageCircle size={16} /> گفت‌وگوی تیکت</p>
            <h2 className="mt-1 text-lg font-black text-[#172033]">پیام‌ها به‌ترتیب مکالمه</h2>
          </div>
          <span className="rounded-full border border-[#d8c08b]/55 bg-white/65 px-3 py-1 text-xs font-black text-[#7d6841]">{toPersianDigits(ticket.messages.length)} پیام</span>
        </div>
        <div className="grid gap-4">
          {ticket.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
        </div>
      </section>

      <SupportReplyForm ticketId={ticket.id} disabled={isClosed} />
    </main>
  );
}

function MessageBubble({ message }: { message: SupportTicketMessageItem }) {
  const isSupportMessage = message.senderType === "SUPPORT" || message.senderType === "SYSTEM";
  const senderLabel = isSupportMessage ? (message.senderType === "SYSTEM" ? "سیستم پشتیبانی" : "تیم پشتیبانی") : "کاربر / مشتری";

  return (
    <article className={`flex ${isSupportMessage ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[min(92%,44rem)] rounded-[1.6rem] border p-4 shadow-[0_12px_34px_rgba(17,24,39,0.07)] ${isSupportMessage ? "rounded-bl-md border-[#d8c08b]/65 bg-white text-[#172033]" : "rounded-br-md border-[#172033]/15 bg-[#172033] text-[#fff8ea]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`text-xs font-black ${isSupportMessage ? "text-[#9f7131]" : "text-[#f0dba9]"}`}>{senderLabel}</span>
          <span className={`text-[11px] font-bold ${isSupportMessage ? "text-[#7d6841]" : "text-[#d9caa9]"}`}>{formatJalaliAuditDateTime(message.createdAt)}</span>
        </div>
        <p className={`mt-3 whitespace-pre-wrap text-sm font-bold leading-8 ${isSupportMessage ? "text-[#334155]" : "text-[#fff8ea]"}`}>{message.body}</p>
        {message.attachments.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <a key={attachment.id} href={attachment.fileUrl} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black ${isSupportMessage ? "border-[#d8c08b]/65 bg-[#fff9ee] text-[#7d6841]" : "border-[#e8c478]/40 bg-white/[0.10] text-[#f0dba9]"}`}>
                <Paperclip size={13} /> {attachment.fileName}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}>{children}</span>;
}

function Alert({ children, tone }: { children: ReactNode; tone: "success" | "warning" }) {
  const className = tone === "success" ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]" : "border-[#c7a15a]/34 bg-[#fff4d8] text-[#7d6841]";
  return <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${className}`}><Lock size={16} />{children}</div>;
}
