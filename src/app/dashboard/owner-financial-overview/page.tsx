import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  HandCoins,
  LineChart,
  MessageSquareWarning,
  ReceiptText,
  Scale,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getOwnerFinancialOverviewData } from "@/lib/owner-dashboard/owner-financial-overview";
import { ownerOperationModelLabels, formatPercentValue, formatTomanValue } from "@/lib/owner-operation/owner-operation-settings";
import {
  getOwnerSettlementDiagnosticReasonStyle,
  ownerSettlementStatusLabels,
  getOwnerSettlementStatusStyle,
  type OwnerSettlementDiagnosticReason,
} from "@/lib/owner-settlements/owner-monthly-settlement";
import {
  getOwnerFinancialAuditCategoryLabel,
  getOwnerFinancialAuditSeverityStyle,
  ownerFinancialAuditSeverityLabels,
} from "@/lib/owner-audit/owner-financial-control-audit";

export const dynamic = "force-dynamic";

type OwnerFinancialOverviewPageProps = {
  searchParams: Promise<{ year?: string; month?: string }>;
};

type OverviewData = Awaited<ReturnType<typeof getOwnerFinancialOverviewData>>;

type OwnerSettlementDiagnosticRow = {
  contractId: string;
  contractNo: string;
  customerName: string;
  eventDateLabel: string;
  reason: OwnerSettlementDiagnosticReason;
  reasonLabel: string;
  finalTotal: number;
  invoiceNo: string | null;
  invoiceStatus: string | null;
  postEventStatus: string | null;
};

function getDiagnosticAction(row: OwnerSettlementDiagnosticRow) {
  if (row.reason === "HELD_BUT_INVOICE_MISSING") {
    return { href: `/dashboard/contracts/${row.contractId}/invoice`, label: "صدور فاکتور" };
  }
  if (row.reason === "POST_EVENT_CONFIRMATION_MISSING") {
    return { href: "/dashboard/invoices", label: "ثبت برگزاری و صدور فاکتور" };
  }
  if (row.reason === "BEFORE_OWNER_OPERATION_START") {
    return { href: "/dashboard/settings/owner-operation", label: "بررسی شروع محاسبات مالک" };
  }
  return { href: `/dashboard/contracts/${row.contractId}`, label: "مشاهده قرارداد" };
}

export default async function OwnerFinancialOverviewPage({ searchParams }: OwnerFinancialOverviewPageProps) {
  const membership = await requireTenantPermission("owner.financial.view");
  const params = await searchParams;
  const data = await getOwnerFinancialOverviewData({
    tenantId: membership.tenantId,
    year: params.year,
    month: params.month,
  });

  return (
    <section className="space-y-4 sm:space-y-5">
      <Hero data={data} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={HandCoins}
          label="قابل پرداخت مالک"
          value={getFinalOwnerPayableLabel(data)}
          tone={data.health.tone}
          source="از پیش‌نمایش تسویه همین دوره خوانده می‌شود و حداقل تضمین ماهانه مالک را هم در نظر می‌گیرد."
        />
        <MetricCard
          icon={ReceiptText}
          label="جمع فاکتورهای دوره"
          value={formatIRR(data.invoiceSummary.invoiceTotal)}
          source="از فاکتورهای بعد از مراسم همین ماه محاسبه می‌شود؛ قراردادهای آرشیوی قبل از شروع کنترل مالک وارد این عدد نمی‌شوند."
        />
        <MetricCard
          icon={ShieldAlert}
          label="هشدارهای مالی"
          value={formatPersianNumber(data.audit.totalFlags)}
          tone={data.audit.highRisk > 0 ? "danger" : "neutral"}
          source="از کنترل مالی مالک و پرچم‌های اختلاف، پرداخت خارج فاکتور و نبود پاسخ مشتری می‌آید."
        />
        <MetricCard
          icon={MessageSquareWarning}
          label="گزارش خارج فاکتور"
          value={formatIRR(data.feedbackSummary.offInvoiceAmount)}
          tone={data.feedbackSummary.offInvoiceAmount > 0 ? "danger" : "neutral"}
          source="از گزارش محرمانه مشتری در پرتال فاکتور خوانده می‌شود، نه از دریافت‌های عادی برنامه."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-4">
          <ActionCenter items={data.actionItems} />
          <FinancialCards data={data} />
          <DiagnosticVisibilityPanel data={data} />
          <RiskOverview data={data} />
        </div>

        <aside className="space-y-3">
          <PeriodFilter year={data.period.year} month={data.period.month} />
          <OwnerSettingCard data={data} />
          <SettlementStatusCard data={data} />
          <LatestSettlements data={data} />
        </aside>
      </section>
    </section>
  );
}

