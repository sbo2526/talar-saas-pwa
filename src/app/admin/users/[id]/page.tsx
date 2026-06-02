/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ShieldAlert, Trash2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusChip } from "@/components/admin/status-chip";
import { getAdminUserDetailData } from "@/lib/admin/admin-users-data";
import { getSubscriptionStatusLabel, getTenantStatusLabel, getTenantStatusTone, getTicketStatusLabel, getTicketStatusTone } from "@/lib/admin/admin-labels";
import { formatJalaliAuditDateTime, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { deleteAdminUserCascadeAction } from "@/lib/actions/admin-user-delete-actions";

type PageProps = { params: Promise<{ id: string }>; searchParams?: Promise<{ deleteError?: string }> };

export default async function AdminUserDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const data = await getAdminUserDetailData(id);
  if (!data) notFound();
  const { user } = data;

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="پرونده کاربر" title={user.name || user.email} subtitle="اطلاعات پروفایل، عضویت‌ها، فضاهای کاری، تیکت‌ها و فعالیت‌های ثبت‌شده این کاربر." action={<Link href="/admin/users" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-black text-[#f0dba9]"><ArrowRight size={16} /> بازگشت</Link>} />

      {query.deleteError ? (
        <AdminCard className="border-rose-200 bg-rose-50">
          <div className="flex items-start gap-3 text-rose-800">
            <ShieldAlert className="mt-1 shrink-0" size={20} />
            <div>
              <h2 className="text-sm font-black">حذف کاربر انجام نشد</h2>
              <p className="mt-1 text-xs font-bold leading-6">{getDeleteErrorMessage(query.deleteError)}</p>
            </div>
          </div>
        </AdminCard>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">مشخصات کاربر</h2>
          <div className="grid gap-3">
            <Info label="نام" value={user.name} />
            <Info label="ایمیل" value={user.email} />
            <Info label="موبایل" value={user.phone} />
            <Info label="کد ملی" value={user.nationalCode ? "ثبت شده" : "—"} />
            <Info label="وضعیت" value={user.status === "ACTIVE" ? "فعال" : user.status === "SUSPENDED" ? "تعلیق‌شده" : "دعوت‌شده"} />
            <Info label="ثبت‌نام" value={formatJalaliDateTime(user.createdAt)} />
            <Info label="آخرین ورود" value={formatJalaliDateTime(user.lastLoginAt)} />
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">فضاهای کاری و عضویت‌ها</h2>
          <div className="space-y-3">
            {user.memberships.map((member: any) => (
              <Link key={member.id} href={`/admin/tenants/${member.tenant.id}`} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-[#172033]">{member.tenant.hallProfile?.brandName || member.tenant.name}</p><StatusChip tone={getTenantStatusTone(member.tenant.status)}>{getTenantStatusLabel(member.tenant.status)}</StatusChip></div>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">نقش: {getRoleLabel(member.role)} · {getSubscriptionStatusLabel(member.tenant.subscription?.status)}</p>
              </Link>
            ))}
            {user.memberships.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">عضویتی ثبت نشده است.</p> : null}
          </div>
        </AdminCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">تیکت‌های کاربر</h2>
          <div className="space-y-3">
            {data.tickets.map((ticket: any) => (
              <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-[#172033]">{ticket.ticketNumber}</p><StatusChip tone={getTicketStatusTone(ticket.status)}>{getTicketStatusLabel(ticket.status)}</StatusChip></div>
                <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{ticket.title} · {ticket.tenant.name}</p>
              </Link>
            ))}
            {data.tickets.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">تیکتی ثبت نشده است.</p> : null}
          </div>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-lg font-black text-[#172033]">فعالیت‌های مرتبط</h2>
          <div className="space-y-3">
            {data.activity.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
                <p className="font-black text-[#172033]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-bold leading-6 text-[#7b6a4b]">{item.message}</p>
                <p className="mt-1 text-xs font-bold text-[#6d5f49]">{item.tenant.name} · {formatJalaliAuditDateTime(item.createdAt)}</p>
              </div>
            ))}
            {data.activity.length === 0 ? <p className="text-sm font-bold text-[#7b6a4b]">فعالیتی ثبت نشده است.</p> : null}
          </div>
        </AdminCard>
      </section>

      <AdminCard id="delete-user" className="border-rose-200 bg-gradient-to-br from-rose-50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-800"><ShieldAlert size={15} /> منطقه حذف قطعی</p>
            <h2 className="mt-3 text-xl font-black text-[#172033]">حذف کاربر و پاک‌سازی کامل داده‌های وابسته</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#7b6a4b]">
              با این عملیات، حساب کاربر حذف می‌شود. اگر کاربر مالک تالار باشد، کل فضای کاری خودش شامل مشتری‌ها، قراردادها، پرداخت‌ها، هزینه‌ها، تنظیمات، تیکت‌ها، لاگ‌ها و فایل‌های آپلودی همان تالار هم حذف می‌شود. عضویت او در تالارهای دیگر فقط حذف می‌شود و دیتابیس مالک دیگر دست‌نخورده می‌ماند.
            </p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-white/80 p-4 text-xs font-bold leading-7 text-rose-800">
            <p className="font-black">این عملیات برگشت‌پذیر نیست.</p>
            <p>قبل از حذف، از دیتابیس بکاپ بگیرید.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <DeleteMetric label="تالارهای مالکیتی قابل حذف" value={data.deletionPreview.ownedTenantsCount} />
          <DeleteMetric label="عضویت در تالارهای دیگر" value={data.deletionPreview.nonOwnedMembershipsCount} />
          <DeleteMetric label="مشتری‌های تالارهای خودش" value={data.deletionPreview.ownedCustomersCount} />
          <DeleteMetric label="قراردادهای تالارهای خودش" value={data.deletionPreview.ownedContractsCount} />
          <DeleteMetric label="پرداخت‌های تالارهای خودش" value={data.deletionPreview.ownedPaymentsCount} />
          <DeleteMetric label="هزینه‌های تالارهای خودش" value={data.deletionPreview.ownedExpensesCount} />
          <DeleteMetric label="تیکت‌های وابسته" value={data.deletionPreview.ownedSupportTicketsCount + data.deletionPreview.directSupportTicketsCount} />
          <DeleteMetric label="اعلان‌ها و لاگ‌های مستقیم" value={data.deletionPreview.directNotificationsCount + data.deletionPreview.directAuditLogsCount} />
        </div>

        <form action={deleteAdminUserCascadeAction} className="mt-5 rounded-3xl border border-rose-200 bg-white/85 p-4">
          <input type="hidden" name="userId" value={user.id} />
          <label className="block text-xs font-black text-[#172033]" htmlFor="confirmEmail">برای تأیید حذف، ایمیل همین کاربر را دقیق وارد کنید:</label>
          <input
            id="confirmEmail"
            name="confirmEmail"
            dir="ltr"
            placeholder={user.email}
            className="mt-2 h-12 w-full rounded-2xl border border-rose-200 bg-white px-4 text-left text-sm font-bold text-[#172033] outline-none focus:border-rose-500"
          />
          <button type="submit" className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-rose-700 px-5 py-3 text-xs font-black text-white hover:bg-rose-800">
            <Trash2 size={16} /> حذف قطعی کاربر و داده‌های وابسته
          </button>
        </form>
      </AdminCard>
    </div>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3"><p className="text-[11px] font-black text-[#7b6a4b]">{label}</p><p className="mt-1 text-sm font-black text-[#172033]">{String(value || "—")}</p></div>;
}

function getRoleLabel(role: string | null | undefined) {
  if (role === "OWNER") return "مالک تالار";
  if (role === "ADMIN") return "مدیر تالار";
  if (role === "STAFF") return "عضو";
  return "عضو";
}


function DeleteMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-rose-100 bg-white/80 p-3">
      <p className="text-[11px] font-black text-rose-800">{label}</p>
      <p className="mt-1 text-lg font-black text-[#172033]">{formatPersianNumber(value)}</p>
    </div>
  );
}

function getDeleteErrorMessage(code: string) {
  if (code === "cannot-delete-self") return "مدیر کل سامانه نمی‌تواند حساب خودش را حذف کند.";
  if (code === "cannot-delete-platform-admin") return "حذف مدیر کل سامانه از این صفحه مجاز نیست. اول باید ایمیل او از PLATFORM_ADMIN_EMAILS خارج شود.";
  if (code === "confirmation-mismatch") return "ایمیل تأیید حذف با ایمیل کاربر یکی نیست.";
  if (code === "user-not-found") return "کاربر پیدا نشد یا قبلاً حذف شده است.";
  if (code === "missing-user") return "شناسه کاربر برای حذف ارسال نشده است.";
  return "درخواست حذف معتبر نبود.";
}
