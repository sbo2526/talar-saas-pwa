import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import {
  createAttachmentHeaders,
  createExportFileName,
  logBackupExport,
} from "@/lib/backups/export-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { toPersianDigits } from "@/lib/date/jalali";
import {
  getPaymentCsvRows,
  getReportFilters,
  getReportsData,
} from "@/lib/reports/analytics";

function escapeCsvCell(value: string | number | null | undefined) {
  const cell = toPersianDigits(value ?? "");
  return `"${cell.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const membership = await requireTenantPermission("reports.financial.view");
  const fileName = createExportFileName("گزارش-مالی", "csv");

  try {
    const { searchParams } = new URL(request.url);
    const filters = getReportFilters(searchParams);
    const data = await getReportsData(membership.tenantId, filters);
    const rows = getPaymentCsvRows(data);
    const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FINANCIAL_REPORT",
      format: "CSV",
      fileName,
      requestedBy: membership.userId,
      recordCount: Math.max(0, rows.length - 1),
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPORT",
      entityType: "BACKUP",
      title: "خروجی گزارش مالی",
      message: `خروجی گزارش مالی توسط ${getAuditActorName(membership.user)} دریافت شد.`,
      metadata: { type: "FINANCIAL", format: "CSV", fileName, recordCount: rows.length },
      href: "/dashboard/settings/backups",
    });

    return new NextResponse(`\uFEFF${csv}`, {
      headers: createAttachmentHeaders(fileName, "text/csv; charset=utf-8"),
    });
  } catch (error) {
    console.error("Financial report export failed", error);
    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FINANCIAL_REPORT",
      format: "CSV",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: "خطا در تولید خروجی گزارش مالی",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPORT",
      entityType: "BACKUP",
      title: "خطای خروجی گزارش مالی",
      message: `دریافت خروجی گزارش مالی توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { type: "FINANCIAL", format: "CSV", fileName, status: "FAILED" },
      href: "/dashboard/settings/backups",
    });

    return NextResponse.json(
      { message: "در تولید خروجی گزارش مالی خطایی رخ داد." },
      { status: 500 },
    );
  }
}
