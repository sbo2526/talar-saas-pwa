import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { OwnerSettlementPrintActions } from "@/components/dashboard/owner-settlements/owner-settlement-print-actions";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  getOwnerSettlementExportData,
  logOwnerSettlementExport,
  settlementPercentLabel,
} from "@/lib/owner-settlements/owner-settlement-export";

type PrintPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OwnerSettlementPrintPage({ params }: PrintPageProps) {
  const membership = await requireTenantPermission("owner.settlement.view");
  const { id } = await params;
  const data = await getOwnerSettlementExportData({ tenantId: membership.tenantId, settlementId: id });

  if (!data) {
    return notFound();
  }

  const exportData = data;

  await logOwnerSettlementExport({
    tenantId: membership.tenantId,
    actor: membership,
    data: exportData,
    format: "PRINT",
  });

  return (
    <section className="owner-settlement-print-route -mx-3 min-h-screen bg-[#ece5d8] px-3 py-4 text-[#111827] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 print:m-0 print:min-h-0 print:bg-white print:p-0">
      <OwnerSettlementPrintActions settlementId={exportData.id} />
      <article className="owner-settlement-print-page mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-[1.5rem] border border-[#8b6b2e] bg-[#fffdf8] p-5 shadow-[0_24px_80px_rgba(17,24,39,0.14)] print:min-h-0 print:rounded-none print:shadow-none">
        <header className="border-b-2 border-[#8b6b2e] pb-4 text-center">
          <p className="text-xs font-black tracking-[0.3em] text-[#8b6b2e]">OWNER MONTHLY SETTLEMENT</p>
          <h1 className="mt-2 text-2xl font-black text-[#111827]">گزارش تسویه ماهانه مالک</h1>
          <p className="mt-1 text-sm font-bold text-[#6d5f49]">{exportData.periodLabel} · وضعیت: {exportData.statusLabel}</p>
        </header>

        <section className="mt-4 grid gap-2 sm:grid-cols-4 print:grid-cols-4">
          <PrintMetric label="جمع فاکتورها" value={formatIRR(exportData.invoiceTotal)} />
          <PrintMetric label="کنسلی" value={formatIRR(exportData.cancellationIncomeTotal)} />
          <PrintMetric label="جمع سهم" value={formatIRR(exportData.calculatedOwnerShare)} />
          <PrintMetric label="قابل پرداخت" value={formatIRR(exportData.finalOwnerPayable)} strong />
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
          <PrintBox title="مشخصات قرارداد بهره‌برداری">
            <InfoRow label="مدل بهره‌برداری" value={exportData.operationModelLabel} />
            <InfoRow label="سهم مالک از مراسم" value={settlementPercentLabel(exportData.ownerRevenueSharePercent)} />
            <InfoRow label="سهم مالک از کنسلی" value={settlementPercentLabel(exportData.ownerCancellationSharePercent)} />
            <InfoRow label="حداقل تضمین ماهانه" value={formatIRR(exportData.monthlyMinimumGuarantee)} />
          </PrintBox>
          <PrintBox title="خلاصه محاسبه">
            <InfoRow label="مراسم برگزارشده" value={`${formatPersianNumber(exportData.heldEventsCount)} عدد`} />
            <InfoRow label="کنسلی/عدم برگزاری" value={`${formatPersianNumber(exportData.canceledEventsCount)} عدد`} />
            <InfoRow label="خدمات و نفرات اضافه" value={formatIRR(exportData.extraServicesTotal)} />
            <InfoRow label="کسری تا حداقل" value={formatIRR(exportData.minimumGuaranteeShortfall)} />
          </PrintBox>
        </section>

        <PrintTable
          title="فاکتورهای مراسم برگزارشده"
          headers={["قرارداد / مشتری", "شماره فاکتور", "تاریخ", "جمع", "اضافات"]}
          emptyText="فاکتور برگزارشده‌ای در این دوره ثبت نشده است."
          rows={exportData.invoiceRows.map((row) => [
            `${toPersianDigits(row.contractNo)} · ${row.customerName}`,
            toPersianDigits(row.invoiceNo),
            row.eventDateLabel,
            formatIRR(row.invoiceTotal),
            formatIRR(row.extraServicesTotal),
          ])}
        />

        <PrintTable
          title="کنسلی‌ها و عدم برگزاری"
          headers={["قرارداد / مشتری", "تاریخ", "درصد خسارت", "مبلغ خسارت", "هشدار"]}
          emptyText="کنسلی قابل محاسبه‌ای در این دوره ثبت نشده است."
          rows={exportData.cancellationRows.map((row) => [
            `${toPersianDigits(row.contractNo)} · ${row.customerName}`,
            row.eventDateLabel,
            `${formatPersianNumber(row.penaltyPercent)}٪`,
            formatIRR(row.penaltyAmount),
            row.ownerAuditWarning ?? "—",
          ])}
        />

        {exportData.auditNotes.length ? (
          <section className="mt-4 rounded-2xl border border-[#b45353]/25 bg-[#fff1f1] p-3 text-xs font-bold leading-6 text-[#8f2c2c] print:break-inside-avoid">
            <h2 className="text-sm font-black">یادداشت‌های حسابرسی</h2>
            <ul className="mt-2 list-disc space-y-1 pr-4">
              {exportData.auditNotes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          </section>
        ) : null}

        <footer className="mt-5 grid gap-3 border-t border-[#d8c08b] pt-4 text-xs font-bold text-[#6d5f49] sm:grid-cols-3 print:grid-cols-3">
          <InfoRow label="زمان ساخت گزارش" value={formatJalaliDateTime(exportData.generatedAt)} />
          <InfoRow label="زمان تأیید" value={formatJalaliDateTime(exportData.approvedAt)} />
          <InfoRow label="زمان پرداخت" value={formatJalaliDateTime(exportData.paidAt)} />
        </footer>
      </article>
    </section>
  );
}

function PrintMetric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center print:break-inside-avoid ${strong ? "border-[#17483f]/30 bg-[#f1fbf5]" : "border-[#d8c08b]/70 bg-white/76"}`}>
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function PrintBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#d8c08b]/70 bg-white/76 p-3 print:break-inside-avoid">
      <h2 className="text-sm font-black text-[#111827]">{title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#d8c08b]/35 py-1 last:border-b-0">
      <span className="text-[#7d6841]">{label}</span>
      <strong className="text-left text-[#111827]">{value}</strong>
    </div>
  );
}

function PrintTable({ title, headers, rows, emptyText }: { title: string; headers: string[]; rows: string[][]; emptyText: string }) {
  return (
    <section className="mt-4 print:break-inside-avoid">
      <h2 className="mb-2 text-sm font-black text-[#111827]">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-[#d8c08b]/70">
        <table className="w-full border-collapse bg-white/82 text-xs">
          <thead>
            <tr className="bg-[#17483f] text-[#fff8ea]">
              {headers.map((header) => <th key={header} className="px-2 py-2 text-right font-black">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="border-t border-[#d8c08b]/45">
                {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-2 py-2 align-top font-bold text-[#111827]">{cell}</td>)}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-3 text-center font-bold text-[#7d6841]">{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
