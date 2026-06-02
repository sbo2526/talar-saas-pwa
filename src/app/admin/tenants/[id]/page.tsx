/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, Eye, LifeBuoy, ReceiptText, UsersRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminStatCard } from "@/components/admin/stat-card";
import { StatusChip } from "@/components/admin/status-chip";
import { getAdminTenantDetailData } from "@/lib/admin/tenant-admin-data";
import { getSubscriptionPlanLabel, getSubscriptionStatusLabel, getSubscriptionStatusTone, getTenantStatusLabel, getTenantStatusTone, getTicketStatusLabel, getTicketStatusTone } from "@/lib/admin/admin-labels";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { formatJalaliAuditDateTime, formatJalaliDate, formatJalaliDateTime } from "@/lib/date/jalali";

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminTenantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getAdminTenantDetailData(id);
  if (!data) notFound();

  const { tenant } = data;
  const displayName = tenant.hallProfile?.brandName || tenant.name;

  return (
    <div className="space-y-6" id="tenant-overview">
      <AdminPageHeader
        eyebrow="نمای امن tenant"
        title={displayName}
        subtitle="جزئیات کامل تالار، مالک، اعضا، اشتراک، مصرف، تیکت‌ها و فعالیت‌ها بدون ورود ناامن به داشبورد tenant."
        action={<Link href="/admin/tenants" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-black text-[#f0dba9]"><ArrowRight size={16} /> بازگشت</Link>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard title="قراردادها" value={formatPersianNumber(tenant._count.contracts)} icon={<Building2 size={20} />} />
        <AdminStatCard title="مشتریان" value={formatPersianNumber(tenant._count.customers)} icon={<UsersRound size={20} />} />
        <AdminStatCard title="دریافتی‌ها" value={formatIRR(data.totals.receipts)} icon={<ReceiptText size={20} />} tone="emerald" />
        <AdminStatCard title="هزینه‌ها" value={formatIRR(data.totals.expenses)} icon={<ReceiptText size={20} />} tone="rose" />
        <AdminStatCard title="تیکت‌ها" value={formatPersianNumber(tenant._count.supportTickets)} icon={<LifeBuoy size={20} />} tone="amber" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminCard>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#172033]">هویت تالار و وضعیت حساب</h2>
            <div className="flex flex-wrap gap-2">
              <StatusChip tone={getTenantStatusTone(tenant.status)}>{getTenantStatusLabel(tenant.status)}</StatusChip>
              <StatusChip tone={getSubscriptionStatusTone(tenant.subscription?.status)}>{getSubscriptionStatusLabel(tenant.subscription?.status)}</StatusChip>
              <StatusChip tone="navy">پلن {getSubscriptionPlanLabel(tenant.subscription?.plan)}</StatusChip>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="نام فضای کاری" value={tenant.name} />
            <Info label="برند تالار" value={tenant.hallProfile?.brandName} />
            <Info label="نام حقوقی" value={tenant.hallProfile?.legalName} />
            <Info label="شهر" value={tenant.hallProfile?.city} />
            <Info label="تلفن تالار" value={tenant.hallProfile?.phone} />
            <Info label="آدرس" value={tenant.hallProfile?.address} wide />
            <Info label="تاریخ ثبت" value={formatJalaliDateTime(tenant.createdAt)} />
            <Info label="آخرین به‌روزرسانی" value={formatJalaliDateTime(tenant.updatedAt)} />
          </div>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/75 p-3 text-xs font-bold leading-6 text-amber-800">
            دکمه «مشاهده پنل تالار» در این نسخه به نمای مدیریتی امن همین صفحه متصل است و tenantId را به داشبورد معمولی تزریق نمی‌کند.
            <a href="#tenant-overview" className="mr-2 inline-flex items-center gap-1 font-black text-[#8a6a22]"><Eye size={14} /> مشاهده پنل تالار</a>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">مالک تالار</h2>
          <div className="space-y-3">
            <Info label="نام" value={tenant.owner.name} />
            <Info label="ایمیل" value={tenant.owner.email} />
            <Info label="موبایل" value={tenant.owner.phone} />
            <Info label="وضعیت کاربر" value={tenant.owner.status} />
            <Info label="آخرین ورود" value={formatJalaliDateTime(tenant.owner.lastLoginAt)} />
            <Link href={`/admin/users/${tenant.owner.id}`} className="inline-flex w-full items-center justify-center rounded-2xl bg-[#172033] px-4 py-3 text-xs font-black text-[#f0dba9]">مشاهده کاربر مالک</Link>
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">کاربران و اعضا</h2>
          <div className="space-y-2">
            {tenant.members.map((member: any) => (
              <div key={member.id} className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-[#172033]">{member.user.name || member.user.email}</p>
                  <StatusChip tone="navy">{member.role}</StatusChip>
                </div>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{member.user.email} · آخرین ورود: {formatJalaliDateTime(member.user.lastLoginAt)}</p>
              </div>
            ))}
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">تالارها و سالن‌ها</h2>
          <div className="space-y-2">
            {tenant.halls.map((hall: any) => (
              <div key={hall.id} className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <p className="font-black text-[#172033]">{hall.name}</p>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{hall.city || "شهر ثبت نشده"} · سالن‌ها: {formatPersianNumber(hall.salons.length)}</p>
              </div>
            ))}
            {tenant.halls.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">تالار/سالن ثبت نشده است.</p> : null}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <ListCard title="آخرین قراردادها" items={data.recentContracts.map((contract: any) => ({ id: contract.id, href: `/admin/tenants/${tenant.id}`, title: contract.contractNo, meta: `${contract.customer.fullName} · ${formatJalaliDate(contract.eventDate)}` }))} />
        <ListCard title="آخرین دریافتی‌ها" items={data.recentPayments.map((payment: any) => ({ id: payment.id, href: `/admin/tenants/${tenant.id}`, title: formatIRR(payment.amount), meta: `${payment.contract?.contractNo || "بدون قرارداد"} · ${formatJalaliDate(payment.paidAt)}` }))} />
        <ListCard title="آخرین هزینه‌ها" items={data.recentExpenses.map((expense: any) => ({ id: expense.id, href: `/admin/tenants/${tenant.id}`, title: expense.title, meta: `${formatIRR(expense.amount)} · ${formatJalaliDate(expense.occurredAt)}` }))} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">تیکت‌های پشتیبانی</h2>
          <div className="space-y-3">
            {data.tickets.map((ticket: any) => (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <div className="flex items-center justify-between gap-2"><p className="font-black text-[#172033]">{ticket.ticketNumber}</p><StatusChip tone={getTicketStatusTone(ticket.status)}>{getTicketStatusLabel(ticket.status)}</StatusChip></div>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{ticket.title}</p>
              </Link>
            ))}
            {data.tickets.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">تیکتی ثبت نشده است.</p> : null}
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">فعالیت‌های اخیر</h2>
          <div className="space-y-3">
            {data.activity.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <p className="font-black text-[#172033]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold leading-6 text-[#7b6a4b]">{item.message}</p>
                <p className="mt-1 text-xs font-bold text-[#6d5f49]">{formatJalaliAuditDateTime(item.createdAt)}</p>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value: unknown; wide?: boolean }) {
  return <div className={`rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 ${wide ? "sm:col-span-2" : ""}`}><p className="text-[11px] font-black text-[#7b6a4b]">{label}</p><p className="mt-1 text-sm font-black text-[#172033]">{String(value || "—")}</p></div>;
}

function ListCard({ title, items }: { title: string; items: Array<{ id: string; href: string; title: string; meta: string }> }) {
  return <AdminCard><h2 className="mb-4 text-lg font-black text-[#172033]">{title}</h2><div className="space-y-2">{items.map((item: any) => <Link key={item.id} href={item.href} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3"><p className="font-black text-[#172033]">{item.title}</p><p className="mt-1 text-xs font-bold text-[#7b6a4b]">{item.meta}</p></Link>)}{items.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">موردی برای نمایش وجود ندارد.</p> : null}</div></AdminCard>;
}
