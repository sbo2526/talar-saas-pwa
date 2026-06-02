import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { Headset, MessageCircle, Plus, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliAuditDateTime, toPersianDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import {
  getSupportCategoryLabel,
  getSupportPriorityClass,
  getSupportPriorityLabel,
  getSupportStatusClass,
  getSupportStatusLabel,
  supportTicketCategoryLabels,
  supportTicketCategoryValues,
  supportTicketPriorityLabels,
  supportTicketPriorityValues,
  supportTicketStatusLabels,
  supportTicketStatusValues,
} from "@/lib/support/tickets";

type SupportPageProps = {
  searchParams?: Promise<{ q?: string; status?: string; priority?: string; category?: string; sort?: string }>;
};

type TicketListItem = Prisma.SupportTicketGetPayload<{
  include: { messages: { select: { id: true; body: true; createdAt: true }; orderBy: { createdAt: "desc" }; take: 1 }; attachments: { select: { id: true } } };
}>;

function normalizeFilter<T extends readonly string[]>(values: T, value: string | undefined): T[number] | undefined {
  return value && values.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function badge(className: string, children: ReactNode) {
  return <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{children}</span>;
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const membership = await requireTenantMember();
  const params = (await searchParams) ?? {};
  const status = normalizeFilter(supportTicketStatusValues, params.status);
  const priority = normalizeFilter(supportTicketPriorityValues, params.priority);
  const category = normalizeFilter(supportTicketCategoryValues, params.category);
  const q = params.q?.trim();
  const db = await getPrisma();

  const where: Prisma.SupportTicketWhereInput = {
    tenantId: membership.tenantId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { ticketNumber: { contains: q, mode: "insensitive" } }] } : {}),
  };

  const [tickets, counts] = await Promise.all([
    db.supportTicket.findMany({
      where,
      include: {
        messages: { where: { senderType: { not: "INTERNAL_NOTE" } }, select: { id: true, body: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        attachments: { select: { id: true } },
      },
      orderBy: params.sort === "oldest" ? { lastMessageAt: "asc" } : { lastMessageAt: "desc" },
      take: 40,
    }),
    db.supportTicket.groupBy({ by: ["status"], where: { tenantId: membership.tenantId }, _count: { _all: true } }),
  ]);

  const countByStatus = new Map(counts.map((item) => [item.status, item._count._all]));

  return (
    <main className="space-y-6">
      <div className="rounded-[2.4rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_top_left,rgba(240,219,169,0.30),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-6 text-[#fff8ea] shadow-[0_28px_90px_rgba(17,24,39,0.26)] sm:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]"><Headset size={15} /> مرکز ارتباط با پشتیبانی</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">پشتیبانی</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9]">درخواست‌های پشتیبانی، پیگیری مشکلات و مکاتبات با تیم پشتیبانی را از این بخش مدیریت کنید.</p>
          </div>
          <Link href="/dashboard/support/new" className="btn-luxury-primary justify-center px-5 py-3"><Plus size={18} /> ثبت تیکت جدید</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat title="تیکت‌های باز" value={countByStatus.get("OPEN") ?? 0} />
        <Stat title="در حال بررسی" value={countByStatus.get("IN_REVIEW") ?? 0} />
        <Stat title="در انتظار پاسخ شما" value={countByStatus.get("WAITING_FOR_USER") ?? 0} />
        <Stat title="بسته‌شده" value={countByStatus.get("CLOSED") ?? 0} />
      </div>

      <form className="grid gap-3 rounded-[1.7rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.055)] md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(9rem,auto))]">
        <label className="grid gap-1.5 text-xs font-black text-[#172033]"><span>جستجو</span><div className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9f7131]" size={16} /><input name="q" defaultValue={q ?? ""} className="input-luxury min-h-12 py-2 pl-4 pr-12 text-sm" placeholder="شماره یا عنوان تیکت" /></div></label>
        <FilterSelect name="status" label="وضعیت" value={status} options={supportTicketStatusLabels} />
        <FilterSelect name="priority" label="اولویت" value={priority} options={supportTicketPriorityLabels} />
        <FilterSelect name="category" label="موضوع" value={category} options={supportTicketCategoryLabels} />
        <FilterSelect name="sort" label="مرتب‌سازی" value={params.sort === "oldest" ? "oldest" : "newest"} options={{ newest: "جدیدترین", oldest: "قدیمی‌ترین" }} />
        <button className="btn-luxury-dark min-h-12 self-end px-5 py-3" type="submit">اعمال فیلتر</button>
      </form>

      {tickets.length > 0 ? (
        <div className="grid gap-3">
          {tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      ) : (
        <div className="rounded-[1.8rem] border border-dashed border-[#d8c08b]/65 bg-[#fff9ee]/72 p-8 text-center">
          <MessageCircle className="mx-auto text-[#c7a15a]" size={38} />
          <h2 className="mt-4 text-lg font-black text-[#172033]">هنوز تیکتی ثبت نشده است.</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#7d6841]">برای ارتباط با پشتیبانی، اولین درخواست خود را ثبت کنید.</p>
        </div>
      )}
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return <div className="rounded-[1.6rem] border border-[#e8c478]/35 bg-white/72 p-4 shadow-[0_18px_50px_rgba(23,32,51,0.07)]"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><ShieldCheck size={18} /></span><strong className="text-2xl font-black text-[#172033]">{toPersianDigits(value)}</strong></div><p className="mt-4 text-sm font-black text-[#172033]">{title}</p></div>;
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value?: string; options: Record<string, string> }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#172033]"><span>{label}</span><select name={name} defaultValue={value ?? ""} className="input-luxury min-h-12 py-2 text-sm"><option value="">همه</option>{Object.entries(options).map(([key, labelText]) => <option key={key} value={key}>{labelText}</option>)}</select></label>;
}

function TicketCard({ ticket }: { ticket: TicketListItem }) {
  const latestMessage = ticket.messages[0];
  return (
    <article className="rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_44px_rgba(17,24,39,0.055)]">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {badge("border-[#c7a15a]/40 bg-[#fff4d8] text-[#7d6841]", toPersianDigits(ticket.ticketNumber))}
            {badge(getSupportStatusClass(ticket.status), getSupportStatusLabel(ticket.status))}
            {badge(getSupportPriorityClass(ticket.priority), getSupportPriorityLabel(ticket.priority))}
            {badge("border-[#d8c08b]/55 bg-white/55 text-[#7d6841]", getSupportCategoryLabel(ticket.category))}
          </div>
          <h2 className="mt-3 text-lg font-black text-[#172033]">{ticket.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm font-bold leading-7 text-[#6d5f49]">{latestMessage?.body ?? "بدون پیام"}</p>
          <p className="mt-3 text-xs font-black text-[#9f7131]">آخرین پیام: {formatJalaliAuditDateTime(ticket.lastMessageAt)} {ticket.attachments.length ? `— ${toPersianDigits(ticket.attachments.length)} پیوست` : ""}</p>
        </div>
        <Link href={`/dashboard/support/${ticket.id}`} className="inline-flex items-center justify-center rounded-2xl border border-[#e8c478]/45 bg-[#172033] px-4 py-2.5 text-sm font-black text-[#f0dba9] shadow-[0_12px_28px_rgba(23,32,51,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0f1726] hover:shadow-[0_16px_34px_rgba(23,32,51,0.24)] focus:outline-none focus:ring-2 focus:ring-[#e8c478]/50">مشاهده تیکت</Link>
      </div>
    </article>
  );
}
