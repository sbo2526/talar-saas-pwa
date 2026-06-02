import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Headphones,
  LayoutGrid,
  LifeBuoy,
  MessageCircle,
  Search,
  Table2,
  TicketCheck,
  Timer,
} from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip, type AdminChipTone } from "@/components/admin/status-chip";
import {
  formatWaitingTime,
  getAdminSupportPageData,
  type AdminSupportListParams,
  type AdminSupportTicketListItem,
} from "@/lib/admin/support-admin-data";
import { formatJalaliAuditDateTime } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";

type PageProps = { searchParams?: Promise<AdminSupportListParams & { supportError?: string }> };
type SearchInput = Record<string, string | undefined | null>;

const smartTabs = [
  { key: "all", label: "همه", countKey: "all" },
  { key: "urgent", label: "فوری", countKey: "urgent" },
  { key: "open", label: "باز", countKey: "open" },
  { key: "waiting-support", label: "منتظر پاسخ من", countKey: "waitingSupport" },
  { key: "waiting-user", label: "منتظر پاسخ کاربر", countKey: "waitingUser" },
  { key: "unanswered", label: "بدون پاسخ", countKey: "unanswered" },
  { key: "today", label: "امروز", countKey: "today" },
  { key: "closed", label: "بسته‌شده", countKey: "closed" },
] as const;

function buildSupportHref(current: SearchInput, overrides: SearchInput = {}) {
  const search = new URLSearchParams();
  const merged = { ...current, ...overrides };

  Object.entries(merged).forEach(([key, value]) => {
    if (!value || value === "all" || value === "cards" || (key === "page" && value === "1")) return;
    search.set(key, value);
  });

  const query = search.toString();
  return query ? `/admin/support?${query}` : "/admin/support";
}

function getSupportErrorMessage(error?: string) {
  if (error === "not-found") return "تیکت مورد نظر پیدا نشد.";
  if (error === "closed") return "این تیکت بسته شده است.";
  if (error) return "درخواست پشتیبانی معتبر نیست.";
  return null;
}

