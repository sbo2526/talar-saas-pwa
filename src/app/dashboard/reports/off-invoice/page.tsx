import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { reviewOffInvoiceReportAction } from "@/lib/actions/post-event-invoice-customer-actions";
import { requireTenantRole } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getOffInvoiceReportsForOwner, getPostEventInvoiceCustomerReviewCounts } from "@/lib/post-event-invoice-customer/data";
import {
  getOwnerReviewTone,
  postEventInvoiceOffInvoiceReportTypeLabels,
  postEventInvoiceOwnerReviewStatusLabels,
} from "@/lib/post-event-invoice-customer/options";
import { toNumber } from "@/lib/payments/display";

export default async function OffInvoiceReportsPage({ searchParams }: { searchParams: Promise<{ reviewed?: string; error?: string }> }) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const query = await searchParams;
  const [reports, counts] = await Promise.all([
    getOffInvoiceReportsForOwner({ tenantId: membership.tenantId }),
    getPostEventInvoiceCustomerReviewCounts({ tenantId: membership.tenantId }),
  ]);

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/reports" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          <ArrowRight size={15} />
          بازگشت به گزارش‌ها
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            <ShieldCheck size={15} />
            گزارش محرمانه پرداخت خارج از فاکتور
          </span>
          <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">فقط مالک / مدیریت</span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">کنترل پرداخت‌ها و خدمات خارج از صورتحساب</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
          این گزارش از پاسخ محرمانه مشتری بعد از صدور صورتحساب ساخته می‌شود. فقط گزارش‌های تأییدشده مالک، طبق سیاست مدل بهره‌برداری، می‌توانند در تسویه ماهانه مالک لحاظ شوند.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          <Summary label="لینک‌های در انتظار پاسخ" value={counts.waitingLinkCount} />
          <Summary label="پاسخ‌های ثبت‌شده" value={counts.submittedFeedbackCount} />
          <Summary label="گزارش پرداخت خارج از فاکتور" value={counts.offInvoiceReportCount} />
          <Summary label="مغایرت‌های مشتری" value={counts.mismatchCount} />
          <Summary label="نیازمند بررسی مالک" value={counts.ownerReviewRequiredCount} />
        </div>
      </div>

      {query.reviewed ? <Notice>وضعیت بررسی مالک ثبت شد. فقط گزارش‌های تأییدشده در محاسبه تسویه ماهانه مالک قابل لحاظ هستند.</Notice> : null}
      {query.error ? <Notice danger>درخواست بررسی معتبر نبود.</Notice> : null}

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center gap-2 text-[#111827]">
          <Eye size={20} />
          <h2 className="text-xl font-black">فهرست گزارش‌های محرمانه مشتریان</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {reports.length > 0 ? reports.map((report) => {
            const tone = getOwnerReviewTone(report.ownerReviewStatus);
            return (
              <article key={report.id} className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-4 text-[#111827]">
                <div className="grid gap-3 xl:grid-cols-[1.1fr_.8fr_.8fr_.8fr] xl:items-start">
                  <div>
                    <p className="text-sm font-black">{postEventInvoiceOffInvoiceReportTypeLabels[report.reportType]}</p>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">قرارداد {toPersianDigits(report.contract.contractNo)} · {report.contract.customer.fullName}</p>
                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">تاریخ مراسم: {formatJalaliDate(report.contract.eventDate)}</p>
                  </div>
                  <Info label="شماره صورتحساب" value={toPersianDigits(report.invoice.invoiceNumber)} />
                  <Info label="مبلغ گزارش‌شده" value={formatIRR(toNumber(report.amount))} />
                  <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-black ${tone === "success" ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : tone === "danger" ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]"}`}>
                    {postEventInvoiceOwnerReviewStatusLabels[report.ownerReviewStatus]}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <Info label="مورد" value={report.serviceTitle} />
                  <Info label="پرداخت به" value={[report.paidToName, report.paidToRole].filter(Boolean).join(" / ") || "—"} />
                  <Info label="روش پرداخت" value={report.paymentMethod ?? "—"} />
                  <Info label="وضعیت رسید" value={report.receiptFileUrl ? "دارای فایل رسید" : "فایل رسید ثبت نشده"} />
                  <Info label="وضعیت تسویه مالک" value={report.ownerMonthlySettlementEntries?.length ? (report.ownerMonthlySettlementEntries.some((entry) => entry.settlement.status === "LOCKED") ? "این گزارش در تسویه قفل‌شده لحاظ شده است." : "در تسویه ماهانه لحاظ شده است.") : "هنوز در تسویه لحاظ نشده است."} />
                  <Info label="زمان ثبت" value={formatJalaliDateTime(report.createdAt)} />
                  <Info label="توضیح مشتری" value={report.customerDescription ?? "—"} />
                </div>
                <form action={reviewOffInvoiceReportAction} className="mt-4 grid gap-3 rounded-2xl border border-[#d8c08b]/48 bg-white/64 p-3 md:grid-cols-[1fr_1.4fr_auto] md:items-end">
                  <input type="hidden" name="reportId" value={report.id} />
                  <label className="grid gap-1.5 text-xs font-black text-[#7d6841]">
                    <span>تصمیم مالک</span>
                    <select name="ownerReviewStatus" defaultValue={report.ownerReviewStatus} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]">
                      <option value="CONFIRMED_OFF_INVOICE">تأیید پرداخت خارج از فاکتور</option>
                      <option value="REJECTED">رد گزارش مشتری</option>
                      <option value="OWNER_REVIEW_REQUIRED">نیازمند بررسی بیشتر</option>
                      <option value="MARKED_AS_ALLOWED_SIDE_SERVICE">ثبت به عنوان خدمت جانبی مجاز</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-black text-[#7d6841]">
                    <span>یادداشت مالک</span>
                    <input name="ownerNote" defaultValue={report.ownerNote ?? ""} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]" />
                  </label>
                  <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]"><CheckCircle2 size={16} />ثبت بررسی</button>
                </form>
              </article>
            );
          }) : (
            <div className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-5 text-sm font-bold leading-7 text-[#6d5f49]">
              هنوز گزارش پرداخت خارج از فاکتور ثبت نشده است.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-[#b45353]/22 bg-[#fff1f1]/72 p-4 text-sm font-bold leading-7 text-[#8f2c2c]">
        <div className="flex items-center gap-2 font-black"><AlertTriangle size={18} />محدوده فاز ۳۱</div>
        <p className="mt-2">این گزارش فقط برای کنترل و بررسی مالک است. موارد تأییدشده در فاز ۳۲ می‌توانند طبق سیاست مدل بهره‌برداری وارد تسویه شوند، اما پرداخت مالک یا سند حسابداری ایجاد نمی‌کنند.</p>
      </section>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-4"><p className="text-xs font-black text-[#7d6841]">{label}</p><p className="mt-1 text-2xl font-black text-[#111827]">{toPersianDigits(value)}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-black text-[#7d6841]">{label}</p><p className="mt-1 text-sm font-black leading-7 text-[#111827]">{value}</p></div>;
}

function Notice({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  return <div className={`rounded-2xl border p-4 text-sm font-black leading-7 ${danger ? "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]" : "border-[#25a46d]/22 bg-[#25a46d]/9 text-[#17483f]"}`}>{children}</div>;
}
