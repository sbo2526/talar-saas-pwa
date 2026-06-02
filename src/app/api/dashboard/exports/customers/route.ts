import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toCsv, withUtf8Bom } from "@/lib/backups/csv";
import {
  createAttachmentHeaders,
  createExportFileName,
  getCustomersExportData,
  logBackupExport,
} from "@/lib/backups/export-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

export async function GET() {
  const membership = await requireTenantPermission("reports.view");
  const fileName = createExportFileName("مشتریان", "csv");

  try {
    const { headers, rows } = await getCustomersExportData(membership.tenantId);
    const csv = withUtf8Bom(toCsv(rows, headers));

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "CUSTOMERS",
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
      title: "خروجی مشتریان",
      message: `خروجی مشتریان توسط ${getAuditActorName(membership.user)} دریافت شد.`,
      metadata: { type: "CUSTOMERS", format: "CSV", fileName, recordCount: rows.length },
      href: "/dashboard/settings/backups",
    });

    return new NextResponse(csv, {
      headers: createAttachmentHeaders(fileName, "text/csv; charset=utf-8"),
    });
  } catch (error) {
    console.error("Customers export failed", error);
    await logBackupExport({
      tenantId: membership.tenantId,
      type: "CUSTOMERS",
      format: "CSV",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: "خطا در تولید خروجی مشتریان",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPORT",
      entityType: "BACKUP",
      title: "خطای خروجی مشتریان",
      message: `دریافت خروجی مشتریان توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { type: "CUSTOMERS", format: "CSV", fileName, status: "FAILED" },
      href: "/dashboard/settings/backups",
    });

    return NextResponse.json(
      { message: "در تولید خروجی مشتریان خطایی رخ داد." },
      { status: 500 },
    );
  }
}
