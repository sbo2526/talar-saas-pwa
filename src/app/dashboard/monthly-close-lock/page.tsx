import { ArrowLeft, CalendarDays, HandCoins, LockKeyhole, ReceiptText, ShieldAlert, UnlockKeyhole, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getOwnerSettlementStatusStyle, ownerSettlementStatusLabels } from "@/lib/owner-settlements/owner-monthly-settlement";
import { getPrisma } from "@/lib/prisma";

export default async function MonthlyCloseLockPage() {
  const membership = await requireTenantPermission("settings.view");
  const db = await getPrisma();
  const settlements = await db.ownerMonthlySettlement.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { generatedAt: "desc" }],
    take: 24,
  });

  const locked = settlements.filter((settlement) => settlement.status === "APPROVED" || settlement.status === "PAID");
  const drafts = settlements.filter((settlement) => settlement.status === "DRAFT");
  const paid = settlements.filter((settlement) => settlement.status === "PAID");

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <LockKeyhole size={15} /> قفل ماه مالی
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">بستن ماه و محافظت از تسویه مالک</h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              وقتی تسویه ماهانه مالک تأیید یا پرداخت شود، همان دوره قفل می‌شود و تغییرات مالی مرتبط با تاریخ مراسم همان ماه متوقف می‌گردد؛ نه اینکه بعداً کسی با لبخند بگوید «یک عدد کوچک عوض شد».
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/owner-settlements" className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 py-2.5 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/34 sm:text-sm">
              <HandCoins size={16} /> تسویه مالک
            </Link>
            <Link href="/dashboard/owner-financial-overview" className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              نمای مالی مالک <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={LockKeyhole} label="دوره‌های قفل‌شده" value={`${formatPersianNumber(locked.length)} دوره`} strong />
        <MetricCard icon={UnlockKeyhole} label="پیش‌نویس‌های باز" value={`${formatPersianNumber(drafts.length)} دوره`} />
        <MetricCard icon={ReceiptText} label="دوره‌های پرداخت‌شده" value={`${formatPersianNumber(paid.length)} دوره`} />
        <MetricCard icon={ShieldAlert} label="قاعده فعال" value="APPROVED / PAID" />
      </section>

      <Panel title="قواعد قفل ماه مالی" icon={ShieldAlert}>
        <div className="grid gap-3 md:grid-cols-2">
          <Rule title="تعیین وضعیت بعد از مراسم" description="اگر تاریخ مراسم داخل ماه بسته‌شده باشد، ثبت برگزار شد/نشد متوقف می‌شود." />
          <Rule title="صدور صورتحساب" description="برای قراردادهای داخل دوره قفل‌شده، صورتحساب جدید بعد از مراسم صادر نمی‌شود." />
          <Rule title="اصلاح فاکتور" description="درخواست اصلاح و اعمال اصلاح مالک روی فاکتورهای دوره بسته‌شده مسدود می‌شود." />
          <Rule title="پاسخ مشتری" description="ثبت پاسخ/اعتراض جدید مشتری روی لینک فاکتور دوره بسته‌شده مسدود می‌شود." />
          <Rule title="ارسال مجدد صورتحساب" description="ارسال/تغییر وضعیت صورتحساب در دوره بسته‌شده متوقف می‌شود تا Snapshot تسویه حفظ شود." />
          <Rule title="بازنویسی تسویه" description="تسویه تأیید/پرداخت‌شده با پیش‌نویس جدید بازنویسی نمی‌شود." />
        </div>
      </Panel>

      <Panel title="دوره‌های تسویه و وضعیت قفل" icon={CalendarDays}>
        <div className="grid gap-3">
          {settlements.length > 0 ? settlements.map((settlement) => {
            const isLocked = settlement.status === "APPROVED" || settlement.status === "PAID";
            return (
              <Link key={settlement.id} href={`/dashboard/owner-settlements/${settlement.id}`} className={`grid gap-3 rounded-2xl border p-4 transition hover:border-[#c7a15a] lg:grid-cols-[1fr_10rem_12rem_12rem_8rem] lg:items-center ${isLocked ? "border-[#17483f]/18 bg-[#f1fbf5]/82" : "border-[#d8c08b]/58 bg-white/72"}`}>
                <div>
                  <p className="font-black text-[#111827]">{settlement.periodLabel}</p>
                  <p className="mt-1 text-xs font-bold text-[#7d6841]">{toPersianDigits(settlement.periodYear)} / {toPersianDigits(settlement.periodMonth)}</p>
                </div>
                <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getOwnerSettlementStatusStyle(settlement.status)}`}>{ownerSettlementStatusLabels[settlement.status]}</span>
                <span className="text-sm font-black text-[#17483f]">{formatIRR(settlement.finalOwnerPayable.toString())}</span>
                <span className="text-xs font-bold leading-6 text-[#6d5f49]">{isLocked ? `قفل‌شده از ${formatJalaliDateTime(settlement.approvedAt ?? settlement.paidAt)}` : "باز برای بازسازی پیش‌نویس"}</span>
                <span className="inline-flex items-center gap-1 text-xs font-black text-[#7d6841]">جزئیات <ArrowLeft size={14} /></span>
              </Link>
            );
          }) : (
            <p className="rounded-2xl border border-dashed border-[#d8c08b]/65 bg-white/65 p-4 text-sm font-bold leading-7 text-[#6d5f49]">هنوز تسویه‌ای ذخیره نشده است. اول گزارش ماهانه مالک را بسازید.</p>
          )}
        </div>
      </Panel>
    </section>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]"><Icon size={18} className="text-[#7d6841]" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, strong = false }: { icon: LucideIcon; label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#17483f]/22 bg-[#f1fbf5]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#7d6841]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-lg font-black text-[#111827]">{value}</p>
    </div>
  );
}

function Rule({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/58 bg-white/72 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
      <p className="font-black text-[#111827]">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
