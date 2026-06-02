/* eslint-disable @typescript-eslint/no-explicit-any */
import { Search } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusChip } from "@/components/admin/status-chip";
import { getAdminActivityPageData, type AdminActivityParams } from "@/lib/admin/activity-admin-data";
import { formatJalaliAuditDateTime } from "@/lib/date/jalali";

type PageProps = { searchParams?: Promise<AdminActivityParams> };

export default async function AdminActivityPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const data = await getAdminActivityPageData(params);

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="ردپای سامانه" title="فعالیت‌ها و لاگ‌ها" subtitle="رویدادهای مهم tenantها، تغییرات حساس، پشتیبانی و فعالیت‌های عملیاتی سامانه را به صورت متمرکز مشاهده کنید." />
      <AdminCard>
        <form className="grid gap-3 md:grid-cols-[1fr_12rem_12rem_14rem_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9a875f]" size={17} />
            <input name="q" defaultValue={params.q ?? ""} placeholder="جست‌وجوی عنوان، پیام یا شناسه" className="h-12 w-full rounded-2xl border border-[#e8c478]/45 bg-white/80 pr-10 pl-3 text-sm font-bold outline-none focus:border-[#c79b3b]" />
          </label>
          <select name="action" defaultValue={params.action ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/80 px-3 text-sm font-bold outline-none">
            <option value="all">همه عملیات</option>
            <option value="CREATE">ثبت</option>
            <option value="UPDATE">ویرایش</option>
            <option value="DELETE">حذف</option>
            <option value="STATUS_CHANGE">تغییر وضعیت</option>
            <option value="SETTINGS_UPDATE">تنظیمات</option>
          </select>
          <select name="entityType" defaultValue={params.entityType ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/80 px-3 text-sm font-bold outline-none">
            <option value="all">همه بخش‌ها</option>
            <option value="CONTRACT">قرارداد</option>
            <option value="CUSTOMER">مشتری</option>
            <option value="PAYMENT">دریافتی</option>
            <option value="EXPENSE">هزینه</option>
            <option value="SYSTEM">سامانه</option>
          </select>
          <select name="tenantId" defaultValue={params.tenantId ?? "all"} className="h-12 rounded-2xl border border-[#e8c478]/45 bg-white/80 px-3 text-sm font-bold outline-none">
            <option value="all">همه تالارها</option>
            {data.tenants.map((tenant: any) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <button className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#f0dba9]">اعمال فیلتر</button>
        </form>
      </AdminCard>
      <AdminCard>
        <div className="space-y-3">
          {data.items.map((item: any) => (
            <div key={item.id} className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-black text-[#172033]">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-[#7b6a4b]">{item.tenant.name} · {formatJalaliAuditDateTime(item.createdAt)}</p>
                </div>
                <div className="flex gap-2"><StatusChip tone="navy">{item.action}</StatusChip><StatusChip>{item.entityType}</StatusChip></div>
              </div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#2f3a4b]">{item.message}</p>
            </div>
          ))}
          {data.items.length === 0 ? <p className="text-center text-sm font-bold text-[#7b6a4b]">لاگی با این فیلترها وجود ندارد.</p> : null}
        </div>
      </AdminCard>
    </div>
  );
}