function responseTimeLabel(minutes: number | null) {
  if (minutes === null) return "زمان پاسخ هنوز داده کافی ندارد.";
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${formatPersianNumber(days)} روز`;
  if (hours > 0) return `${formatPersianNumber(hours)} ساعت`;
  return `${formatPersianNumber(minutes)} دقیقه`;
}

function hasAdvancedFilters(params: AdminSupportListParams) {
  return Boolean(
    params.tenantId
      || params.userId
      || params.createdFrom
      || params.createdTo
      || params.lastReplyFrom
      || params.lastReplyTo
      || params.unanswered
      || params.attachments
      || params.subscription,
  );
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminSupportPageData(params);
  const current = data.currentFilters;
  const cardView = current.view !== "table";
  const errorMessage = getSupportErrorMessage(params.supportError);
  const hasFilters = Object.entries(params).some(([, value]) => Boolean(value) && value !== "all" && value !== "cards" && value !== "waiting-support");

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.22),transparent_28%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(10,16,27,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex rounded-full border border-[#e8c478]/25 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">مرکز عملیات پشتیبانی سامانه</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">تیکت‌های پشتیبانی</h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#d9caa9]">
              درخواست‌های پشتیبانی تالارها، اولویت‌ها، وضعیت پاسخ‌گویی و پیگیری‌های لازم را از این بخش مدیریت کنید.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={buildSupportHref(current, { tab: "urgent", page: "1" })} className="rounded-2xl border border-rose-300/35 bg-rose-300/10 px-4 py-2 text-xs font-black text-rose-100">تیکت‌های فوری</Link>
            <Link href={buildSupportHref(current, { tab: "waiting-support", page: "1" })} className="rounded-2xl border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">منتظر پاسخ پشتیبانی</Link>
            <Link href="/admin/tenants" className="rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]">مشاهده تالارها</Link>
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-[#e8c478]/30 bg-white/10 px-4 py-2 text-xs font-black text-[#f0dba9]"><ArrowLeft size={15} /> بازگشت به نمای کلی</Link>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{errorMessage}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <AdminStatCard title="کل تیکت‌ها" value={formatPersianNumber(data.kpis.totalTickets)} description="همه درخواست‌های ثبت‌شده" icon={<LifeBuoy size={19} />} tone="navy" />
        <AdminStatCard title="تیکت‌های باز" value={formatPersianNumber(data.kpis.openTickets)} description="پرونده‌هایی که هنوز بسته نشده‌اند" icon={<MessageCircle size={19} />} tone={data.kpis.openTickets > 0 ? "amber" : "emerald"} />
        <AdminStatCard title="فوری" value={formatPersianNumber(data.kpis.urgentTickets)} description="نیازمند رسیدگی سریع" icon={<AlertTriangle size={19} />} tone={data.kpis.urgentTickets > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="منتظر پاسخ پشتیبانی" value={formatPersianNumber(data.kpis.waitingSupport)} description="آخرین پیام از کاربر تالار است" icon={<Clock3 size={19} />} tone={data.kpis.waitingSupport > 0 ? "rose" : "emerald"} />
        <AdminStatCard title="منتظر پاسخ کاربر" value={formatPersianNumber(data.kpis.waitingUser)} description="پشتیبانی پاسخ داده و منتظر کاربر است" icon={<Timer size={19} />} tone="emerald" />
        <AdminStatCard title="بسته‌شده" value={formatPersianNumber(data.kpis.closedTickets)} description="پرونده‌های حل‌شده یا پایان‌یافته" icon={<CheckCircle2 size={19} />} tone="emerald" />
        <AdminStatCard title="ثبت‌شده امروز" value={formatPersianNumber(data.kpis.createdToday)} description="تیکت‌هایی که امروز ایجاد شده‌اند" icon={<TicketCheck size={19} />} tone={data.kpis.createdToday > 0 ? "amber" : "navy"} />
        <AdminStatCard title="میانگین زمان پاسخ" value={responseTimeLabel(data.kpis.averageResponseMinutes)} description="بر اساس اولین پاسخ پشتیبانی" icon={<Timer size={19} />} tone="navy" />
        <AdminStatCard title="تیکت‌های بدون پاسخ" value={formatPersianNumber(data.kpis.unansweredTickets)} description="هیچ پاسخ پشتیبانی ثبت نشده است" icon={<AlertTriangle size={19} />} tone={data.kpis.unansweredTickets > 0 ? "rose" : "emerald"} />
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {smartTabs.map((tab) => {
              const active = current.tab === tab.key;
              const count = data.tabCounts[tab.countKey];
              return (
                <Link
                  key={tab.key}
                  href={buildSupportHref(current, { tab: tab.key, page: "1" })}
                  className={`rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-[#172033] bg-[#172033] text-[#f0dba9]" : "border-[#e8c478]/45 bg-[#fffaf0] text-[#172033] hover:border-[#c79b3b]"}`}
                >
                  {tab.label} <span className="opacity-75">({formatPersianNumber(count)})</span>
                </Link>
              );
            })}
          </div>
          <div className="flex rounded-2xl border border-[#e8c478]/45 bg-[#fffaf0] p-1 text-xs font-black">
            <Link href={buildSupportHref(current, { view: "cards" })} className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 ${cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><LayoutGrid size={14} /> نمای کارت</Link>
            <Link href={buildSupportHref(current, { view: "table" })} className={`hidden items-center gap-1 rounded-xl px-3 py-2 md:inline-flex ${!cardView ? "bg-[#172033] text-[#f0dba9]" : "text-[#6d5f49]"}`}><Table2 size={14} /> نمای جدول</Link>
          </div>
        </div>

        <form className="grid gap-3 lg:grid-cols-[1.4fr_12rem_11rem_12rem_13rem_auto_auto]">
          <input type="hidden" name="tab" value={current.tab} />
          <input type="hidden" name="view" value={current.view} />
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a875f]" size={17} />
            <input name="q" defaultValue={params.q ?? ""} placeholder="جست‌وجوی شماره، عنوان، تالار، کاربر، موبایل یا متن پیام" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/85 pr-10 pl-3 text-sm font-bold outline-none focus:border-[#c79b3b]" />
          </label>
          <select name="status" defaultValue={params.status ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه وضعیت‌ها</option>
            {data.filterOptions.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select name="priority" defaultValue={params.priority ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه اولویت‌ها</option>
            {data.filterOptions.priorities.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
          </select>
          <select name="category" defaultValue={params.category ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="all">همه موضوع‌ها</option>
            {data.filterOptions.categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
          <select name="sort" defaultValue={current.sort} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/85 px-3 text-sm font-bold outline-none">
            <option value="waiting-support">منتظر پاسخ پشتیبانی</option>
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="urgent">فوری‌ترین</option>
            <option value="waiting">بیشترین زمان انتظار</option>
            <option value="last-reply">آخرین پاسخ</option>
            <option value="closed">بسته‌شده‌ها</option>
          </select>
          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#f0dba9]"><Filter size={16} /> اعمال</button>
          <Link href="/admin/support" className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 text-sm font-black text-[#172033]">حذف فیلترها</Link>

          <details open={hasAdvancedFilters(params)} className="rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] p-3 lg:col-span-7">
            <summary className="cursor-pointer text-sm font-black text-[#172033]">فیلترهای پیشرفته</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <input name="tenantId" defaultValue={params.tenantId ?? ""} placeholder="شناسه مسیر تالار" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="userId" defaultValue={params.userId ?? ""} placeholder="شناسه مسیر کاربر" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="createdFrom" defaultValue={params.createdFrom ?? ""} placeholder="ثبت از ۱۴۰۵-۰۲-۰۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="createdTo" defaultValue={params.createdTo ?? ""} placeholder="ثبت تا ۱۴۰۵-۰۲-۳۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="lastReplyFrom" defaultValue={params.lastReplyFrom ?? ""} placeholder="آخرین پاسخ از ۱۴۰۵-۰۲-۰۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <input name="lastReplyTo" defaultValue={params.lastReplyTo ?? ""} placeholder="آخرین پاسخ تا ۱۴۰۵-۰۲-۳۱" className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none" />
              <select name="unanswered" defaultValue={params.unanswered ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت پاسخ</option>
                <option value="yes">بدون پاسخ پشتیبانی</option>
                <option value="no">دارای پاسخ پشتیبانی</option>
              </select>
              <select name="attachments" defaultValue={params.attachments ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">پیوست</option>
                <option value="yes">دارای پیوست</option>
                <option value="no">بدون پیوست</option>
              </select>
              <select name="subscription" defaultValue={params.subscription ?? "all"} className="h-11 rounded-2xl border border-[#e8c478]/45 bg-white px-3 text-xs font-black outline-none">
                <option value="all">وضعیت دوره بررسی/اشتراک</option>
                <option value="demo">دوره بررسی فعال</option>
                <option value="active">اشتراک فعال</option>
                <option value="expired">منقضی‌شده</option>
              </select>
            </div>
          </details>
        </form>
      </AdminCard>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#6d5f49]">
        <p>نمایش {formatPersianNumber(data.from)} تا {formatPersianNumber(data.to)} از {formatPersianNumber(data.totalCount)} تیکت</p>
        {data.tabCounts.urgent === 0 ? <StatusChip tone="emerald">فعلاً تیکت فوری برای پیگیری وجود ندارد.</StatusChip> : null}
      </div>

      {data.tickets.length === 0 ? (
        <AdminCard className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-[#172033] text-[#f0dba9]"><Headphones size={24} /></div>
          <h2 className="mt-4 text-lg font-black text-[#172033]">{hasFilters ? "هیچ تیکتی با این فیلترها پیدا نشد." : "هنوز تیکتی ثبت نشده است."}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-[#7b6a4b]">
            {hasFilters ? "فیلترها را تغییر دهید یا همه تیکت‌های پشتیبانی را دوباره مشاهده کنید." : "پس از ارسال اولین درخواست پشتیبانی توسط کاربران، تیکت‌ها در این بخش نمایش داده می‌شوند."}
          </p>
          <Link href="/admin/support" className="mt-4 inline-flex rounded-2xl bg-[#172033] px-5 py-3 text-sm font-black text-[#f0dba9]">حذف فیلترها</Link>
        </AdminCard>
      ) : cardView ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {data.tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </section>
      ) : (
        <TicketTable tickets={data.tickets} />
      )}

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {data.page > 1 ? <Link href={buildSupportHref(current, { page: String(data.page - 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">قبلی</Link> : null}
          <span className="rounded-2xl border border-[#d8c08b]/55 bg-[#fffaf0] px-4 py-2 text-sm font-black text-[#172033]">صفحه {formatPersianNumber(data.page)} از {formatPersianNumber(data.totalPages)}</span>
          {data.page < data.totalPages ? <Link href={buildSupportHref(current, { page: String(data.page + 1) })} className="rounded-2xl border border-[#d8c08b]/55 bg-white/70 px-4 py-2 text-sm font-black">بعدی</Link> : null}
        </div>
      ) : null}
    </div>
  );
}

function TicketCard({ ticket }: { ticket: AdminSupportTicketListItem }) {
  const primaryLabel = ticket.status === "CLOSED" ? "مشاهده پرونده" : "مشاهده و پاسخ";

  return (
    <AdminCard className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="navy">{ticket.ticketNumber}</StatusChip>
            <StatusChip tone={ticket.statusTone as AdminChipTone}>{ticket.statusLabel}</StatusChip>
            <StatusChip tone={ticket.priorityTone as AdminChipTone}>{ticket.priorityLabel}</StatusChip>
            <StatusChip tone="slate">{ticket.categoryLabel}</StatusChip>
          </div>
          <Link href={ticket.availableActions.detailHref} className="mt-3 block truncate text-lg font-black text-[#172033] hover:text-[#9a6a15]">{ticket.title}</Link>
        </div>
        <StatusChip tone={ticket.operationalTone as AdminChipTone}>{ticket.operationalLabel}</StatusChip>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">تالار و کاربر</p>
          <p className="mt-2 text-sm font-black text-[#172033]">{ticket.hallName}</p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{ticket.createdByName} · {ticket.createdByMobile || ticket.ownerMobile || "موبایل ثبت نشده"}</p>
          <p className="text-xs font-bold text-[#6d5f49]">{ticket.createdByEmail || ticket.ownerEmail}</p>
          <div className="mt-2"><StatusChip tone={ticket.subscriptionTone as AdminChipTone}>{ticket.subscriptionLabel}</StatusChip></div>
        </div>
        <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
          <p className="text-xs font-black text-[#7b6a4b]">وضعیت مکالمه</p>
          <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-[#334155]">{ticket.lastMessagePreview}</p>
          <p className="mt-2 text-xs font-black text-[#172033]">آخرین پیام: {ticket.lastSenderLabel}</p>
          <p className="mt-1 text-xs font-bold text-[#6d5f49]">{formatWaitingTime(ticket.waitingMinutes, ticket.operationalState)}</p>
        </div>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[#e8c478]/25 bg-white/65 p-3 text-xs font-bold leading-6 text-[#6d5f49] sm:grid-cols-3">
        <span>ثبت: {formatJalaliAuditDateTime(ticket.createdAt)}</span>
        <span>آخرین پیام: {formatJalaliAuditDateTime(ticket.lastMessageAt)}</span>
        <span>پیوست: {ticket.hasAttachments ? "دارد" : "ندارد"}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8c478]/25 pt-3">
        <div className="text-xs font-bold text-[#7b6a4b]">{formatPersianNumber(ticket.messagesCount)} پیام قابل مشاهده</div>
        <div className="flex flex-wrap gap-2">
          <Link href={ticket.availableActions.detailHref} className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-xs font-black text-[#f0dba9]"><Eye size={15} /> {primaryLabel}</Link>
          <Link href={ticket.availableActions.hallHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/80 px-4 py-2.5 text-xs font-black text-[#172033]">مشاهده تالار</Link>
        </div>
      </div>
    </AdminCard>
  );
}

function TicketTable({ tickets }: { tickets: AdminSupportTicketListItem[] }) {
  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-right text-xs">
          <thead className="bg-[#172033] text-[#f0dba9]">
            <tr>
              {["شماره", "عنوان", "تالار", "کاربر", "موضوع", "اولویت", "وضعیت", "آخرین پیام", "زمان انتظار", "عملیات"].map((header) => (
                <th key={header} className="px-3 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8c478]/25 bg-white/72">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="align-top">
                <td className="px-3 py-3"><Link href={ticket.availableActions.detailHref} className="font-black text-[#172033] hover:text-[#9a6a15]">{ticket.ticketNumber}</Link></td>
                <td className="px-3 py-3"><Link href={ticket.availableActions.detailHref} className="font-black text-[#172033] hover:text-[#9a6a15]">{ticket.title}</Link></td>
                <td className="px-3 py-3 font-bold text-[#6d5f49]">{ticket.hallName}</td>
                <td className="px-3 py-3 font-bold leading-6 text-[#6d5f49]">{ticket.createdByName}<br />{ticket.createdByMobile || ticket.createdByEmail || "اطلاعات تماس ثبت نشده"}</td>
                <td className="px-3 py-3"><StatusChip tone="slate">{ticket.categoryLabel}</StatusChip></td>
                <td className="px-3 py-3"><StatusChip tone={ticket.priorityTone as AdminChipTone}>{ticket.priorityLabel}</StatusChip></td>
                <td className="px-3 py-3"><StatusChip tone={ticket.statusTone as AdminChipTone}>{ticket.statusLabel}</StatusChip></td>
                <td className="px-3 py-3 font-bold leading-6 text-[#6d5f49]">{ticket.lastSenderLabel}<br />{formatJalaliAuditDateTime(ticket.lastMessageAt)}</td>
                <td className="px-3 py-3 font-black text-[#172033]">{formatWaitingTime(ticket.waitingMinutes, ticket.operationalState)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link href={ticket.availableActions.detailHref} className="rounded-2xl bg-[#172033] px-3 py-2 font-black text-[#f0dba9]">{ticket.status === "CLOSED" ? "پرونده" : "پاسخ"}</Link>
                    <Link href={ticket.availableActions.hallHref} className="rounded-2xl border border-[#d8c08b]/55 bg-white px-3 py-2 font-black text-[#172033]">تالار</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}
