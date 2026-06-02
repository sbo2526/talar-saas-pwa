import type { ReactNode } from "react";
import {
  ArrowLeft,
  Banknote,
  BarChart3,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  LineChart,
  PieChart,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import {
  getPaymentStatus,
  getPaymentStatusStyle,
  paymentStatusLabels,
  toNumber,
} from "@/lib/contracts/display";
import {
  formatJalaliDate,
  formatJalaliWeekday,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  getPaymentRecordStatusLabel,
  getPaymentRecordStatusStyle,
  getPaymentTypeLabel,
  getPaymentTypeStyle,
} from "@/lib/payments/display";
import {
  getContractPaidAmount,
  getContractRemaining,
  getReportFilters,
  getReportsData,
  type ReportsData,
} from "@/lib/reports/analytics";
import {
  reportPeriodLabels,
  reportPeriodValues,
  reportTypeLabels,
  reportTypeValues,
} from "@/lib/reports/date-ranges";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { ScheduledReportActionButton } from "@/components/dashboard/settings/scheduled-report-actions";

type ReportsPageProps = {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    reportType?: string;
    hallId?: string;
    salonId?: string;
    eventType?: string;
    paymentMethodId?: string;
    categoryId?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const filters = getReportFilters(params);
  const data = await getReportsData(membership.tenantId, filters);
  const reportQuery = buildReportsQuery(params);
  const csvHref = `/api/dashboard/reports/export${reportQuery}`;
  const selectedFiltersLabel = getSelectedFiltersLabel(data);

  return (
    <section className="space-y-3">
      <PageHeader
        tenantName={membership.tenant.name}
        periodLabel={data.filters.range.label}
        csvHref={csvHref}
      />

      <MainKpiStrip data={data} />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.86fr]">
        <FinancialHealthPanel data={data} />
        <PaymentSummary data={data} />
      </div>

      <ScheduledReportsIntegrationCard />

      <ReportFilters data={data} selectedFiltersLabel={selectedFiltersLabel} />

      <details className="group rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/94 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.55rem]">
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#fff8ea]"><BarChart3 size={16} /></span>
            <div className="min-w-0">
              <h2 className="text-base font-black text-[#172033]">گزارش‌های تکمیلی و تحلیل جزئی</h2>
              <p className="mt-0.5 text-xs font-bold leading-5 text-[#7d6841]">قراردادها، مانده‌ها، مراسم‌ها، هزینه‌ها، نمودارها و خروجی‌ها در لایه دوم صفحه قرار گرفته‌اند.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="rounded-full border border-[#d8c08b]/70 bg-white/65 px-3 py-1 text-[11px] font-black text-[#17483f]">نمایش جزئیات بیشتر</span>
            <ChevronDown className="text-[#9f7131] transition group-open:rotate-180" size={18} />
          </div>
        </summary>
        <div className="space-y-3 border-t border-[#d8c08b]/55 p-3.5 sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
            <ContractPerformance data={data} />
            <OutstandingBalances data={data} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
            <UpcomingEvents data={data} />
            <ExpensesProfit data={data} />
          </div>

          <VisualAnalytics data={data} />

          <div className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
            <ExportSection csvHref={csvHref} />
            <LatestFinancialMovements data={data} />
          </div>
        </div>
      </details>
    </section>
  );
}

