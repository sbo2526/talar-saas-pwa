import { NextResponse } from "next/server";
import { requireTenantMember } from "@/lib/auth/session";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  getPaymentCsvRows,
  getReportFilters,
  getReportsData,
} from "@/lib/reports/analytics";
import { getReportsCsvFilename } from "@/lib/reports/date-ranges";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

function escapeCsvCell(value: string | number | null | undefined) {
  const cell = toPersianDigits(value ?? "");
  return `"${cell.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const membership = await requireTenantMember();
  const { searchParams } = new URL(request.url);
  const filters = getReportFilters(searchParams);
  const data = await getReportsData(membership.tenantId, filters);
  const csvRows = getPaymentCsvRows(data)
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
  const filename = getReportsCsvFilename();

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "EXPORT",
    entityType: "REPORT",
    title: "خروجی گزارش‌ها",
    message: `خروجی گزارش‌ها توسط ${getAuditActorName(membership.user)} دریافت شد.`,
    metadata: { fileName: filename, format: "CSV" },
    href: "/dashboard/reports",
  });

  return new NextResponse(`\uFEFF${csvRows}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
