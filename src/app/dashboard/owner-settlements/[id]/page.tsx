import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Download,
  FileJson,
  HandCoins,
  Printer,
  ReceiptText,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  approveOwnerMonthlySettlementAction,
  markOwnerMonthlySettlementPaidAction,
} from "@/lib/actions/owner-monthly-settlement-actions";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { ownerOperationModelLabels } from "@/lib/owner-operation/owner-operation-settings";
import {
  getOwnerSettlementDiagnosticReasonStyle,
  getOwnerSettlementStatusStyle,
  ownerSettlementStatusLabels,
  type OwnerSettlementDiagnosticReason,
} from "@/lib/owner-settlements/owner-monthly-settlement";
import { getPrisma } from "@/lib/prisma";

type DetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generated?: string; approved?: string; paid?: string; error?: string }>;
};

type SettlementSnapshot = {
  invoiceRows?: Array<{
    invoiceId: string;
    invoiceNo: string;
    contractNo: string;
    customerName: string;
    eventDateLabel: string;
    invoiceTotal: number;
    extraServicesTotal: number;
  }>;
  cancellationRows?: Array<{
    contractId: string;
    contractNo: string;
    customerName: string;
    eventDateLabel: string;
    penaltyPercent: number;
    penaltyAmount: number;
    ownerAuditWarning?: string;
  }>;
  diagnosticRows?: Array<{
    contractId: string;
    contractNo: string;
    customerName: string;
    eventDateLabel: string;
    reason: OwnerSettlementDiagnosticReason;
    reasonLabel: string;
    finalTotal: number;
    invoiceNo?: string | null;
    invoiceStatus?: string | null;
    postEventStatus?: string | null;
    settlementImpact?: string;
  }>;
  auditNotes?: string[];
};

function normalizeSnapshot(value: unknown): SettlementSnapshot {
  if (!value || typeof value !== "object") return {};
  return value as SettlementSnapshot;
}

