import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import {
  createAttachmentHeaders,
  createExportFileName,
  getFullBackupData,
  logBackupExport,
} from "@/lib/backups/export-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

function getBackupRecordCount(data: Awaited<ReturnType<typeof getFullBackupData>>) {
  return (
    data.customers.length +
    data.contracts.length +
    data.payments.length +
    data.expenses.length +
    data.baseDefinitions.halls.length +
    data.baseDefinitions.salons.length +
    data.baseDefinitions.services.length +
    data.baseDefinitions.menus.length +
    data.baseDefinitions.paymentMethods.length +
    data.baseDefinitions.financialCategories.length +
    data.notificationSettings.templates.length
  );
}

export async function GET() {
  const membership = await requireTenantPermission("backups.manage");
  const fileName = createExportFileName("نسخه-پشتیبان-تالار", "json");

  try {
    const data = await getFullBackupData(membership.tenantId);
    const recordCount = getBackupRecordCount(data);

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      recordCount,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_EXPORT",
      entityType: "BACKUP",
      title: "خروجی پشتیبان کامل",
      message: `خروجی پشتیبان کامل توسط ${getAuditActorName(membership.user)} دریافت شد.`,
      metadata: { type: "FULL_BACKUP", format: "JSON", fileName, recordCount },
      href: "/dashboard/settings/backups",
    });

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: createAttachmentHeaders(fileName, "application/json; charset=utf-8"),
    });
  } catch (error) {
    console.error("Full backup export failed", error);
    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: "خطا در تولید نسخه پشتیبان کامل",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_EXPORT",
      entityType: "BACKUP",
      title: "خطای خروجی پشتیبان کامل",
      message: `دریافت خروجی پشتیبان کامل توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { type: "FULL_BACKUP", format: "JSON", fileName, status: "FAILED" },
      href: "/dashboard/settings/backups",
    });

    return NextResponse.json(
      { message: "در تولید نسخه پشتیبان کامل خطایی رخ داد." },
      { status: 500 },
    );
  }
}
