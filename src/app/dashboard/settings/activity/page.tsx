import type { ReactNode } from "react";
import { Activity, ArrowRight, ClipboardList, Filter, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AuditFilterForm } from "@/components/dashboard/audit/audit-filter-form";
import { AuditLogList } from "@/components/dashboard/audit/audit-log-list";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getAuditLogs } from "@/lib/audit/audit-log-service";
import { formatJalaliAuditDateTime, parseDateLikeToDate, toPersianDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

type ActivityPageProps = {
  searchParams?: Promise<{
    q?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

function getPageNumber(value: string | undefined) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildActivityHref(params: Record<string, string | undefined>, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      next.set(key, value);
    }
  }
  next.set("page", String(page));
  return `/dashboard/settings/activity?${next.toString()}`;
}

function ActivityStatCard({ icon, title, value, description }: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-[#e8c478]/35 bg-white/72 p-4 shadow-[0_18px_50px_rgba(23,32,51,0.07)] backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9]">
          {icon}
        </div>
        <p className="text-2xl font-black text-[#172033]">{value}</p>
      </div>
      <h2 className="mt-4 text-sm font-black text-[#172033]">{title}</h2>
      <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{description}</p>
    </div>
  );
}

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const membership = await requireTenantPermission("settings.view");
  const params = (await searchParams) ?? {};
  const page = getPageNumber(params.page);
  const fromDate = parseDateLikeToDate(params.from);
  const toDate = parseDateLikeToDate(params.to);
  const db = await getPrisma();

  const [auditResult, tenantUsers] = await Promise.all([
    getAuditLogs({
      tenantId: membership.tenantId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      userId: params.userId,
      query: params.q,
      from: fromDate,
      to: toDate
        ? new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate(), 23, 59, 59, 999))
        : null,
      limit: 20,
      page,
    }),
    db.tenantMember.findMany({
      where: { tenantId: membership.tenantId },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const latestItem = auditResult.items[0];
  const filterParams = {
    q: params.q,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId,
    from: params.from,
    to: params.to,
  };

  return (
    <main className="space-y-6">
      <div className="rounded-[2.4rem] border border-[#e8c478]/32 bg-[radial-gradient(circle_at_top_left,rgba(240,219,169,0.30),transparent_34%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-6 text-[#fff8ea] shadow-[0_28px_90px_rgba(17,24,39,0.26)] sm:p-8">
        <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-black text-[#f0dba9] transition hover:bg-white/[0.12]">
          <ArrowRight size={15} />
          بازگشت به تنظیمات
        </Link>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">
              <Activity size={15} />
              ردپای عملیاتی امن
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">تاریخچه فعالیت‌ها</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#d9caa9]">
              تمام تغییرات مهم، ثبت‌ها، ویرایش‌ها، لغوها، دریافتی‌ها و تنظیمات سامانه در این بخش قابل پیگیری است.
            </p>
          </div>
          <div className="rounded-[1.6rem] border border-white/[0.10] bg-white/[0.06] p-4 text-sm font-black text-[#f0dba9]">
            آخرین فعالیت: {latestItem ? formatJalaliAuditDateTime(latestItem.createdAt) : "ثبت نشده"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ActivityStatCard icon={<ClipboardList size={20} />} title="تعداد لاگ‌های فیلترشده" value={toPersianDigits(auditResult.pagination.total)} description="همه رکوردها فقط برای فضای کاری فعلی نمایش داده می‌شوند." />
        <ActivityStatCard icon={<Filter size={20} />} title="صفحه فعلی" value={toPersianDigits(auditResult.pagination.page)} description={`از ${toPersianDigits(auditResult.pagination.totalPages)} صفحه تاریخچه`} />
        <ActivityStatCard icon={<ShieldCheck size={20} />} title="حفاظت داده حساس" value="فعال" description="رمز، توکن، کلید API و سکرت‌ها ذخیره یا نمایش داده نمی‌شوند." />
      </div>

      <AuditFilterForm users={tenantUsers.map((item) => ({ id: item.userId, label: item.user.name || item.user.email }))} />
      <AuditLogList items={auditResult.items} />

      {auditResult.pagination.totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2">
          {page > 1 ? (
            <Link href={buildActivityHref(filterParams, page - 1)} className="rounded-2xl border border-[#d8c08b]/65 bg-[#fff8ea] px-4 py-2 text-sm font-black text-[#7d5d23] hover:bg-white">
              صفحه قبل
            </Link>
          ) : null}
          <span className="rounded-2xl bg-[#172033] px-4 py-2 text-sm font-black text-[#fff8ea]">
            صفحه {toPersianDigits(page)} از {toPersianDigits(auditResult.pagination.totalPages)}
          </span>
          {page < auditResult.pagination.totalPages ? (
            <Link href={buildActivityHref(filterParams, page + 1)} className="rounded-2xl border border-[#d8c08b]/65 bg-[#fff8ea] px-4 py-2 text-sm font-black text-[#7d5d23] hover:bg-white">
              صفحه بعد
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