function getDiagnosticAction(row: NonNullable<SettlementSnapshot["diagnosticRows"]>[number]) {
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

export default async function OwnerSettlementDetailPage({ params, searchParams }: DetailProps) {
  const membership = await requireTenantPermission("owner.settlement.view");
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;
  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id, tenantId: membership.tenantId },
  });

  if (!settlement) {
    return <NotFound />;
  }

  const snapshot = normalizeSnapshot(settlement.snapshot);
  const invoiceRows = snapshot.invoiceRows ?? [];
  const cancellationRows = snapshot.cancellationRows ?? [];
  const diagnosticRows = snapshot.diagnosticRows ?? [];

  return (
    <section className="space-y-5 sm:space-y-7">
      {query.generated ? <Notice tone="success">گزارش تسویه ماهانه مالک ساخته شد.</Notice> : null}
      {query.approved ? <Notice tone="success">گزارش تسویه ماهانه مالک تأیید شد.</Notice> : null}
      {query.paid ? <Notice tone="success">پرداخت تسویه مالک ثبت شد.</Notice> : null}
      {query.error ? <Notice tone="danger">{getDetailErrorMessage(query.error)}</Notice> : null}
      {settlement.status === "APPROVED" || settlement.status === "PAID" ? (
        <Notice tone="success">این دوره مالی بسته شده است. Snapshot تسویه حفظ می‌شود و تغییرات مالی مرتبط با مراسم‌های همین ماه مسدود خواهد شد.</Notice>
      ) : null}

      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
                <HandCoins size={15} /> گزارش تسویه مالک
              </span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getOwnerSettlementStatusStyle(settlement.status)}`}>
                {ownerSettlementStatusLabels[settlement.status]}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">تسویه مالک برای {settlement.periodLabel}</h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              Snapshot این گزارش در زمان ساخت ذخیره شده است تا بعداً کسی با قیافه حق‌به‌جانب نگوید عددها خودشان تغییر کرده‌اند.
            </p>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Link href={`/dashboard/owner-settlements/${settlement.id}/print`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111827]/12 bg-[#111827] px-4 py-2.5 text-xs font-black text-[#fff8ea] transition hover:border-[#c7a15a] sm:text-sm">
              <Printer size={16} /> چاپ / PDF
            </Link>
            <Link href={`/api/dashboard/owner-settlements/${settlement.id}/export/csv`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <Download size={16} /> CSV
            </Link>
            <Link href={`/api/dashboard/owner-settlements/${settlement.id}/export/json`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <FileJson size={16} /> JSON
            </Link>
            <Link href={`/dashboard/owner-settlements?year=${settlement.periodYear}&month=${settlement.periodMonth}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <ArrowRight size={16} /> بازگشت
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="جمع فاکتورها" value={formatIRR(settlement.invoiceTotal.toString())} />
        <MetricCard icon={Ban} label="درآمد کنسلی" value={formatIRR(settlement.cancellationIncomeTotal.toString())} />
        <MetricCard icon={WalletCards} label="جمع سهم محاسباتی" value={formatIRR(settlement.calculatedOwnerShare.toString())} />
        <MetricCard icon={ShieldCheck} label="قابل پرداخت به مالک" value={formatIRR(settlement.finalOwnerPayable.toString())} strong />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <Panel title="فاکتورهای مراسم برگزارشده" icon={ReceiptText}>
            <div className="overflow-hidden rounded-2xl border border-[#d8c08b]/58">
              <div className="grid grid-cols-[1fr_8rem_9rem_9rem] gap-2 bg-[#17483f] px-3 py-2 text-xs font-black text-[#fff8ea]">
                <span>قرارداد / مشتری</span>
                <span>تاریخ مراسم</span>
                <span>جمع فاکتور</span>
                <span>اضافات</span>
              </div>
              {invoiceRows.length > 0 ? invoiceRows.map((row) => (
                <Link key={row.invoiceId} href={`/dashboard/invoices/${row.invoiceId}`} className="grid grid-cols-[1fr_8rem_9rem_9rem] gap-2 border-t border-[#d8c08b]/45 bg-white/72 px-3 py-2.5 text-xs font-bold text-[#111827] transition hover:bg-[#fff4d8]">
                  <span className="min-w-0 truncate">{toPersianDigits(row.contractNo)} · {row.customerName}</span>
                  <span>{row.eventDateLabel}</span>
                  <span className="font-black">{formatIRR(row.invoiceTotal)}</span>
                  <span>{formatIRR(row.extraServicesTotal)}</span>
                </Link>
              )) : (
                <p className="border-t border-[#d8c08b]/45 bg-white/72 p-4 text-sm font-bold text-[#7d6841]">فاکتور برگزارشده‌ای در این دوره ذخیره نشده است.</p>
              )}
            </div>
          </Panel>

          <Panel title="کنسلی‌ها و موارد عدم برگزاری" icon={Ban}>
            <div className="overflow-hidden rounded-2xl border border-[#d8c08b]/58">
              <div className="grid grid-cols-[1fr_8rem_7rem_9rem] gap-2 bg-[#8f2c2c] px-3 py-2 text-xs font-black text-white">
                <span>قرارداد / مشتری</span>
                <span>تاریخ مراسم</span>
                <span>درصد</span>
                <span>خسارت</span>
              </div>
              {cancellationRows.length > 0 ? cancellationRows.map((row) => (
                <Link key={row.contractId} href={`/dashboard/contracts/${row.contractId}`} className="grid grid-cols-[1fr_8rem_7rem_9rem] gap-2 border-t border-[#d8c08b]/45 bg-white/72 px-3 py-2.5 text-xs font-bold text-[#111827] transition hover:bg-[#fff1f1]">
                  <span className="min-w-0 truncate">{toPersianDigits(row.contractNo)} · {row.customerName}</span>
                  <span>{row.eventDateLabel}</span>
                  <span>{formatPersianNumber(row.penaltyPercent)}٪</span>
                  <span className="font-black">{formatIRR(row.penaltyAmount)}</span>
                </Link>
              )) : (
                <p className="border-t border-[#d8c08b]/45 bg-white/72 p-4 text-sm font-bold text-[#7d6841]">کنسلی یا عدم برگزاری قابل محاسبه‌ای در این دوره ذخیره نشده است.</p>
              )}
            </div>
          </Panel>

          <Panel title="قراردادهای تشخیصی خارج از تسویه" icon={CalendarDays}>
            {diagnosticRows.length > 0 ? (
              <div className="grid gap-3">
                {diagnosticRows.map((row) => {
                  const action = getDiagnosticAction(row);
                  return (
                    <Link key={`${row.contractId}-${row.reason}`} href={action.href} className="rounded-2xl border border-[#d8c08b]/55 bg-white/74 p-3 text-xs font-bold leading-6 text-[#111827] transition hover:border-[#c7a15a] hover:bg-[#fff8ea]">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black">{toPersianDigits(row.contractNo)} · {row.customerName}</p>
                          <p className="mt-1 text-[#6d5f49]">تاریخ مراسم: {row.eventDateLabel} · مبلغ قرارداد: {formatIRR(row.finalTotal)}</p>
                          <p className="mt-1 text-[#6d5f49]">فاکتور: {row.invoiceNo ? `${toPersianDigits(row.invoiceNo)} / ${row.invoiceStatus ?? "—"}` : "ندارد"} · تعیین تکلیف: {row.postEventStatus ?? "ثبت نشده"}</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getOwnerSettlementDiagnosticReasonStyle(row.reason)}`}>{row.reasonLabel}</span>
                      </div>
                      {row.settlementImpact ? <p className="mt-2 rounded-2xl border border-[#d8c08b]/40 bg-[#fff9ee]/82 px-3 py-2 text-[#7d6841]">{row.settlementImpact}</p> : null}
                      <span className="mt-2 inline-flex items-center gap-1 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-3 py-1.5 text-[11px] font-black text-[#17483f]">اقدام پیشنهادی: {action.label} <ArrowLeft size={13} /></span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-sm font-black leading-7 text-[#17483f]">قرارداد خارج از تسویه در snapshot این گزارش ثبت نشده است.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-3">
          <SummaryCard label="مدل بهره‌برداری" value={ownerOperationModelLabels[settlement.operationModel]} />
          <SummaryCard label="سهم مراسم" value={`${toPersianDigits(settlement.ownerRevenueSharePercent.toString())}٪`} />
          <SummaryCard label="سهم کنسلی" value={`${toPersianDigits(settlement.ownerCancellationSharePercent.toString())}٪`} />
          <SummaryCard label="حداقل تضمین" value={formatIRR(settlement.monthlyMinimumGuarantee.toString())} />
          <SummaryCard label="کسری تا حداقل" value={formatIRR(settlement.minimumGuaranteeShortfall.toString())} strong={settlement.minimumGuaranteeApplied} />
          <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="flex items-center gap-2 font-black text-[#111827]"><CalendarDays size={16} /> زمان‌ها</p>
            <p className="mt-2">ساخت: {formatJalaliDateTime(settlement.generatedAt)}</p>
            <p>تأیید: {formatJalaliDateTime(settlement.approvedAt)}</p>
            <p>پرداخت: {formatJalaliDateTime(settlement.paidAt)}</p>
          </div>
          {snapshot.auditNotes?.length ? (
            <div className="rounded-[1.25rem] border border-[#b45353]/20 bg-[#fff1f1]/92 p-4 text-xs font-bold leading-6 text-[#8f2c2c] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
              <p className="font-black">یادداشت‌های حسابرسی</p>
              <ul className="mt-2 list-disc space-y-1 pr-4">
                {snapshot.auditNotes.map((note) => <li key={note}>{note}</li>)}
              </ul>
            </div>
          ) : null}
          <SettlementActions id={settlement.id} status={settlement.status} />
        </aside>
      </section>
    </section>
  );
}

function SettlementActions({ id, status }: { id: string; status: "DRAFT" | "APPROVED" | "PAID" }) {
  if (status === "PAID") {
    return <Notice tone="success">این گزارش پرداخت شده و دوره مالی آن قفل است. تغییرات بعدی باید از مسیر مجاز و حسابرسی‌شده انجام شود.</Notice>;
  }

  return (
    <div className="space-y-2 rounded-[1.25rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 text-xs font-bold leading-6 text-[#17483f] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      {status === "DRAFT" ? (
        <form action={approveOwnerMonthlySettlementAction}>
          <input type="hidden" name="settlementId" value={id} />
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 text-sm font-black text-[#fff8ea]"><CheckCircle2 size={16} /> تأیید گزارش مالک</button>
        </form>
      ) : null}
      {status === "APPROVED" ? (
        <div className="rounded-2xl border border-[#17483f]/20 bg-white/70 p-3 text-xs font-black leading-6 text-[#17483f]">این دوره با تأیید مالک قفل شده است. ثبت پرداخت، قفل را حفظ می‌کند و فقط وضعیت پرداخت را نهایی می‌کند.</div>
      ) : null}
      {status === "APPROVED" ? (
        <form action={markOwnerMonthlySettlementPaidAction}>
          <input type="hidden" name="settlementId" value={id} />
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]"><WalletCards size={16} /> ثبت پرداخت به مالک</button>
        </form>
      ) : null}
    </div>
  );
}

function getDetailErrorMessage(error: string) {
  if (error === "not-draft") return "فقط گزارش پیش‌نویس قابل تأیید است.";
  if (error === "not-approved") return "فقط گزارش تأییدشده قابل پرداخت است.";
  return "عملیات انجام نشد و نیاز به بررسی دارد.";
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
    <div className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#17483f]/22 bg-[#f1fbf5]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95"}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="text-center text-xs font-black text-[#7d6841]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-center text-lg font-black text-[#111827]">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"}`}>
      <p className="text-center text-xs font-black opacity-75">{label}</p>
      <p className="mt-2 text-sm font-black leading-6">{value}</p>
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

function NotFound() {
  return (
    <section className="rounded-[1.5rem] border border-[#b45353]/22 bg-[#fff1f1] p-5 text-[#8f2c2c]">
      <h1 className="text-xl font-black">گزارش تسویه پیدا نشد.</h1>
      <Link href="/dashboard/owner-settlements" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/22 bg-white px-4 py-2 text-sm font-black">
        <ArrowRight size={16} /> بازگشت به تسویه مالک
      </Link>
    </section>
  );
}