function Hero({ data }: { data: OverviewData }) {
  const healthClass = getHealthClass(data.health.tone);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_14%_0%,rgba(199,161,90,0.16),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_18px_54px_rgba(17,24,39,0.09)] sm:rounded-[1.75rem] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="min-w-0 text-center lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            <LineChart size={15} /> داشبورد مالی مالک
          </span>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">نمای کلی مالک برای {data.period.label}</h1>
          <p className="mx-auto mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] lg:mx-0">
            خلاصه سهم مالک، فاکتورهای دوره، وضعیت تسویه و هشدارهای دور زدن مالی در همین صفحه دیده می‌شود. اعداد از جریان‌های ثبت‌شده سیستم خوانده می‌شوند و قراردادهای آرشیوی قبل از شروع کنترل مالک در محاسبات جاری وارد نمی‌شوند.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
          <Link href={`/dashboard/owner-financial-overview?year=${data.previous.year}&month=${data.previous.month}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/74 px-4 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
            <ArrowRight size={16} /> ماه قبل
          </Link>
          <Link href={`/dashboard/owner-financial-overview?year=${data.next.year}&month=${data.next.month}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/74 px-4 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
            ماه بعد <ArrowLeft size={16} />
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className={`rounded-[1.05rem] border px-4 py-3 text-sm font-black leading-7 ${healthClass}`}>
          <span className="inline-flex items-center gap-2"><ShieldCheck size={17} /> {data.health.label}</span>
          <p className="mt-1 text-xs font-bold leading-6 opacity-80">{data.health.description}</p>
        </div>
        <div className="rounded-[1.05rem] border border-[#d8c08b]/65 bg-white/62 px-4 py-3 text-center text-xs font-black leading-6 text-[#7d6841]">
          آخرین تولید<br />{formatJalaliDateTime(data.generatedAt)}
        </div>
      </div>
    </div>
  );
}

function ActionCenter({ items }: { items: OverviewData["actionItems"] }) {
  return (
    <Panel title="اقدام‌های مهم مالک" icon={ClipboardCheck} compact>
      {items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <Link key={`${item.title}-${item.href}`} href={item.href} className={`rounded-[1.05rem] border p-4 text-center shadow-[0_12px_32px_rgba(17,24,39,0.055)] transition hover:-translate-y-0.5 ${getActionClass(item.tone)}`}>
              <p className="text-sm font-black text-[#111827]">{item.title}</p>
              <p className="mx-auto mt-2 max-w-md text-xs font-bold leading-6 text-[#6d5f49]">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-current/18 bg-white/62 px-3 py-2 text-xs font-black">
                {item.cta} <ArrowLeft size={14} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="rounded-[1.05rem] border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-center text-sm font-black leading-7 text-[#17483f]">
            اقدام فوری برای مالک ثبت نشده است.
            <p className="mt-1 text-xs font-bold leading-6 text-[#3f7564]">قبل از بستن ماه، وضعیت فاکتورها، اعتراض‌ها و هشدارهای کنترل مالی را بازبینی کنید.</p>
          </div>
          <Link href="/dashboard/owner-settlements" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/18 bg-white/70 px-4 text-xs font-black text-[#17483f] transition hover:bg-[#e9f8ef]">
            ساخت تسویه <ArrowLeft size={14} />
          </Link>
        </div>
      )}
    </Panel>
  );
}

