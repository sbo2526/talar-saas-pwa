import { NextResponse } from "next/server";
import type { HallOperationModel, OwnerMonthlySettlementStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getOwnerControlReportsData, parseOwnerControlFilters } from "@/lib/owner-control/data";
import { operationModelCommercialLabels, settlementStatusCommercialLabels } from "@/lib/owner-control/options";
import { toNumber } from "@/lib/owner-settlements/rules";

type OwnerShareExportRow = {
  settlementYear: number;
  settlementMonth: number;
  hall: { name: string } | null;
  operationModelSnapshot: HallOperationModel;
  eventInvoiceBaseAmount: unknown;
  calculatedOwnerShareAmount: unknown;
  guaranteeShortfallAmount: unknown;
  fixedRentAmount: unknown;
  finalPayableToOwnerAmount: unknown;
  paidToOwnerAmount: unknown;
  remainingPayableAmount: unknown;
  status: OwnerMonthlySettlementStatus;
};

function escapeCsvCell(value: string | number | null | undefined) {
  const cell = toPersianDigits(value ?? "");
  return `"${String(cell).replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = await getOwnerControlReportsData(parseOwnerControlFilters(searchParams));
  const header = ["ماه", "تالار", "مدل", "پایه مراسم", "سهم مالک", "اجاره/تضمین", "قابل پرداخت", "پرداخت‌شده", "مانده", "وضعیت"];
  const ownerShareRows: OwnerShareExportRow[] = data.ownerShareRows;
  const rows = ownerShareRows.map((row) => [
    `${row.settlementYear}/${row.settlementMonth}`,
    row.hall?.name ?? "همه تالارها",
    operationModelCommercialLabels[row.operationModelSnapshot],
    formatIRR(toNumber(row.eventInvoiceBaseAmount)),
    formatIRR(toNumber(row.calculatedOwnerShareAmount)),
    formatIRR(toNumber(row.guaranteeShortfallAmount) + toNumber(row.fixedRentAmount)),
    formatIRR(toNumber(row.finalPayableToOwnerAmount)),
    formatIRR(toNumber(row.paidToOwnerAmount)),
    formatIRR(toNumber(row.remainingPayableAmount)),
    settlementStatusCommercialLabels[row.status],
  ]);
  const csv = [header, ...rows].map((row: Array<string | number | null | undefined>) => row.map(escapeCsvCell).join(",")).join("\n");
  const filename = `owner-control-reports-${new Date().toISOString().slice(0, 10)}.csv`;

  await createAuditLog({
    tenantId: data.membership.tenantId,
    userId: data.membership.userId,
    action: "EXPORT",
    entityType: "OWNER_CONTROL_REPORT",
    title: "خروجی گزارش کنترل مالک",
    message: `خروجی گزارش کنترل مالک توسط ${getAuditActorName(data.membership.user)} دریافت شد. ${formatJalaliDate(new Date())}`,
    metadata: { fileName: filename, format: "CSV", phase: "33" },
    href: "/dashboard/owner-control/reports",
  });

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
