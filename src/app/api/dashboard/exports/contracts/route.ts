import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toCsv, withUtf8Bom } from "@/lib/backups/csv";
import {
  createAttachmentHeaders,
  createExportFileName,
  getContractsExportData,
  logBackupExport,
} from "@/lib/backups/export-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

export async function GET() {
  const membership = await requireTenantPermission("reports.view");
  const fileName = createExportFileName("قراردادها", "csv");

  try {
    const { headers, rows } = await getContractsExportData(membership.tenantId);
    const csv = withUtf8Bom(toCsv(rows, headers));

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "CONTRACTS",
      format: "CSV",
      fileName,
      requestedBy: membership.userId,
      recordCount: rows.length,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPORT",
      entityType: "BACKUP",
      title: "خروجی قراردادها",
      message: `خروجی قراردادها توسط ${getAuditActorName(membership.user)} دریافت شد.`,
      metadata: { type: "CONTRACTS", format: "CSV", fileName, recordCount: rows.length },
      href: "/dashboard/settings/backups",
    });

    return new NextResponse(csv, {
      headers: createAttachmentHeaders(fileName, "text/csv; charset=utf-8"),
    });
  } catch (error) {
    console.error("Contracts export failed", error);
    await logBackupExport({
      tenantId: membership.tenantId,
      type: "CONTRACTS",
      format: "CSV",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: "خطا در تولید خروجی قراردادها",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPORT",
      entityType: "BACKUP",
      title: "خطای خروجی قراردادها",
      message: `دریافت خروجی قراردادها توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { type: "CONTRACTS", format: "CSV", fileName, status: "FAILED" },
      href: "/dashboard/settings/backups",
    });

    return NextResponse.json(
      { message: "در تولید خروجی قراردادها خطایی رخ داد." },
      { status: 500 },
    );
  }
}