function FinancialCards({ data }: { data: OverviewData }) {
  const settlement = data.settlementPreview.ready ? data.settlementPreview.settlement : null;

  return (
    <Panel title="خلاصه مالی دوره" icon={Scale}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="تعداد فاکتور" value={formatPersianNumber(data.invoiceSummary.count)} icon={ReceiptText} source="فاکتورهای ساخته‌شده از قراردادهای غیرآرشیوی همین دوره." />
        <SummaryCard label="مانده قابل دریافت" value={formatIRR(data.invoiceSummary.payableTotal)} icon={WalletCards} source="مانده فاکتورهای دوره پس از دریافت‌های ثبت‌شده." />
        <SummaryCard label="نفرات اضافه" value={formatIRR(data.invoiceSummary.extraGuestTotal)} icon={UsersRound} source="ردیف‌های نفرات اضافه در فاکتورهای بعد از مراسم." />
        <SummaryCard label="خدمات/اصلاحات اضافه" value={formatIRR(data.invoiceSummary.extraServicesTotal)} icon={TrendingUp} source="خدمات اضافه و اصلاحات افزایشی تأییدشده توسط مالک." />
        <SummaryCard label="درخواست اصلاح باز" value={formatPersianNumber(data.pendingAdjustments)} icon={AlertTriangle} danger={data.pendingAdjustments > 0} source="درخواست‌های اصلاح فاکتور که هنوز تأیید یا رد نشده‌اند." />
        <SummaryCard label="تأیید مشتری" value={`${formatPersianNumber(data.feedbackSummary.accepted)} از ${formatPersianNumber(data.feedbackSummary.count)}`} icon={CheckCircle2} source="بازخوردهای ثبت‌شده مشتری در پرتال فاکتور." />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusPill label="صادر شده" value={data.invoiceSummary.issued} />
        <StatusPill label="ارسال شده" value={data.invoiceSummary.sent} />
        <StatusPill label="دارای اختلاف" value={data.invoiceSummary.disputed} danger={data.invoiceSummary.disputed > 0} />
        <StatusPill label="تسویه‌شده" value={data.invoiceSummary.settled} />
      </div>

      {settlement ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="سهم مراسم" value={formatIRR(settlement.ownerEventShare)} icon={HandCoins} source="درصد سهم مالک از فاکتورهای قطعی بعد از مراسم." />
          <SummaryCard label="سهم کنسلی" value={formatIRR(settlement.ownerCancellationShare)} icon={Banknote} source="درصد سهم مالک از کنسلی‌های مشمول دوره." />
          <SummaryCard label="کسری تا حداقل تضمین" value={formatIRR(settlement.minimumGuaranteeShortfall)} icon={ShieldAlert} danger={Number(settlement.minimumGuaranteeShortfall) > 0} source="اگر سهم مالک کمتر از حداقل تضمین ماهانه باشد، اختلاف اینجا نمایش داده می‌شود." />
          <SummaryCard label="پرداخت نهایی مالک" value={formatIRR(settlement.finalOwnerPayable)} icon={HandCoins} strong source="خروجی نهایی پیش‌نمایش تسویه مالک برای همین ماه." />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] p-4 text-sm font-black leading-7 text-[#8f2c2c]">
          پیش‌نمایش تسویه آماده نیست. معمولاً یعنی تنظیمات فعال مالک پیدا نشده یا داده کافی برای ساخت تسویه این دوره وجود ندارد.
        </div>
      )}
    </Panel>
  );
}

