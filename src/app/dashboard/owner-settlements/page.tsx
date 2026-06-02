import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarDays,
  Calculator,
  CheckCircle2,
  Database,
  HandCoins,
  Info,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { generateOwnerMonthlySettlementAction } from "@/lib/actions/owner-monthly-settlement-actions";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { ownerOperationModelLabels } from "@/lib/owner-operation/owner-operation-settings";
import {
  getNextOwnerSettlementPeriod,
  getOwnerSettlementDiagnosticReasonStyle,
  getOwnerSettlementPageData,
  getOwnerSettlementStatusStyle,
  getPreviousOwnerSettlementPeriod,
  ownerSettlementStatusLabels,
  type OwnerSettlementDiagnosticReason,
} from "@/lib/owner-settlements/owner-monthly-settlement";

const inputClass = "w-full rounded-2xl border border-[#d8c08b]/65 bg-white/88 px-3 py-3 text-center text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/55 focus:bg-white";

type OwnerSettlementsPageProps = {
  searchParams: Promise<{ year?: string; month?: string; error?: string }>;
};

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
  settlementImpact: string;
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

export default async function OwnerSettlementsPage({ searchParams }: OwnerSettlementsPageProps) {
  const membership = await requireTenantPermission("owner.settlement.view");
  const params = await searchParams;
  const { period, preview, latestSettlements } = await getOwnerSettlementPageData({
    tenantId: membership.tenantId,
    year: params.year,
    month: params.month,
  });
  const previous = getPreviousOwnerSettlementPeriod(period.year, period.month);
  const next = getNextOwnerSettlementPeriod(period.year, period.month);
  const existingSettlement = preview.ready ? preview.existingSettlement : null;
  const lockedExisting = existingSettlement && existingSettlement.status !== "DRAFT";

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_17rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.10)] sm:rounded-[1.8rem] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="text-center lg:text-right">
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f] lg:mx-0">
              <HandCoins size={15} /> تسویه ماهانه مالک
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">گزارش سهم مالک برای {preview.period.label}</h1>
            <p className="mx-auto mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] lg:mx-0">
              مبنای این گزارش تاریخ مراسم است. فاکتورها، کنسلی‌ها، خدمات اضافه و تنظیمات مالک در همین دوره جمع می‌شوند و بعد از ساخت گزارش، snapshot قابل پیگیری ذخیره می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 lg:justify-end">
            <Link href={`/dashboard/owner-settlements?year=${previous.year}&month=${previous.month}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/76 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <ArrowRight size={16} /> ماه قبل
            </Link>
            <Link href={`/dashboard/owner-settlements?year=${next.year}&month=${next.month}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/76 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              ماه بعد <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>

      {params.error ? <Notice tone="danger">{getOwnerSettlementErrorMessage(params.error)}</Notice> : null}

      {!preview.ready ? (
        <Notice tone="danger">
          تنظیمات فعال مالک و پیمان پیدا نشد. ابتدا در تنظیمات مالک، مدل بهره‌برداری، درصد سهم مالک و حداقل تضمین را ثبت کنید.
        </Notice>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-3 xl:sticky xl:top-24">
          <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="flex items-center justify-center gap-2 text-sm font-black text-[#111827]"><CalendarDays size={16} /> انتخاب دوره</p>
            <form className="mt-3 grid gap-2" action="/dashboard/owner-settlements">
              <div className="grid grid-cols-2 gap-2">
                <input name="year" defaultValue={period.year} inputMode="numeric" className={inputClass} aria-label="سال" />
                <input name="month" defaultValue={period.month} inputMode="numeric" className={inputClass} aria-label="ماه" />
              </div>
              <button className="rounded-2xl border border-[#17483f]/15 bg-[#17483f] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_10px_24px_rgba(23,72,63,0.16)]">نمایش دوره</button>
            </form>
          </div>

          <InfoPanel
            icon={CalendarDays}
            title="قواعد دوره"
            body={[
              `سال ${toPersianDigits(period.year)} · ماه ${toPersianDigits(period.month)}`,
              `دوره ${preview.period.label}`,
              "فقط قراردادهایی وارد محاسبه می‌شوند که تاریخ مراسم آن‌ها داخل دوره باشد و فاکتورشان لغو نشده باشد.",
            ]}
          />

          <InfoPanel
            icon={Info}
            title="حسابرسی کنسلی"
            tone="danger"
            body={[
              "تا قبل از تکمیل سند مستقل کنسلی، مبنای کنسلی از وضعیت قرارداد و سیاست ثبت‌شده مالک خوانده می‌شود.",
              "نتیجه محاسبه در snapshot گزارش ذخیره می‌شود تا بعداً قابل پیگیری باشد.",
            ]}
          />
        </aside>

        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8c08b]/45 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]"><Calculator size={18} /> پیش‌نمایش محاسبه ماهانه</h2>
                <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">این بخش پیش‌نمایش زنده است؛ ذخیره رسمی فقط با دکمه ساخت / به‌روزرسانی انجام می‌شود.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/18 bg-[#f1fbf5] px-3 py-1.5 text-xs font-black text-[#17483f]">
                <Database size={14} /> منبع: فاکتورها، قراردادها و تنظیمات مالک
              </span>
            </div>

            {preview.ready && preview.settlement ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard icon={ReceiptText} label="فاکتورهای برگزارشده" value={`${formatPersianNumber(preview.settlement.heldEventsCount)} عدد`} source="از قراردادهای برگزارشده همین دوره که فاکتور فعال دارند خوانده می‌شود." />
                  <MetricCard icon={Ban} label="کنسلی‌های دوره" value={`${formatPersianNumber(preview.settlement.canceledEventsCount)} عدد`} source="از قراردادهای لغوشده یا وضعیت‌های کنسلی داخل همین دوره محاسبه می‌شود." />
                  <MetricCard icon={WalletCards} label="جمع فاکتورها" value={formatIRR(preview.settlement.invoiceTotal)} source="جمع فاکتورهای معتبر دوره، بدون قراردادهای آرشیوی و بدون فاکتورهای لغوشده." />
                  <MetricCard icon={ShieldCheck} label="قابل پرداخت به مالک" value={formatIRR(preview.settlement.finalOwnerPayable)} source="بیشترین مقدار بین سهم محاسباتی مالک و حداقل تضمین ماهانه." strong />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <SummaryCard label="خدمات و نفرات اضافه" value={formatIRR(preview.settlement.extraServicesTotal)} source="جمع ردیف‌های اضافه و خدمات تکمیلی ثبت‌شده برای قراردادهای همین دوره." />
                  <SummaryCard label="درآمد/خسارت کنسلی" value={formatIRR(preview.settlement.cancellationIncomeTotal)} source="مبلغ قابل محاسبه از قراردادهای کنسلی دوره طبق سیاست مالک." />
                  <SummaryCard label="سهم مالک از مراسم" value={formatIRR(preview.settlement.ownerEventShare)} source="درصد سهم مالک از فاکتورهای قطعی مراسم برگزارشده." />
                  <SummaryCard label="سهم مالک از کنسلی" value={formatIRR(preview.settlement.ownerCancellationShare)} source="درصد سهم مالک از درآمد یا خسارت کنسلی‌های دوره." />
                  <SummaryCard label="جمع سهم محاسباتی" value={formatIRR(preview.settlement.calculatedOwnerShare)} source="جمع سهم مراسم و سهم کنسلی قبل از اعمال حداقل تضمین." />
                  <SummaryCard label="کسری تا حداقل تضمین" value={formatIRR(preview.settlement.minimumGuaranteeShortfall)} source="اگر سهم محاسباتی کمتر از حداقل تضمین باشد، اختلاف اینجا نمایش داده می‌شود." strong={preview.settlement.minimumGuaranteeApplied} />
                </div>

                <div className="mt-4 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] p-4 text-center text-sm font-bold leading-7 text-[#17483f]">
                  مدل محاسبه: {ownerOperationModelLabels[preview.settlement.operationModel]} · سهم مراسم {toPersianDigits(preview.settlement.ownerRevenueSharePercent)}٪ · سهم کنسلی {toPersianDigits(preview.settlement.ownerCancellationSharePercent)}٪ · حداقل تضمین {formatIRR(preview.settlement.monthlyMinimumGuarantee)}
                </div>

                <OwnerSettlementDiagnosticPanel
                  rows={preview.settlement.diagnosticRows}
                  periodLabel={preview.period.label}
                />

                <form action={generateOwnerMonthlySettlementAction} className="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-[1.1rem] border border-[#d8c08b]/55 bg-white/58 p-3 sm:justify-end">
                  <input type="hidden" name="periodYear" value={period.year} />
                  <input type="hidden" name="periodMonth" value={period.month} />
                  {lockedExisting ? (
                    <Link href={`/dashboard/owner-settlements/${existingSettlement?.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#f1fbf5] px-4 text-sm font-black text-[#17483f]">
                      مشاهده گزارش قفل‌شده
                    </Link>
                  ) : (
                    <button className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#17483f]/15 bg-[#17483f] px-5 text-sm font-black text-[#fff8ea] shadow-[0_12px_30px_rgba(23,72,63,0.18)]">
                      <RefreshCw size={16} /> ساخت / به‌روزرسانی گزارش این ماه
                    </button>
                  )}
                </form>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-[#b45353]/28 bg-[#fff1f1] p-4 text-center text-sm font-black leading-7 text-[#8f2c2c]">
                پیش‌نمایش قابل محاسبه نیست، چون تنظیمات فعال مالک ثبت نشده است.
              </div>
            )}
          </div>

          <section className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d8c08b]/45 pb-3">
              <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]"><CheckCircle2 size={18} /> گزارش‌های ذخیره‌شده</h2>
              <p className="text-xs font-bold leading-6 text-[#7d6841]">گزارش‌های ساخته‌شده از اینجا برای مشاهده، تأیید یا پرداخت باز می‌شوند.</p>
            </div>
            <div className="mt-4 grid gap-3">
              {latestSettlements.length > 0 ? latestSettlements.map((settlement) => (
                <Link key={settlement.id} href={`/dashboard/owner-settlements/${settlement.id}`} className="grid gap-3 rounded-2xl border border-[#d8c08b]/58 bg-white/72 p-4 text-center transition hover:border-[#c7a15a] md:grid-cols-[1fr_9rem_10rem_8rem] md:items-center md:text-right">
                  <div>
                    <p className="font-black text-[#111827]">{settlement.periodLabel}</p>
                    <p className="mt-1 text-xs font-bold text-[#7d6841]">{formatPersianNumber(settlement.heldEventsCount)} مراسم · {formatPersianNumber(settlement.canceledEventsCount)} کنسلی</p>
                  </div>
                  <span className={`mx-auto w-fit rounded-full border px-3 py-1 text-xs font-black md:mx-0 ${getOwnerSettlementStatusStyle(settlement.status)}`}>{ownerSettlementStatusLabels[settlement.status]}</span>
                  <span className="text-sm font-black text-[#17483f]">{formatIRR(settlement.finalOwnerPayable.toString())}</span>
                  <span className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#7d6841] md:justify-end">جزئیات <ArrowLeft size={14} /></span>
                </Link>
              )) : (
                <p className="rounded-2xl border border-dashed border-[#d8c08b]/65 bg-white/65 p-5 text-center text-sm font-bold leading-7 text-[#6d5f49]">
                  هنوز گزارش ماهانه‌ای ذخیره نشده است. بعد از ساخت گزارش این ماه، خروجی ذخیره‌شده در همین بخش نمایش داده می‌شود.
                </p>
              )}
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}

function getOwnerSettlementErrorMessage(error: string) {
  if (error === "setting-required") return "تنظیمات فعال مالک برای ساخت گزارش لازم است.";
  if (error === "locked") return "این دوره قبلاً تأیید یا پرداخت شده و دیگر با پیش‌نویس جدید بازنویسی نمی‌شود.";
  if (error === "not-found") return "گزارش تسویه پیدا نشد.";
  return "عملیات انجام نشد و نیاز به بررسی دارد.";
}

function MetricCard({ icon: Icon, label, value, source, strong = false }: { icon: LucideIcon; label: string; value: string; source: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#17483f]/22 bg-[#f1fbf5]" : "border-[#d8c08b]/60 bg-white/72"}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={18} /></span>
        <p className="text-center text-xs font-black text-[#7d6841]">{label}</p>
      </div>
      <p className="mt-3 text-center text-lg font-black text-[#111827]">{value}</p>
      <DataSource>{source}</DataSource>
    </div>
  );
}

function SummaryCard({ label, value, source, strong = false }: { label: string; value: string; source: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1.15rem] border p-3 text-center ${strong ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#d8c08b]/60 bg-white/72 text-[#111827]"}`}>
      <p className="text-center text-xs font-black opacity-75">{label}</p>
      <p className="mt-2 text-center text-base font-black">{value}</p>
      <DataSource>{source}</DataSource>
    </div>
  );
}

function OwnerSettlementDiagnosticPanel({ rows, periodLabel }: { rows: OwnerSettlementDiagnosticRow[]; periodLabel: string }) {
  return (
    <div className="mt-4 rounded-[1.15rem] border border-[#d8c08b]/58 bg-white/58 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#d8c08b]/40 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-black text-[#111827]"><Info size={17} /> قراردادهای این دوره که هنوز وارد تسویه نشده‌اند</h3>
          <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
            این بخش فقط تشخیصی است؛ قرارداد خام مستقیم به مبلغ قابل پرداخت مالک اضافه نمی‌شود و فقط دلیل خروج هر قرارداد از تسویه را نشان می‌دهد.
          </p>
        </div>
        <span className="rounded-full border border-[#d8c08b]/64 bg-[#fff8ea] px-3 py-1.5 text-xs font-black text-[#7d6841]">
          {formatPersianNumber(rows.length)} مورد در {periodLabel}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {rows.map((row) => {
            const action = getDiagnosticAction(row);
            return (
              <Link key={`${row.contractId}-${row.reason}`} href={action.href} className="rounded-2xl border border-[#d8c08b]/52 bg-white/78 p-3 text-xs font-bold leading-6 text-[#111827] transition hover:border-[#c7a15a] hover:bg-[#fff8ea]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black text-[#111827]">{toPersianDigits(row.contractNo)} · {row.customerName}</p>
                    <p className="mt-1 text-[#6d5f49]">تاریخ مراسم: {row.eventDateLabel} · مبلغ قرارداد: {formatIRR(row.finalTotal)}</p>
                    <p className="mt-1 text-[#6d5f49]">فاکتور: {row.invoiceNo ? `${toPersianDigits(row.invoiceNo)} / ${row.invoiceStatus ?? "—"}` : "ندارد"} · تعیین تکلیف بعد از مراسم: {row.postEventStatus ?? "ثبت نشده"}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getOwnerSettlementDiagnosticReasonStyle(row.reason)}`}>{row.reasonLabel}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#d8c08b]/40 bg-[#fff9ee]/82 px-3 py-2 text-[#7d6841]">
                  <span>{row.settlementImpact}</span>
                  <span className="inline-flex items-center gap-1 rounded-xl border border-[#17483f]/18 bg-[#f1fbf5] px-2.5 py-1 text-[11px] font-black text-[#17483f]">اقدام: {action.label} <ArrowLeft size={13} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-center text-sm font-black leading-7 text-[#17483f]">
          برای این دوره قرارداد خارج از تسویه پیدا نشد.
        </p>
      )}
    </div>
  );
}

function DataSource({ children }: { children: ReactNode }) {
  return (
    <details className="group mt-3 rounded-2xl border border-[#d8c08b]/48 bg-white/58 px-3 py-2 text-center text-xs font-bold leading-6 text-[#6d5f49] open:bg-[#fff8ea]">
      <summary className="cursor-pointer list-none font-black text-[#7d6841] transition group-open:text-[#17483f]">منبع داده</summary>
      <p className="mt-2">{children}</p>
    </details>
  );
}

function InfoPanel({ icon: Icon, title, body, tone = "default" }: { icon: LucideIcon; title: string; body: string[]; tone?: "default" | "danger" }) {
  const toneClass = tone === "danger"
    ? "border-[#b45353]/20 bg-[#fff1f1]/92 text-[#8f2c2c]"
    : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#6d5f49]";

  return (
    <div className={`rounded-[1.25rem] border p-4 text-center text-xs font-bold leading-6 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${toneClass}`}>
      <p className="flex items-center justify-center gap-2 font-black text-[#111827]"><Icon size={16} /> {title}</p>
      <div className="mt-2 space-y-1">
        {body.map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "danger" | "success"; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-black leading-7 ${tone === "danger" ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]"}`}>
      {children}
    </div>
  );
}
