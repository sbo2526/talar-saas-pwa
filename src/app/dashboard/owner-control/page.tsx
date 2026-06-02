import type React from "react";
import { AlertTriangle, ArrowLeft, BarChart3, CheckCircle2, FileText, Landmark, LockKeyhole, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getOwnerControlDashboardData, parseOwnerControlFilters } from "@/lib/owner-control/data";
import { ownerControlSeverityClasses, ownerControlSeverityLabels } from "@/lib/owner-control/options";

export default async function OwnerControlDashboardPage({ searchParams }: { searchParams: Promise<{ hallId?: string; agreementId?: string }> }) {
  const params = await searchParams;
  const data = await getOwnerControlDashboardData(parseOwnerControlFilters(params));

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><Landmark size={15} /> داشبورد کنترل مالک · فاز ۳۳</span>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-black leading-tight sm:text-4xl">داشبورد کنترل مالک</h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
              نمای مدیریتی برای کنترل جریان کامل مدل بهره‌برداری، تعیین تکلیف مراسم، صورتحساب بعد از مراسم، گزارش‌های خارج از فاکتور و تسویه ماهانه مالک. این بخش فروش‌پذیر است، نه یک دفترچه جادویی که با امید و دعا کار کند.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/dashboard/owner-control/reports" className="btn-luxury-dark"><BarChart3 size={16} /> گزارش‌های مالک</Link>
            <Link href="/dashboard/owner-control/health" className="btn-luxury-secondary"><ShieldCheck size={16} /> سلامت جریان مالی</Link>
            <Link href="/dashboard/owner-control/commercial-readiness" className="btn-luxury-primary"><CheckCircle2 size={16} /> آماده‌سازی تجاری</Link>
          </div>
        </div>
      </div>

      <form className="grid gap-3 rounded-[1.45rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_12px_42px_rgba(17,24,39,0.06)] sm:grid-cols-3 sm:rounded-[1.75rem] sm:p-5" action="/dashboard/owner-control">
        <label className="grid gap-2 text-sm font-black text-[#111827]">تالار
          <select name="hallId" defaultValue={data.filters.hallId ?? "all"} className="input-luxury">
            <option value="all">همه تالارها</option>
            {data.halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-[#111827]">توافق بهره‌برداری
          <select name="agreementId" defaultValue={data.filters.agreementId ?? "all"} className="input-luxury">
            <option value="all">همه توافق‌ها</option>
            {data.agreements.map((agreement) => <option key={agreement.id} value={agreement.id}>{agreement.agreementTitle || agreement.hall?.name || agreement.ownerName}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-luxury-dark w-full justify-center">اعمال فیلتر</button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <CounterCard title="مراسم‌های گذشته بدون تعیین تکلیف" value={data.counters.unresolvedPastEvents} href="/dashboard/post-event-decisions" />
        <CounterCard title="برگزارشده آماده صدور صورتحساب" value={data.counters.heldWithoutInvoice} href="/dashboard/post-event-invoices" />
        <CounterCard title="صورتحساب‌های پیش‌نویس بعد از مراسم" value={data.counters.draftInvoices} href="/dashboard/post-event-invoices" />
        <CounterCard title="صورتحساب‌های صادرشده" value={data.counters.issuedInvoices} href="/dashboard/post-event-invoices" />
        <CounterCard title="در انتظار پاسخ مشتری" value={data.counters.waitingCustomerResponse} href="/dashboard/post-event-invoices" />
        <CounterCard title="گزارش‌های پرداخت خارج از فاکتور" value={data.counters.offInvoiceReports} href="/dashboard/reports/off-invoice" />
        <CounterCard title="نیازمند بررسی مالک" value={data.counters.ownerReviewReports + data.counters.lateRescheduleReviews} href="/dashboard/owner-control/reports" />
        <CounterCard title="تسویه‌های ماهانه باز" value={data.counters.openSettlements} href="/dashboard/owner-settlements" />
        <CounterCard title="تسویه‌های دارای مانده" value={data.counters.payableSettlementCount} valueHint={formatIRR(data.counters.payableAmount)} href="/dashboard/owner-settlements" />
        <CounterCard title="تسویه‌های قفل‌شده" value={data.counters.lockedSettlements} href="/dashboard/owner-control/reports?report=financialLock" />
      </div>

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center gap-2 text-[#111827]"><AlertTriangle size={20} /><h2 className="text-xl font-black">هشدارها و اعلان‌های مدیریتی</h2></div>
        <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">این اعلان‌ها روی refresh داشبورد از داده واقعی ساخته می‌شوند و هیچ provider پیامک/تلگرام را تغییر نمی‌دهند.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.alerts.map((alert) => (
            <Link key={alert.key} href={alert.href} className={`rounded-[1.25rem] border p-4 transition hover:-translate-y-0.5 ${ownerControlSeverityClasses[alert.severity]}`}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm font-black">{alert.title}</p><p className="mt-1 text-xs font-bold leading-6 opacity-80">{alert.message}</p></div>
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-black">{formatPersianNumber(alert.count)}</span>
              </div>
              <p className="mt-3 text-[11px] font-black">{ownerControlSeverityLabels[alert.severity]}{alert.ownerOnly ? " · مالک/مدیریت" : ""}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <HelpCard icon={<FileText size={18} />} title="چرا تعیین تکلیف بعد از مراسم اجباری است؟" text="بدون ثبت برگزارشدن، کنسلی یا انتقال، صدور صورتحساب و تسویه مالک قابل اتکا نیست. این همان لحظه‌ای است که نرم‌افزار جلوی حافظه‌ی خلاق انسان را می‌گیرد." />
        <HelpCard icon={<WalletCards size={18} />} title="صورتحساب بعد از مراسم چگونه کار می‌کند؟" text="فقط قراردادهای برگزارشده صورتحساب می‌گیرند. مبلغ قرارداد snapshot می‌شود، نفرات اضافه و خدمات اضافه جدا ثبت می‌شوند و مشتری نمی‌تواند مبلغ را دستکاری کند." />
        <HelpCard icon={<LockKeyhole size={18} />} title="قفل مالی چه اثری دارد؟" text="وقتی تسویه ماهانه قفل شود، ردیف‌های لحاظ‌شده فقط قابل مشاهده و گزارش‌گیری هستند. اصلاحات آینده باید با سند اصلاحی انجام شود، نه با پاک‌کردن تاریخ." />
      </section>
    </section>
  );
}

function CounterCard({ title, value, valueHint, href }: { title: string; value: number; valueHint?: string; href: string }) {
  return (
    <Link href={href} className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/82 p-4 text-[#111827] shadow-[0_12px_34px_rgba(17,24,39,0.06)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/65">
      <p className="text-xs font-black leading-5 text-[#7d6841]">{title}</p>
      <p className="mt-2 text-2xl font-black text-[#111827]">{formatPersianNumber(value)}</p>
      {valueHint ? <p className="mt-1 text-xs font-black text-[#17483f]">{valueHint}</p> : null}
      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-black text-[#9f7131]">مشاهده <ArrowLeft size={13} /></span>
    </Link>
  );
}

function HelpCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <details className="group rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827]"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black">{icon}{title}</summary><p className="mt-3 text-xs font-bold leading-7 text-[#6d5f49]">{text}</p></details>;
}