function DiagnosticVisibilityPanel({ data }: { data: OverviewData }) {
  const rows: OwnerSettlementDiagnosticRow[] = data.settlementPreview.ready
    ? data.settlementPreview.settlement?.diagnosticRows ?? []
    : [];
  const summary = data.settlementPreview.ready ? data.settlementPreview.settlement?.diagnosticSummary ?? null : null;

  return (
    <Panel title="قراردادهای خارج از تسویه" icon={AlertTriangle}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="کل موارد تشخیصی" value={formatPersianNumber(summary?.count ?? rows.length)} icon={AlertTriangle} danger={rows.length > 0} source="قراردادهای همین دوره که در تقویم هستند اما وارد مبلغ تسویه مالک نشده‌اند." />
        <SummaryCard label="قبل از شروع مالک" value={formatPersianNumber(summary?.beforeOwnerOperationStart ?? 0)} icon={CalendarDays} danger={(summary?.beforeOwnerOperationStart ?? 0) > 0} source="قراردادهایی که تاریخ مراسم آن‌ها قبل از شروع محاسبات مالک است." />
        <SummaryCard label="برگزارشده بدون فاکتور" value={formatPersianNumber(summary?.heldWithoutInvoice ?? 0)} icon={ReceiptText} danger={(summary?.heldWithoutInvoice ?? 0) > 0} source="مراسمی که بعد از تأیید برگزاری هنوز فاکتور معتبر ندارند." />
        <SummaryCard label="فاکتور لغو شده" value={formatPersianNumber(summary?.canceledInvoice ?? 0)} icon={ShieldAlert} danger={(summary?.canceledInvoice ?? 0) > 0} source="قراردادهایی که فاکتورشان CANCELED است و وارد سهم مالک نمی‌شوند." />
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {rows.map((row) => {
            const action = getDiagnosticAction(row);
            return (
              <Link key={`${row.contractId}-${row.reason}`} href={action.href} className="rounded-[1.05rem] border border-[#d8c08b]/55 bg-white/78 p-4 text-xs font-bold leading-6 text-[#111827] transition hover:border-[#c7a15a] hover:bg-[#fff8ea]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-[#111827]">{toPersianDigits(row.contractNo)} · {row.customerName}</p>
                    <p className="mt-1 text-[#6d5f49]">تاریخ مراسم: {row.eventDateLabel} · مبلغ قرارداد: {formatIRR(row.finalTotal)}</p>
                    <p className="mt-1 text-[#6d5f49]">فاکتور: {row.invoiceNo ? `${toPersianDigits(row.invoiceNo)} / ${row.invoiceStatus ?? "—"}` : "ندارد"} · تعیین تکلیف: {row.postEventStatus ?? "ثبت نشده"}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getOwnerSettlementDiagnosticReasonStyle(row.reason)}`}>{row.reasonLabel}</span>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-3 py-1.5 text-[11px] font-black text-[#17483f]">اقدام پیشنهادی: {action.label} <ArrowLeft size={13} /></span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-sm font-black leading-7 text-[#17483f]">
          قرارداد خارج از تسویه برای این دوره پیدا نشد.
        </div>
      )}
    </Panel>
  );
}


function RiskOverview({ data }: { data: OverviewData }) {
  return (
    <Panel title="کنترل اختلاف و دور زدن مالی" icon={FileWarning}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="ریسک زیاد" value={formatPersianNumber(data.audit.highRisk)} icon={ShieldAlert} danger={data.audit.highRisk > 0} source="پرچم‌های شدید در کنترل مالی مالک." />
        <SummaryCard label="پرداخت خارج فاکتور" value={formatPersianNumber(data.audit.offInvoicePayments)} icon={WalletCards} danger={data.audit.offInvoicePayments > 0} source="مواردی که مشتری پرداخت خارج از فاکتور را گزارش کرده است." />
        <SummaryCard label="خدمت جداگانه" value={formatPersianNumber(data.audit.separateServicePayments)} icon={MessageSquareWarning} danger={data.audit.separateServicePayments > 0} source="خدماتی که مشتری جدا از فاکتور اصلی اعلام کرده است." />
        <SummaryCard label="بدون پاسخ مشتری" value={formatPersianNumber(data.audit.sentWithoutFeedback)} icon={AlertTriangle} danger={data.audit.sentWithoutFeedback > 0} source="فاکتورهایی که برای مشتری ارسال شده ولی هنوز بازخورد ندارند." />
      </div>

      {data.audit.topRiskFlags.length > 0 ? (
        <div className="mt-4 space-y-3">
          {data.audit.topRiskFlags.map((flag) => (
            <Link key={flag.id} href={flag.href ?? `/dashboard/owner-financial-audit?year=${data.period.year}&month=${data.period.month}`} className={`block rounded-[1.15rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] transition hover:-translate-y-0.5 ${getOwnerFinancialAuditSeverityStyle(flag.severity)}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-current/20 bg-white/50 px-3 py-1 text-[11px] font-black">{ownerFinancialAuditSeverityLabels[flag.severity]}</span>
                    <span className="rounded-full border border-current/15 bg-white/45 px-3 py-1 text-[11px] font-black">{getOwnerFinancialAuditCategoryLabel(flag.category)}</span>
                  </div>
                  <p className="mt-3 text-sm font-black text-[#111827]">{flag.title}</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{flag.customerName ?? "مشتری نامشخص"} · قرارداد {flag.contractNo ? toPersianDigits(flag.contractNo) : "—"}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-2xl border border-current/18 bg-white/62 px-3 py-2 text-xs font-black">مشاهده <ArrowLeft size={14} /></span>
              </div>
            </Link>
          ))}
          <Link href={`/dashboard/owner-financial-audit?year=${data.period.year}&month=${data.period.month}`} className="inline-flex items-center gap-2 rounded-2xl bg-[#172033] px-4 py-2.5 text-sm font-black text-[#fff8ea]">
            مشاهده همه هشدارها <ArrowLeft size={16} />
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-sm font-black leading-7 text-[#17483f]">
          در این دوره هشدار مالی مهم ثبت نشده است. در صورت ثبت اعتراض مشتری، پرداخت خارج فاکتور یا اختلاف جدید، این بخش به‌روزرسانی می‌شود.
        </div>
      )}
    </Panel>
  );
}

