import type React from "react";
import { ArrowRight, Download, FileText, LockKeyhole, ReceiptText, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getOwnerControlReportsData, parseOwnerControlFilters } from "@/lib/owner-control/data";
import {
  feedbackCommercialLabels,
  offInvoiceReportTypeCommercialLabels,
  operationModelCommercialLabels,
  ownerReportTypeLabels,
  ownerReviewCommercialLabels,
  postEventDecisionCommercialLabels,
  settlementEntryReviewCommercialLabels,
  settlementEntryTypeCommercialLabels,
  settlementStatusCommercialLabels,
} from "@/lib/owner-control/options";
import { toNumber } from "@/lib/owner-settlements/rules";

export default async function OwnerControlReportsPage({ searchParams }: { searchParams: Promise<{ report?: string; year?: string; month?: string; hallId?: string; agreementId?: string; status?: string; q?: string }> }) {
  const params = await searchParams;
  const filters = parseOwnerControlFilters(params);
  const data = await getOwnerControlReportsData(filters);
  const reportQuery = new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value)) as [string, string][]).toString();
  const exportHref = `/api/dashboard/owner-control/reports/export${reportQuery ? `?${reportQuery}` : ""}`;

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/owner-control" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]"><ArrowRight size={15} /> بازگشت به داشبورد کنترل مالک</Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-2xl font-black sm:text-4xl">گزارش‌های کنترل مالک</h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">گزارش‌های حرفه‌ای سهم مالک، تسویه ماهانه، صورتحساب‌های بعد از مراسم، پرداخت‌های خارج از فاکتور، کنسلی‌ها و قفل‌های مالی.</p>
          </div>
          <Link href={exportHref} className="btn-luxury-dark"><Download size={16} /> خروجی CSV سبک</Link>
        </div>
      </div>

      <form className="grid gap-3 rounded-[1.45rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_12px_42px_rgba(17,24,39,0.06)] sm:grid-cols-2 xl:grid-cols-7" action="/dashboard/owner-control/reports">
        <Select name="report" label="نوع گزارش" defaultValue={params.report ?? "all"}>
          <option value="all">همه گزارش‌ها</option>
          {Object.entries(ownerReportTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <Input name="year" label="سال" defaultValue={params.year ?? ""} />
        <Input name="month" label="ماه" defaultValue={params.month ?? ""} />
        <Select name="hallId" label="تالار" defaultValue={data.filters.hallId ?? "all"}>
          <option value="all">همه</option>
          {data.halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
        </Select>
        <Select name="agreementId" label="توافق" defaultValue={data.filters.agreementId ?? "all"}>
          <option value="all">همه</option>
          {data.agreements.map((agreement) => <option key={agreement.id} value={agreement.id}>{agreement.agreementTitle || agreement.hall?.name || agreement.ownerName}</option>)}
        </Select>
        <Input name="q" label="مشتری / قرارداد" defaultValue={params.q ?? ""} />
        <div className="flex items-end"><button type="submit" className="btn-luxury-primary w-full justify-center">اعمال</button></div>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportPanel title="گزارش سهم مالک" icon={<WalletCards size={18} />} show={shouldShow(params.report, "ownerShare")}>
          <RowsHeader labels={["ماه", "مدل", "پایه مراسم", "سهم مالک", "حداقل/اجاره", "مانده"]} />
          {data.ownerShareRows.map((row) => <div key={row.id} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-6">
            <Cell>{toPersianDigits(`${row.settlementYear}/${row.settlementMonth}`)}</Cell>
            <Cell>{operationModelCommercialLabels[row.operationModelSnapshot]}</Cell>
            <Cell>{formatIRR(toNumber(row.eventInvoiceBaseAmount))}</Cell>
            <Cell>{formatIRR(toNumber(row.calculatedOwnerShareAmount))}</Cell>
            <Cell>{formatIRR(toNumber(row.guaranteeShortfallAmount) + toNumber(row.fixedRentAmount))}</Cell>
            <Cell>{formatIRR(toNumber(row.remainingPayableAmount))}</Cell>
          </div>)}
        </ReportPanel>

        <ReportPanel title="گزارش تسویه ماهانه مالک" icon={<WalletCards size={18} />} show={shouldShow(params.report, "monthlySettlement")}>
          <RowsHeader labels={["ماه", "مدل", "قابل پرداخت", "پرداخت‌شده", "مانده", "وضعیت"]} />
          {data.ownerShareRows.map((row) => <Link key={row.id} href={`/dashboard/owner-settlements/${row.id}`} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-6">
            <Cell>{toPersianDigits(`${row.settlementYear}/${row.settlementMonth}`)}</Cell>
            <Cell>{operationModelCommercialLabels[row.operationModelSnapshot]}</Cell>
            <Cell>{formatIRR(toNumber(row.finalPayableToOwnerAmount))}</Cell>
            <Cell>{formatIRR(toNumber(row.paidToOwnerAmount))}</Cell>
            <Cell>{formatIRR(toNumber(row.remainingPayableAmount))}</Cell>
            <Cell>{settlementStatusCommercialLabels[row.status]}{row.lockedAt ? " · قفل‌شده" : ""}</Cell>
          </Link>)}
        </ReportPanel>
      </div>

      <ReportPanel title="گزارش صورتحساب‌های بعد از مراسم" icon={<ReceiptText size={18} />} show={shouldShow(params.report, "postEventInvoice")}>
        <RowsHeader labels={["صورتحساب", "قرارداد", "مشتری", "تاریخ مراسم", "جمع", "مانده", "پاسخ مشتری", "تسویه"]} />
        {data.invoices.map((invoice) => {
          const feedback = invoice.customerFeedbacks[0];
          const settlementEntry = invoice.ownerMonthlySettlementEntries[0];
          return <Link key={invoice.id} href={`/dashboard/post-event-invoices/${invoice.id}`} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-8">
            <Cell>{invoice.invoiceNumber}</Cell>
            <Cell>{invoice.contract.contractNo}</Cell>
            <Cell>{invoice.contract.customer.fullName}</Cell>
            <Cell>{formatJalaliDate(invoice.contract.eventDate)}</Cell>
            <Cell>{formatIRR(toNumber(invoice.invoiceTotalAmount))}</Cell>
            <Cell>{formatIRR(toNumber(invoice.finalBalanceAmount))}</Cell>
            <Cell>{feedback ? feedbackCommercialLabels[feedback.feedbackStatus] : "در انتظار مشاهده مشتری"}</Cell>
            <Cell>{settlementEntry ? `${toPersianDigits(`${settlementEntry.settlement.settlementYear}/${settlementEntry.settlement.settlementMonth}`)} · ${settlementStatusCommercialLabels[settlementEntry.settlement.status]}` : "لحاظ نشده"}</Cell>
          </Link>;
        })}
      </ReportPanel>

      <ReportPanel title="گزارش پرداخت‌های خارج از صورتحساب" icon={<ShieldCheck size={18} />} show={shouldShow(params.report, "offInvoice")}>
        <RowsHeader labels={["قرارداد", "صورتحساب", "مشتری", "نوع", "مبلغ", "پرداخت به", "وضعیت مالک", "تسویه"]} />
        {data.offInvoiceReports.map((report) => {
          const marker = report.ownerMonthlySettlementEntries[0];
          return <div key={report.id} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-8">
            <Cell>{report.contract.contractNo}</Cell>
            <Cell>{report.invoice.invoiceNumber}</Cell>
            <Cell>{report.contract.customer.fullName}</Cell>
            <Cell>{offInvoiceReportTypeCommercialLabels[report.reportType]}</Cell>
            <Cell>{formatIRR(toNumber(report.amount))}</Cell>
            <Cell>{report.paidToName || "—"}</Cell>
            <Cell>{ownerReviewCommercialLabels[report.ownerReviewStatus]}</Cell>
            <Cell>{marker ? `${toPersianDigits(`${marker.settlement.settlementYear}/${marker.settlement.settlementMonth}`)} · ${settlementStatusCommercialLabels[marker.settlement.status]}` : "لحاظ نشده"}</Cell>
          </div>;
        })}
      </ReportPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportPanel title="گزارش کنسلی‌ها و انتقال‌های دیرهنگام" icon={<FileText size={18} />} show={shouldShow(params.report, "cancellationLate")}>
          <RowsHeader labels={["قرارداد", "مشتری", "تاریخ مراسم", "وضعیت", "دیرهنگام", "بررسی مالک"]} />
          {data.cancellationAndLateRows.map((row) => <div key={row.id} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-6">
            <Cell>{row.contract.contractNo}</Cell>
            <Cell>{row.contract.customer.fullName}</Cell>
            <Cell>{formatJalaliDate(row.contract.eventDate)}</Cell>
            <Cell>{postEventDecisionCommercialLabels[row.decisionStatus]}</Cell>
            <Cell>{row.isLateReschedule ? "بله" : "خیر"}</Cell>
            <Cell>{row.requiresOwnerReview ? "نیازمند بررسی" : "—"}</Cell>
          </div>)}
        </ReportPanel>

        <ReportPanel title="گزارش قفل‌های مالی" icon={<LockKeyhole size={18} />} show={shouldShow(params.report, "financialLock")}>
          <RowsHeader labels={["ماه", "منبع قفل‌شده", "نوع", "وضعیت", "تاریخ قفل"]} />
          {data.lockEntries.map((entry) => <Link key={entry.id} href={`/dashboard/owner-settlements/${entry.settlement.id}`} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 transition hover:-translate-y-0.5 xl:grid-cols-5">
            <Cell>{toPersianDigits(`${entry.settlement.settlementYear}/${entry.settlement.settlementMonth}`)}</Cell>
            <Cell>{entry.invoice?.invoiceNumber || entry.offInvoiceReport?.serviceTitle || entry.contract?.contractNo || entry.sourceTitle}</Cell>
            <Cell>{settlementEntryTypeCommercialLabels[entry.entryType]}</Cell>
            <Cell>{settlementEntryReviewCommercialLabels[entry.reviewStatus]}</Cell>
            <Cell>{formatJalaliDate(entry.settlement.lockedAt)}</Cell>
          </Link>)}
        </ReportPanel>
      </div>
    </section>
  );
}

function shouldShow(selected: string | undefined, key: string) {
  return !selected || selected === "all" || selected === key;
}

function ReportPanel({ title, icon, show, children }: { title: string; icon: React.ReactNode; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"><h2 className="flex items-center gap-2 text-xl font-black text-[#111827]">{icon}{title}</h2><div className="mt-4 grid gap-2">{children}</div></section>;
}

function RowsHeader({ labels }: { labels: string[] }) {
  return <div className="hidden rounded-2xl border border-[#d8c08b]/46 bg-[#172033] px-3 py-2 text-xs font-black text-[#fff8ea] xl:grid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>{labels.map((label) => <span key={label}>{label}</span>)}</div>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-bold leading-6 text-[#111827]">{children}</span>;
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-black text-[#111827]">{label}<select name={name} defaultValue={defaultValue} className="input-luxury">{children}</select></label>;
}

function Input({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return <label className="grid gap-2 text-sm font-black text-[#111827]">{label}<input name={name} defaultValue={defaultValue} className="input-luxury" /></label>;
}