function PageHeader({ tenantName, periodLabel, csvHref }: { tenantName: string; periodLabel: string; csvHref: string }) {
  return (
    <div className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/62 bg-[radial-gradient(circle_at_8%_0%,rgba(199,161,90,0.13),transparent_14rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.95))] p-3.5 text-[#111827] shadow-[0_12px_40px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-[#7d6841]">
            <span className="inline-flex min-h-7 items-center rounded-full border border-[#c7a15a]/36 bg-[#fff4d8] px-2.5">داشبورد مدیریتی</span>
            <span className="inline-flex min-h-7 items-center rounded-full border border-[#d8c08b]/55 bg-white/55 px-2.5">{tenantName}</span>
            <span className="inline-flex min-h-7 items-center rounded-full border border-[#25a46d]/18 bg-[#25a46d]/10 px-2.5 text-[#17483f]">دوره گزارش: {periodLabel}</span>
            <span className="inline-flex min-h-7 items-center rounded-full border border-[#d8c08b]/55 bg-white/55 px-2.5">{formatJalaliDate(new Date())}</span>
          </div>
          <div>
            <h1 className="text-[1.55rem] font-black tracking-[-0.035em] text-[#101826] sm:text-3xl">گزارش‌ها و تحلیل مالی</h1>
            <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-[#6d5f49]">
              نمای خلاصه و مدیریتی برای فهم سریع دریافت‌ها، مانده‌ها، هزینه‌ها و اقدام‌های ضروری. جزئیات سنگین در لایه‌های پایین‌تر قرار گرفته‌اند.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:max-w-[34rem] xl:justify-end">
          <Link href="/dashboard/payments/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 py-2 text-xs font-black text-white shadow-[0_12px_28px_rgba(23,72,63,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0f372f]">
            <Plus size={15} />
            ثبت دریافت
          </Link>
          <Link href={csvHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#172033]/12 bg-[#172033] px-4 py-2 text-xs font-black text-[#fff8ea] shadow-[0_12px_26px_rgba(17,32,51,0.14)] transition hover:-translate-y-0.5">
            <FileText size={15} />
            خروجی CSV
          </Link>
          <Link href="/dashboard/contracts" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/50 bg-[#fff4d8] px-4 py-2 text-xs font-black text-[#4a3514] shadow-[0_10px_22px_rgba(199,161,90,0.12)] transition hover:-translate-y-0.5 hover:bg-[#f7e2ad]">
            <ClipboardList size={15} />
            مشاهده قراردادها
          </Link>
          <span className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/70 bg-[#f4efe2]/82 px-3.5 py-2 text-xs font-black text-[#7d6841] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]" aria-disabled="true">
            <FileDown size={15} />
            PDF / Excel / پرینت · به‌زودی
          </span>
        </div>
      </div>
    </div>
  );
}

function ReportFilters({ data, selectedFiltersLabel }: { data: ReportsData; selectedFiltersLabel: string }) {
  const filters = data.filters;

  return (
    <details className="group rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/94 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.55rem]">
      <summary className="flex cursor-pointer list-none flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#fff8ea]"><Filter size={15} /></span>
          <div className="min-w-0">
            <h2 className="text-base font-black">فیلتر گزارش‌ها</h2>
            <p className="mt-0.5 text-xs font-bold leading-5 text-[#7d6841]">{selectedFiltersLabel}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <span className="rounded-full border border-[#d8c08b]/70 bg-white/60 px-3 py-1 text-[11px] font-black text-[#17483f]">فیلترهای بیشتر</span>
          <ChevronDown className="text-[#9f7131] transition group-open:rotate-180" size={18} />
        </div>
      </summary>
      <form className="grid gap-2.5 border-t border-[#d8c08b]/55 p-3.5 sm:p-4 lg:grid-cols-6" action="/dashboard/reports">
        <SelectField name="period" label="بازه زمانی" defaultValue={filters.range.period}>
          {reportPeriodValues.map((period) => (
            <option key={period} value={period}>{reportPeriodLabels[period]}</option>
          ))}
        </SelectField>
        <JalaliDatePicker name="from" label="از تاریخ" defaultValue={filters.from ?? filters.range.fromValue} className="lg:col-span-1" />
        <JalaliDatePicker name="to" label="تا تاریخ" defaultValue={filters.to ?? filters.range.toValue} className="lg:col-span-1" />
        <SelectField name="reportType" label="نوع گزارش" defaultValue={filters.reportType}>
          {reportTypeValues.map((type) => (
            <option key={type} value={type}>{reportTypeLabels[type]}</option>
          ))}
        </SelectField>
        <SelectField name="hallId" label="تالار" defaultValue={filters.hallId ?? "all"}>
          <option value="all">همه تالارها</option>
          {data.options.halls.map((hall) => <option key={hall.id} value={hall.id}>{hall.label}</option>)}
        </SelectField>
        <SelectField name="salonId" label="سالن" defaultValue={filters.salonId ?? "all"}>
          <option value="all">همه سالن‌ها</option>
          {data.options.salons.map((salon) => <option key={salon.id} value={salon.id}>{salon.label}</option>)}
        </SelectField>
        <SelectField name="eventType" label="نوع مراسم" defaultValue={filters.eventType ?? "all"}>
          <option value="all">همه مراسم‌ها</option>
          {data.options.eventTypes.map((eventType) => <option key={eventType.id} value={eventType.id}>{eventType.label}</option>)}
        </SelectField>
        <SelectField name="paymentMethodId" label="روش دریافت" defaultValue={filters.paymentMethodId ?? "all"}>
          <option value="all">همه روش‌ها</option>
          {data.options.paymentMethods.map((method) => <option key={method.id} value={method.id}>{method.label}</option>)}
        </SelectField>
        <SelectField name="categoryId" label="دسته‌بندی مالی" defaultValue={filters.categoryId ?? "all"}>
          <option value="all">همه دسته‌ها</option>
          {data.options.financialCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
        </SelectField>
        <div className="flex items-end gap-2 lg:col-span-3 xl:col-span-2">
          <button className="btn-luxury-dark min-h-10 flex-1 px-4 text-xs" type="submit">
            <Search size={17} />
            اعمال فیلتر
          </button>
          <Link href="/dashboard/reports" className="btn-luxury-secondary min-h-10 flex-1 border-[#172033]/10 bg-white/55 px-4 text-xs text-[#172033] hover:bg-white">
            <RotateCcw size={17} />
            حذف فیلترها
          </Link>
        </div>
      </form>
    </details>
  );
}

function MainKpiStrip({ data }: { data: ReportsData }) {
  const followUpContracts = data.outstandingContracts.length;
  const activeContractsLabel = `${formatPersianNumber(data.kpis.contractsCount)} قرارداد`;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="مبلغ کل قراردادها" value={formatIRR(data.kpis.contractsTotal)} icon={CircleDollarSign} tone="navy" />
        <KpiCard label="مجموع دریافت‌شده" value={formatIRR(data.kpis.receivedTotal)} icon={WalletCards} tone="success" />
        <KpiCard label="مانده قابل دریافت" value={formatIRR(data.kpis.outstandingTotal)} icon={ReceiptText} tone={data.kpis.outstandingTotal > 0 ? "warning" : "success"} />
        <KpiCard label="مجموع هزینه‌ها" value={formatIRR(data.kpis.expensesTotal)} icon={Banknote} tone="danger" />
        <KpiCard label="سود تقریبی" value={formatIRR(data.kpis.estimatedProfit)} icon={TrendingUp} tone={data.kpis.estimatedProfit >= 0 ? "success" : "danger"} />
        <KpiCard label="قراردادهای فعال" value={activeContractsLabel} icon={ClipboardList} tone="neutral" />
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <InsightChip icon={CalendarClock} label="مراسم‌های پیش‌رو" value={`${formatPersianNumber(data.kpis.upcomingEventsCount)} مراسم`} href="/dashboard/calendar" />
        <InsightChip icon={CheckCircle2} label="قراردادهای تسویه‌شده" value={`${formatPersianNumber(data.kpis.settledContractsCount)} قرارداد`} href="/dashboard/contracts" />
        <InsightChip icon={ReceiptText} label="نیازمند پیگیری" value={`${formatPersianNumber(followUpContracts)} قرارداد`} href="/dashboard/payments/new" tone={followUpContracts > 0 ? "warning" : "success"} />
      </div>
    </div>
  );
}

function FinancialHealthPanel({ data }: { data: ReportsData }) {
  const receivedRatio = ratio(data.kpis.receivedTotal, data.kpis.contractsTotal);
  const outstandingRatio = ratio(data.kpis.outstandingTotal, Math.max(data.kpis.contractsTotal, data.kpis.outstandingTotal));
  const expenseRatio = ratio(data.kpis.expensesTotal, data.kpis.receivedTotal);
  const profitRatio = ratio(Math.max(data.kpis.estimatedProfit, 0), Math.max(data.kpis.receivedTotal, data.kpis.contractsTotal));

  return (
    <ReportCard
      title="سلامت مالی بازه"
      icon={TrendingUp}
      action={<span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1 text-[11px] font-black text-[#17483f]">نمای سریع مدیریتی</span>}
      compact
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <ProgressMetric label="دریافت‌شده از قراردادها" value={receivedRatio} tone="success" />
        <ProgressMetric label="مانده قابل دریافت" value={outstandingRatio} tone={data.kpis.outstandingTotal > 0 ? "warning" : "success"} />
        <ProgressMetric label="هزینه‌ها نسبت به دریافت" value={expenseRatio} tone={expenseRatio > 65 ? "danger" : "neutral"} />
        <ProgressMetric label="حاشیه سود تقریبی" value={profitRatio} tone={data.kpis.estimatedProfit >= 0 ? "success" : "danger"} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <ActionHint title="اولویت امروز" value={data.kpis.outstandingTotal > 0 ? "پیگیری مانده‌ها" : "وضعیت دریافت مناسب"} tone={data.kpis.outstandingTotal > 0 ? "warning" : "success"} />
        <ActionHint title="وضعیت هزینه" value={data.kpis.expensesTotal > 0 ? formatIRR(data.kpis.expensesTotal) : "هزینه‌ای ثبت نشده"} />
        <ActionHint title="سود تقریبی" value={formatIRR(data.kpis.estimatedProfit)} tone={data.kpis.estimatedProfit >= 0 ? "success" : "danger"} />
      </div>
    </ReportCard>
  );
}

function PaymentSummary({ data }: { data: ReportsData }) {
  const summary = data.paymentSummary;

  return (
    <ReportCard title="گزارش دریافت‌ها" icon={WalletCards} action={<Link href="/dashboard/payments/new" className="chip-action"><Plus size={14} /> ثبت دریافت</Link>} compact>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniMetric label="دریافت امروز" value={formatIRR(summary.todayReceived)} />
        <MiniMetric label="دریافت این ماه" value={formatIRR(summary.monthReceived)} />
        <MiniMetric label="کارت‌خوان" value={formatIRR(summary.cardReceived)} />
        <MiniMetric label="نقدی" value={formatIRR(summary.cashReceived)} />
        <MiniMetric label="حواله / کارت‌به‌کارت" value={formatIRR(summary.transferReceived)} />
        <MiniMetric label="چک‌ها" value={formatIRR(summary.chequeReceived)} />
        <MiniMetric label="در انتظار تأیید" value={`${formatPersianNumber(summary.pendingCount)} دریافت`} tone={summary.pendingCount > 0 ? "warning" : "success"} />
        <MiniMetric label="میانگین دریافت" value={formatIRR(summary.latestPayments.length ? Math.round(data.kpis.receivedTotal / Math.max(summary.latestPayments.length, 1)) : 0)} />
      </div>
      <div className="mt-3 rounded-2xl border border-[#d8c08b]/55 bg-white/58 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <SectionMiniHeader title="آخرین دریافت ثبت‌شده" />
          <Link href="/dashboard/payments" className="text-xs font-black text-[#17483f]">همه دریافت‌ها</Link>
        </div>
        {summary.latestPayments[0] ? (
          <PaymentRow payment={summary.latestPayments[0]} compact />
        ) : <CompactEmpty title="هنوز دریافتی در این بازه ثبت نشده است." href="/dashboard/payments/new" action="ثبت دریافت" />}
      </div>
    </ReportCard>
  );
}

function ContractPerformance({ data }: { data: ReportsData }) {
  const performance = data.contractPerformance;
  const mostCommonEventType = performance.byEventType[0];

  return (
    <ReportCard title="گزارش قراردادها" icon={ClipboardList} action={<Link href="/dashboard/contracts" className="inline-flex min-h-9 items-center justify-center rounded-full border border-[#c7a15a]/55 bg-[#fff4d8] px-3 py-1.5 text-xs font-black text-[#4a3514] hover:bg-[#f7e2ad]">مشاهده قراردادها</Link>}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniMetric label="قراردادها در بازه" value={formatPersianNumber(data.kpis.contractsCount)} />
        <MiniMetric label="میانگین مبلغ" value={formatIRR(performance.averageAmount)} />
        <MiniMetric label="بیشترین مبلغ" value={formatIRR(performance.maxAmount)} />
        <MiniMetric label="رایج‌ترین مراسم" value={mostCommonEventType?.label ?? "ثبت نشده"} />
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3">
          <SectionMiniHeader title="توزیع وضعیت قراردادها" />
          <div className="mt-3 space-y-2.5">
            {performance.statusCounts.map((item) => (
              <BarRow key={item.status} label={item.label} value={item.count} max={Math.max(...performance.statusCounts.map((row) => row.count), 1)} suffix="قرارداد" tone={item.status === "CANCELED" ? "danger" : item.status === "CONFIRMED" || item.status === "COMPLETED" ? "success" : "neutral"} />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3">
          <SectionMiniHeader title="درآمد بر اساس نوع مراسم" />
          <div className="mt-3 space-y-2.5">
            {performance.byEventType.length ? performance.byEventType.slice(0, 5).map((item) => (
              <BarRow key={item.label} label={item.label} value={item.total} max={Math.max(...performance.byEventType.map((row) => row.total), 1)} formatter={formatIRR} tone="success" />
            )) : <p className="text-xs font-bold text-[#7d6841]">هنوز نوع مراسمی برای گزارش ثبت نشده است.</p>}
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#d8c08b]/55 bg-[#fff4d8]/55 p-3">
        <p className="text-xs font-black text-[#7d6841]">نزدیک‌ترین مراسم</p>
        {performance.nearestEvent ? (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-black text-[#172033]">{performance.nearestEvent.customer.fullName} · {performance.nearestEvent.eventTypeName ?? "مراسم"}</p>
            <p className="text-sm font-black text-[#17483f]">{formatJalaliWeekday(performance.nearestEvent.eventDate)}، {formatJalaliDate(performance.nearestEvent.eventDate)}</p>
          </div>
        ) : <p className="mt-2 text-sm font-bold text-[#7d6841]">مراسم پیش‌رویی ثبت نشده است.</p>}
      </div>
    </ReportCard>
  );
}

function OutstandingBalances({ data }: { data: ReportsData }) {
  return (
    <ReportCard title="مانده‌های قابل پیگیری" icon={ReceiptText} action={<Link href="/dashboard/payments/new" className="chip-action"><Plus size={14} /> ثبت دریافت</Link>}>
      {data.outstandingContracts.length ? (
        <div className="space-y-2.5">
          {data.outstandingContracts.slice(0, 6).map((contract) => {
            const paidAmount = getContractPaidAmount(contract);
            const remaining = getContractRemaining(contract);
            const lastPayment = [...contract.payments].sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())[0];
            return (
              <div key={contract.id} className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-white/65 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#172033]">{contract.customer.fullName}</p>
                    <p className="mt-1 text-xs font-bold text-[#7d6841]">قرارداد {toPersianDigits(contract.contractNo)} · {formatJalaliDate(contract.eventDate)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="rounded-full border border-[#b45353]/20 bg-[#fff1f1] px-2.5 py-1 text-[11px] font-black text-[#8f2c2c]">مانده: {formatIRR(remaining)}</span>
                    <Link href={`/dashboard/payments/new?contractId=${contract.id}`} className="btn-luxury-dark min-h-9 px-3 text-xs">ثبت دریافت</Link>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="مبلغ نهایی" value={formatIRR(toNumber(contract.finalTotal))} dense />
                  <MiniMetric label="دریافت‌شده" value={formatIRR(paidAmount)} dense tone="success" />
                  <MiniMetric label="آخرین دریافت" value={lastPayment ? formatJalaliDate(lastPayment.paidAt) : "ثبت نشده"} dense />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <PositiveState title="همه قراردادهای این بازه تسویه شده‌اند." href="/dashboard/contracts" action="مشاهده قراردادها" />
      )}
    </ReportCard>
  );
}

function UpcomingEvents({ data }: { data: ReportsData }) {
  return (
    <ReportCard title="مراسم‌های پیش‌رو" icon={CalendarClock} action={<Link href="/dashboard/calendar" className="chip-action">مشاهده تقویم رزرو</Link>} compact>
      <div className="space-y-2">
        {data.upcomingEvents.length ? data.upcomingEvents.slice(0, 5).map((contract) => {
          const paidAmount = getContractPaidAmount(contract);
          const remaining = getContractRemaining(contract);
          const paymentStatus = getPaymentStatus(contract.finalTotal, paidAmount);
          return (
            <div key={contract.id} className="rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#172033]">{contract.customer.fullName} · {contract.eventTypeName ?? "مراسم"}</p>
                  <p className="mt-1 text-xs font-bold text-[#7d6841]">{formatJalaliWeekday(contract.eventDate)}، {formatJalaliDate(contract.eventDate)} · {contract.hall?.name ?? "تالار ثبت نشده"}{contract.salon?.name ? ` / ${contract.salon.name}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="rounded-full border border-[#d8c08b]/70 bg-[#fff4d8] px-2.5 py-1 text-[11px] font-black text-[#7d6841]">{formatPersianNumber(contract.guestCount)} مهمان</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentStatusStyle(paymentStatus)}`}>{paymentStatusLabels[paymentStatus]}</span>
                  <span className="text-xs font-black text-[#8f2c2c]">مانده: {formatIRR(remaining)}</span>
                </div>
              </div>
            </div>
          );
        }) : <CompactEmpty title="مراسم پیش‌رویی در این بازه ثبت نشده است." href="/dashboard/calendar" action="مشاهده تقویم رزرو" />}
      </div>
    </ReportCard>
  );
}

function ExpensesProfit({ data }: { data: ReportsData }) {
  return (
    <ReportCard title="هزینه‌ها و سود تقریبی" icon={Coins} action={<Link href="/dashboard/expenses/new" className="chip-action">ثبت هزینه</Link>} compact>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <MiniMetric label="مجموع هزینه‌ها" value={formatIRR(data.expenses.total)} />
        <MiniMetric label="هزینه‌های ماه جاری" value={formatIRR(data.expenses.currentMonthTotal)} />
        <MiniMetric label="سود تقریبی" value={formatIRR(data.kpis.estimatedProfit)} tone={data.kpis.estimatedProfit >= 0 ? "success" : "danger"} />
        <MiniMetric label="بیشترین دسته هزینه" value={data.expenses.topCategory?.label ?? "ثبت نشده"} />
      </div>
      <p className="mt-3 text-[11px] font-bold leading-5 text-[#7d6841]">سود تقریبی بر اساس دریافت‌ها و هزینه‌های ثبت‌شده محاسبه می‌شود.</p>
      <div className="mt-4 rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3">
        <SectionMiniHeader title="هزینه بر اساس دسته‌بندی" />
        <div className="mt-3 space-y-2.5">
          {data.expenses.byCategory.length ? data.expenses.byCategory.slice(0, 5).map((category) => (
            <BarRow key={category.id} label={category.label} value={category.amount} max={Math.max(...data.expenses.byCategory.map((row) => row.amount), 1)} formatter={formatIRR} tone="danger" />
          )) : <CompactEmpty title="هنوز هزینه‌ای ثبت نشده است." href="/dashboard/expenses/new" action="ثبت هزینه جدید" />}
        </div>
      </div>
    </ReportCard>
  );
}

function VisualAnalytics({ data }: { data: ReportsData }) {
  return (
    <ReportCard title="تحلیل تصویری" icon={BarChart3} compact>
      <div className="grid gap-3 xl:grid-cols-4">
        <ChartPanel title="روند دریافت‌ها در ماه‌های شمسی" icon={LineChart}>
          <ChartBars data={data.charts.paymentsByMonth} empty="هنوز دریافتی برای نمایش روند ثبت نشده است." tone="success" />
        </ChartPanel>
        <ChartPanel title="قراردادها بر اساس وضعیت" icon={PieChart}>
          <ChartBars data={data.charts.statusDistribution.map((item) => ({ label: item.label, amount: item.value }))} empty="هنوز قراردادی ثبت نشده است." suffix="قرارداد" tone="neutral" />
        </ChartPanel>
        <ChartPanel title="درآمد بر اساس نوع مراسم" icon={TrendingUp}>
          <ChartBars data={data.charts.revenueByEventType} empty="نوع مراسم کافی برای تحلیل وجود ندارد." tone="success" />
        </ChartPanel>
        <ChartPanel title="هزینه‌ها بر اساس دسته‌بندی" icon={Landmark}>
          <ChartBars data={data.charts.expensesByCategory} empty="هنوز هزینه‌ای ثبت نشده است." tone="danger" />
        </ChartPanel>
      </div>
    </ReportCard>
  );
}

function ExportSection({ csvHref }: { csvHref: string }) {
  return (
    <ReportCard title="خروجی گزارش" icon={Download} compact>
      <div className="grid gap-3">
        <Link href={csvHref} className="rounded-[1.25rem] border border-[#c7a15a]/45 bg-[#172033] p-3.5 text-[#fff8ea] shadow-[0_12px_32px_rgba(17,32,51,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(17,32,51,0.2)]">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-black"><FileText size={16} />خروجی CSV</span>
            <span className="rounded-full bg-[#fff8ea]/12 px-3 py-1 text-[11px] font-black text-[#f0dba9]">فعال</span>
          </div>
          <p className="mt-1.5 text-xs font-bold leading-6 text-[#f0dba9]">داده‌های فیلترشده برای اکسل و حسابداری</p>
        </Link>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-[#d8c08b]/65 bg-[#f4efe2]/88 p-3.5 text-[#7d6841] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#4a3514]"><FileSpreadsheet size={16} />خروجی Excel</span>
              <span className="rounded-full border border-[#d8c08b]/70 bg-white/65 px-2.5 py-1 text-[10px] font-black">به‌زودی</span>
            </div>
            <p className="mt-1.5 text-xs font-bold leading-5">غیرفعال، اما با ظاهر مشخص و مرتب</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#d8c08b]/65 bg-[#fff4d8]/78 p-3.5 text-[#7d6841] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-black text-[#4a3514]"><FileDown size={16} />خروجی PDF / پرینت</span>
              <span className="rounded-full border border-[#d8c08b]/70 bg-white/65 px-2.5 py-1 text-[10px] font-black">به‌زودی</span>
            </div>
            <p className="mt-1.5 text-xs font-bold leading-5">آماده‌سازی نسخه چاپی در توسعه بعدی</p>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}

function LatestFinancialMovements({ data }: { data: ReportsData }) {
  const movements = [
    ...data.paymentSummary.latestPayments.map((payment) => ({
      id: `payment-${payment.id}`,
      title: payment.customer?.fullName ?? payment.contract?.contractNo ?? "دریافت مالی",
      date: payment.paidAt,
      amount: toNumber(payment.amount),
      meta: `${getPaymentTypeLabel(payment.type)} · ${formatPaymentMethodLabel(payment.paymentMethod)} · ${getPaymentRecordStatusLabel(payment.status)}`,
      href: `/dashboard/payments/${payment.id}`,
      kind: "income" as const,
    })),
    ...data.expenses.latestExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      title: expense.title || expense.description || "هزینه ثبت‌شده",
      date: expense.occurredAt,
      amount: toNumber(expense.amount),
      meta: expense.financialCategory?.title ?? "هزینه بدون دسته‌بندی",
      href: `/dashboard/expenses/${expense.id}`,
      kind: "expense" as const,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 8);

  return (
    <ReportCard title="آخرین رویدادهای مالی" icon={ReceiptText} compact>
      <div className="space-y-2">
        {movements.length ? movements.map((movement) => (
          <Link key={movement.id} href={movement.href} className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3 text-[#172033] hover:bg-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${movement.kind === "income" ? "border-[#25a46d]/20 bg-[#25a46d]/10 text-[#17483f]" : "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"}`}>{movement.kind === "income" ? "دریافت" : "هزینه"}</span>
                <p className="truncate text-sm font-black">{movement.title}</p>
              </div>
              <p className="mt-1 text-xs font-bold text-[#7d6841]">{formatJalaliDate(movement.date)} · {movement.meta}</p>
            </div>
            <strong className={movement.kind === "income" ? "shrink-0 text-sm font-black text-[#17483f]" : "shrink-0 text-sm font-black text-[#8f2c2c]"}>{movement.kind === "expense" ? "− " : "+ "}{formatIRR(movement.amount)}</strong>
          </Link>
        )) : <CompactEmpty title="هنوز رویداد مالی در این بازه ثبت نشده است." href="/dashboard/payments/new" action="ثبت دریافت" />}
      </div>
    </ReportCard>
  );
}

function PaymentRow({ payment, compact = false }: { payment: ReportsData["paymentSummary"]["latestPayments"][number]; compact?: boolean }) {
  return (
    <div className={compact ? "mt-2.5" : "rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-2.5"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-[#172033]">{payment.customer?.fullName ?? payment.contract?.contractNo ?? "دریافت بدون قرارداد"}</p>
          <p className="mt-1 text-xs font-bold text-[#7d6841]">{formatJalaliDate(payment.paidAt)} · {formatPaymentMethodLabel(payment.paymentMethod)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
          <strong className="text-sm font-black text-[#17483f]">{formatIRR(toNumber(payment.amount))}</strong>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
        <Link href={`/dashboard/payments/${payment.id}`} className="text-[#17483f]">مشاهده دریافت</Link>
        {payment.contract ? <Link href={`/dashboard/contracts/${payment.contract.id}`} className="text-[#7d6841]">مشاهده قرارداد</Link> : null}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon: LucideIcon; tone?: "neutral" | "success" | "warning" | "danger" | "navy" }) {
  const styles = {
    navy: "border-[#172033]/16 bg-[#172033] text-[#fff8ea] shadow-[0_12px_34px_rgba(17,32,51,0.16)]",
    success: "border-[#25a46d]/22 bg-[#f1fbf5] text-[#17483f] shadow-[0_10px_28px_rgba(23,72,63,0.06)]",
    warning: "border-[#c7a15a]/38 bg-[#fff4d8] text-[#7d6841] shadow-[0_10px_28px_rgba(199,161,90,0.08)]",
    danger: "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c] shadow-[0_10px_28px_rgba(180,83,83,0.06)]",
    neutral: "border-[#d8c08b]/58 bg-white/72 text-[#172033] shadow-[0_10px_28px_rgba(17,24,39,0.05)]",
  }[tone];
  const iconClass = tone === "navy" ? "bg-[#fff8ea]/12 text-[#f0dba9]" : "bg-[#172033] text-[#fff8ea]";
  const labelClass = tone === "navy" ? "text-[#f0dba9]" : "text-[#7d6841]";
  const valueClass = tone === "navy" ? "text-[#fff8ea]" : "text-[#111827]";

  return (
    <div className={`min-h-[5.9rem] rounded-[1.15rem] border p-2.5 ${styles}`}>
      <div className="flex items-start gap-2.5">
        <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}><Icon size={14} /></span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-black leading-5 ${labelClass}`}>{label}</p>
          <p className={`mt-1 break-words text-[0.95rem] font-black leading-6 ${valueClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, icon: Icon, action, children, compact = false }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode; compact?: boolean }) {
  return (
    <section className={`rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/95 text-[#111827] shadow-[0_10px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.55rem] ${compact ? "p-3.5" : "p-3.5 sm:p-4"}`}>
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#fff8ea]"><Icon size={16} /></span>
          <h2 className="text-base font-black text-[#172033]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniMetric({ label, value, tone = "neutral", dense = false }: { label: string; value: string; tone?: "neutral" | "success" | "danger" | "warning"; dense?: boolean }) {
  const toneClass = tone === "success" ? "text-[#17483f]" : tone === "danger" ? "text-[#8f2c2c]" : tone === "warning" ? "text-[#9f7131]" : "text-[#172033]";
  return (
    <div className={`rounded-2xl border border-[#d8c08b]/55 bg-white/68 ${dense ? "p-2" : "p-2.5"}`}>
      <p className="text-[11px] font-black leading-5 text-[#7d6841]">{label}</p>
      <p className={`mt-0.5 break-words text-xs font-black leading-5 ${toneClass}`}>{value}</p>
    </div>
  );
}

function InsightChip({ label, value, href, icon: Icon, tone = "neutral" }: { label: string; value: string; href: string; icon: LucideIcon; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "border-[#25a46d]/20 bg-[#25a46d]/10 text-[#17483f]" : tone === "warning" ? "border-[#c7a15a]/40 bg-[#fff4d8] text-[#7d6841]" : "border-[#d8c08b]/60 bg-white/64 text-[#172033]";
  return (
    <Link href={href} className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${toneClass}`}>
      <span className="flex items-center gap-2"><Icon size={14} />{label}</span>
      <span>{value}</span>
    </Link>
  );
}

function ProgressMetric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const barClass = tone === "success" ? "bg-[#25a46d]" : tone === "warning" ? "bg-[#c7a15a]" : tone === "danger" ? "bg-[#b45353]" : "bg-[#172033]";
  return (
    <div className="rounded-2xl border border-[#d8c08b]/55 bg-white/68 p-2.5">
      <div className="flex items-center justify-between gap-3 text-xs font-black text-[#172033]">
        <span>{label}</span>
        <span className="text-[#7d6841]">{formatPercent(value)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ead9b8]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${clampPercent(value)}%` }} />
      </div>
    </div>
  );
}

function ActionHint({ title, value, tone = "neutral" }: { title: string; value: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success" ? "text-[#17483f]" : tone === "warning" ? "text-[#9f7131]" : tone === "danger" ? "text-[#8f2c2c]" : "text-[#172033]";
  return (
    <div className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff4d8]/48 p-2.5">
      <p className="text-[11px] font-black text-[#7d6841]">{title}</p>
      <p className={`mt-1 text-xs font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function SectionMiniHeader({ title }: { title: string }) {
  return <p className="text-xs font-black text-[#172033]">{title}</p>;
}

function BarRow({ label, value, max, suffix, formatter = formatPersianNumber, tone = "neutral" }: { label: string; value: number; max: number; suffix?: string; formatter?: (value: number) => string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const barClass = tone === "success" ? "bg-[#25a46d]" : tone === "warning" ? "bg-[#c7a15a]" : tone === "danger" ? "bg-[#b45353]" : "bg-[#172033]";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs font-black text-[#172033]">
        <span className="truncate">{label}</span>
        <span className="shrink-0 text-[#7d6841]">{formatter(value)}{suffix ? ` ${suffix}` : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#ead9b8]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ChartPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="min-h-[12rem] rounded-2xl border border-[#d8c08b]/55 bg-white/65 p-3.5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-[#9f7131]" />
        <h3 className="text-sm font-black text-[#172033]">{title}</h3>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChartBars({ data, empty, suffix, tone = "neutral" }: { data: Array<{ label: string; amount: number }>; empty: string; suffix?: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const max = Math.max(...data.map((item) => item.amount), 0);

  if (!data.length || max <= 0) {
    return <CompactEmpty title={empty} />;
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((item) => (
        <BarRow key={item.label} label={item.label} value={item.amount} max={max} formatter={suffix ? formatPersianNumber : formatIRR} suffix={suffix} tone={tone} />
      ))}
    </div>
  );
}

function CompactEmpty({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-[#fff4d8]/40 p-2.5 text-center">
      <p className="text-xs font-black leading-6 text-[#172033]">{title}</p>
      {href && action ? (
        <Link href={href} className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/45 bg-white/70 px-3 py-1.5 text-[11px] font-black text-[#17483f] hover:bg-white">
          {action}
          <ArrowLeft size={13} />
        </Link>
      ) : null}
    </div>
  );
}

function PositiveState({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <div className="rounded-2xl border border-[#25a46d]/20 bg-[#25a46d]/10 p-3 text-center">
      <CheckCircle2 className="mx-auto text-[#17483f]" size={24} />
      <p className="mt-2 text-sm font-black text-[#17483f]">{title}</p>
      <Link href={href} className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#25a46d]/25 bg-white/70 px-4 py-2 text-xs font-black text-[#17483f] hover:bg-white">
        {action}
        <ArrowLeft size={14} />
      </Link>
    </div>
  );
}

function SelectField({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} className="input-luxury min-h-10 py-2 text-sm">
        {children}
      </select>
    </label>
  );
}

function ratio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatPercent(value: number) {
  return `${formatPersianNumber(clampPercent(value))}٪`;
}

function findOptionLabel(options: Array<{ id: string; label: string }>, id?: string) {
  return id ? options.find((option) => option.id === id)?.label : undefined;
}

function getSelectedFiltersLabel(data: ReportsData) {
  const filters = data.filters;
  const parts = [
    data.filters.range.label,
    findOptionLabel(data.options.halls, filters.hallId) ?? "همه تالارها",
    findOptionLabel(data.options.salons, filters.salonId) ?? "همه سالن‌ها",
    findOptionLabel(data.options.eventTypes, filters.eventType) ?? "همه مراسم‌ها",
  ];

  if (filters.paymentMethodId) {
    parts.push(findOptionLabel(data.options.paymentMethods, filters.paymentMethodId) ?? "روش دریافت انتخاب‌شده");
  }

  if (filters.categoryId) {
    parts.push(findOptionLabel(data.options.financialCategories, filters.categoryId) ?? "دسته‌بندی مالی انتخاب‌شده");
  }

  if (filters.reportType !== "all") {
    parts.push(reportTypeLabels[filters.reportType]);
  }

  return parts.join(" · ");
}

function buildReportsQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value !== "all") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function ScheduledReportsIntegrationCard() {
  return (
    <section className="rounded-[1.25rem] border border-[#d8c08b]/58 bg-[#fff9ee]/94 p-3 shadow-[0_8px_26px_rgba(17,24,39,0.045)] sm:rounded-[1.45rem] sm:p-3.5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-2xl bg-[#172033] text-[#fff8ea] shadow-[0_8px_18px_rgba(23,32,51,0.12)] sm:size-9">
            <CalendarClock size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10.5px] font-black text-[#9f7131]">گزارش‌های زمان‌بندی‌شده</p>
            <h2 className="mt-0.5 text-[0.98rem] font-black text-[#111827] sm:text-base">ارسال گزارش مدیریتی</h2>
            <p className="mt-0.5 max-w-2xl text-xs font-bold leading-5 text-[#6d5f49]">ارسال دستی گزارش همین بازه از مسیر اعلان‌ها در یک نوار عملیاتی فشرده و قابل کنترل.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-[1rem] border border-[#d8c08b]/45 bg-white/58 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&_button]:min-h-9 [&_button]:rounded-xl [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-[11px] [&_button]:shadow-none [&_button_svg]:size-3.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            <ScheduledReportActionButton type="daily" label="ارسال روزانه" />
            <ScheduledReportActionButton type="weekly" label="ارسال هفتگی" />
            <ScheduledReportActionButton type="monthly" label="ارسال ماهانه" />
          </div>
          <Link href="/dashboard/settings/notifications" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-[#d8b76a] bg-[#fff7e6] px-3 py-1.5 text-[11px] font-black text-[#4a3514] transition hover:-translate-y-0.5 hover:bg-[#f4dfaa]">
            <CalendarDays size={14} />
            تنظیمات اعلان‌ها
          </Link>
        </div>
      </div>
    </section>
  );
}