function OwnerSettingCard({ data }: { data: OverviewData }) {
  const setting = data.setting;

  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-black text-[#111827]">مدل مالک و پیمان</p>
        <SlidersHorizontal size={17} className="text-[#7d6841]" />
      </div>
      {setting ? (
        <div className="mt-3 space-y-2 text-xs font-bold leading-6 text-[#6d5f49]">
          <p className="font-black text-[#17483f]">{ownerOperationModelLabels[setting.operationModel]}</p>
          <p>سهم مراسم: {formatPercentValue(setting.ownerRevenueSharePercent.toString())}</p>
          <p>سهم کنسلی: {formatPercentValue(setting.ownerCancellationSharePercent.toString())}</p>
          <p>حداقل تضمین: {formatTomanValue(setting.monthlyMinimumGuarantee.toString())}</p>
          <p>شروع محاسبات مالک: {formatJalaliDateTime(setting.effectiveFrom)}</p>
          <p>وضعیت: {setting.isActive ? "فعال" : "غیرفعال"}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs font-bold leading-6 text-[#8f2c2c]">تنظیمات مالک ثبت نشده است.</p>
      )}
      <Link href="/dashboard/settings/owner-operation" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/76 px-4 py-2.5 text-xs font-black text-[#7d6841]">
        تنظیمات مالک <ArrowLeft size={14} />
      </Link>
    </div>
  );
}

function SettlementStatusCard({ data }: { data: OverviewData }) {
  const settlement = data.existingSettlement;

  return (
    <div className="rounded-[1.25rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="text-sm font-black text-[#111827]">وضعیت تسویه دوره</p>
        <HandCoins size={17} className="text-[#17483f]" />
      </div>
      {settlement ? (
        <div className="mt-3 space-y-2 text-xs font-bold leading-6 text-[#17483f]">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${getOwnerSettlementStatusStyle(settlement.status)}`}>{ownerSettlementStatusLabels[settlement.status]}</span>
          <p>مبلغ نهایی: {formatIRR(settlement.finalOwnerPayable.toString())}</p>
          <p>مراسم: {formatPersianNumber(settlement.heldEventsCount)} · کنسلی: {formatPersianNumber(settlement.canceledEventsCount)}</p>
          {settlement.status === "APPROVED" || settlement.status === "PAID" ? <p className="rounded-2xl border border-[#17483f]/18 bg-white/70 px-3 py-2 text-[#17483f]">قفل ماه مالی فعال است و تغییرات مالی این دوره مسدود می‌شود.</p> : null}
          <Link href={`/dashboard/owner-settlements/${settlement.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-white/68 px-3 py-2 text-xs font-black">
            جزئیات تسویه <ArrowLeft size={14} />
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3 text-xs font-bold leading-6 text-[#17483f]">
          <p>برای این دوره هنوز تسویه ذخیره نشده است.</p>
          <Link href={`/dashboard/owner-settlements?year=${data.period.year}&month=${data.period.month}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-white/68 px-3 py-2 text-xs font-black">
            ساخت/پیش‌نمایش تسویه <ArrowLeft size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function LatestSettlements({ data }: { data: OverviewData }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="text-center text-sm font-black text-[#111827]">آخرین تسویه‌ها</p>
      <div className="mt-3 space-y-2">
        {data.latestSettlements.length > 0 ? data.latestSettlements.map((settlement) => (
          <Link key={settlement.id} href={`/dashboard/owner-settlements/${settlement.id}`} className="block rounded-2xl border border-[#d8c08b]/55 bg-white/72 p-3 transition hover:bg-[#fff4d8]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-[#111827]">{settlement.periodLabel}</p>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getOwnerSettlementStatusStyle(settlement.status)}`}>{ownerSettlementStatusLabels[settlement.status]}</span>
            </div>
            <p className="mt-1 text-xs font-black text-[#17483f]">{formatIRR(settlement.finalOwnerPayable.toString())}</p>
          </Link>
        )) : <p className="text-xs font-bold leading-6 text-[#6d5f49]">هنوز تسویه‌ای ذخیره نشده است.</p>}
      </div>
    </div>
  );
}

function PeriodFilter({ year, month }: { year: number; month: number }) {
  return (
    <form className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="text-center text-sm font-black text-[#111827]">انتخاب دوره شمسی</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input name="year" defaultValue={year} inputMode="numeric" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 text-sm font-black text-[#111827] outline-none" />
        <input name="month" defaultValue={month} inputMode="numeric" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 text-sm font-black text-[#111827] outline-none" />
      </div>
      <button className="mt-3 min-h-11 w-full rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]">نمایش دوره</button>
    </form>
  );
}

function Panel({ title, icon: Icon, children, compact = false }: { title: string; icon: LucideIcon; children: ReactNode; compact?: boolean }) {
  return (
    <section className={`rounded-[1.25rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.55rem] ${compact ? "p-4" : "p-4 sm:p-5"}`}>
      <h2 className="flex items-center justify-center gap-2 text-center text-lg font-black text-[#111827] sm:justify-start sm:text-right"><Icon size={18} className="text-[#7d6841]" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "neutral", source }: { icon: LucideIcon; label: string; value: string; tone?: "neutral" | "danger" | "warning" | "success"; source: string }) {
  return (
    <div className={`rounded-[1.15rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${getMetricClass(tone)}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-white/62"><Icon size={18} /></span>
        <p className="text-center text-xs font-black opacity-75">{label}</p>
      </div>
      <p className="mt-2 text-center text-lg font-black">{value}</p>
      <DataSourceNote>{source}</DataSourceNote>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, danger = false, strong = false, source }: { icon: LucideIcon; label: string; value: string; danger?: boolean; strong?: boolean; source: string }) {
  const className = danger
    ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
    : strong
      ? "border-[#17483f]/22 bg-[#f1fbf5] text-[#17483f]"
      : "border-[#d8c08b]/60 bg-white/82 text-[#111827]";
  return (
    <div className={`rounded-[1.05rem] border p-3 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <Icon size={16} />
        <p className="text-center text-xs font-black opacity-75">{label}</p>
      </div>
      <p className="mt-2 text-center text-base font-black">{value}</p>
      <DataSourceNote>{source}</DataSourceNote>
    </div>
  );
}

function DataSourceNote({ children }: { children: ReactNode }) {
  return (
    <details className="mx-auto mt-3 max-w-xs rounded-2xl border border-current/12 bg-white/48 px-3 py-2 text-center text-[11px] font-bold leading-5 opacity-85 open:bg-white/70">
      <summary className="cursor-pointer list-none text-[11px] font-black">منبع داده</summary>
      <div className="mt-2 border-t border-current/10 pt-2">{children}</div>
    </details>
  );
}

function StatusPill({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border px-3 py-2 text-center text-xs font-black ${danger ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#d8c08b]/60 bg-white/82 text-[#111827]"}`}>
      <span className="text-[#7d6841]">{label}</span>
      <span className="mr-2">{formatPersianNumber(value)}</span>
    </div>
  );
}

function getFinalOwnerPayableLabel(data: OverviewData) {
  const settlement = data.settlementPreview.ready ? data.settlementPreview.settlement : null;
  return settlement ? formatIRR(settlement.finalOwnerPayable) : "نیازمند تنظیمات";
}

function getHealthClass(tone: OverviewData["health"]["tone"]) {
  if (tone === "danger") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  if (tone === "success") return "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]";
  return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
}

function getMetricClass(tone: "neutral" | "danger" | "warning" | "success") {
  if (tone === "danger") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  if (tone === "success") return "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]";
  if (tone === "warning") return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
  return "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]";
}

function getActionClass(tone: "danger" | "warning" | "success") {
  if (tone === "danger") return "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]";
  if (tone === "success") return "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]";
  return "border-[#c7a15a]/38 bg-[#fff7e6] text-[#7a4a12]";
}
