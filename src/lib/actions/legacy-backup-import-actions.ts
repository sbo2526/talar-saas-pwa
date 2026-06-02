"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { logBackupExport } from "@/lib/backups/export-service";
import { importLegacySqliteBackup } from "@/lib/backups/legacy-sqlite-import";
import { reviewFullBackupJsonFile } from "@/lib/backups/full-backup-review";
import { importFullBackupJsonFile } from "@/lib/backups/full-backup-restore";

const MAX_BACKUP_FILE_SIZE = 25 * 1024 * 1024;

function buildRedirectUrl(params: Record<string, string | number>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, String(value));
  });
  return `/dashboard/settings/backups?${searchParams.toString()}`;
}

function getSafeErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "خطای ناشناخته هنگام بازگردانی بکاپ.";
  }

  if (error.message === "INVALID_SQLITE_FILE") {
    return "فایل انتخاب‌شده دیتابیس SQLite معتبر نیست.";
  }

  if (error.message === "LEGACY_CUSTOMERS_TABLE_MISSING") {
    return "در فایل بکاپ، جدول مراسم‌های نرم‌افزار قدیمی پیدا نشد.";
  }

  if (error.message === "NO_IMPORTABLE_LEGACY_CONTRACTS") {
    return "هیچ مراسم قابل ایمپورتی در فایل بکاپ پیدا نشد.";
  }

  if (error.message === "INVALID_FULL_BACKUP_JSON") {
    return "فایل انتخاب‌شده JSON معتبر نیست.";
  }

  if (error.message === "INVALID_FULL_BACKUP_JSON_ROOT") {
    return "ساختار فایل پشتیبان کامل قابل شناسایی نیست.";
  }

  if (error.message === "UNSUPPORTED_FULL_BACKUP_JSON_APP") {
    return "این فایل، خروجی کامل رسمی سامانه تالار نیست.";
  }

  return "بازگردانی بکاپ ناموفق بود. فایل یا ساختار اطلاعات را بررسی کنید.";
}


export async function reviewFullBackupJsonAction(formData: FormData) {
  const membership = await requireTenantPermission("backups.manage");
  const file = formData.get("fullBackupReviewFile");

  if (!(file instanceof File) || file.size <= 0) {
    redirect(buildRedirectUrl({ review: "failed", message: "فایل پشتیبان کامل JSON را انتخاب کنید." }));
  }

  if (file.size > MAX_BACKUP_FILE_SIZE) {
    redirect(buildRedirectUrl({ review: "failed", message: "حجم فایل پشتیبان بیشتر از حد مجاز است." }));
  }

  const fileName = file.name || "full-backup.json";
  let redirectTarget = buildRedirectUrl({ review: "failed", message: "بازبینی فایل پشتیبان ناموفق بود." });

  try {
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const result = await reviewFullBackupJsonFile({
      tenantId: membership.tenantId,
      fileBytes,
    });

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP_REVIEW",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      recordCount:
        result.customerCount +
        result.contractCount +
        result.paymentCount +
        result.expenseCount +
        result.hallCount +
        result.salonCount +
        result.serviceCount +
        result.menuCount,
      status: "COMPLETED",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_REVIEW",
      entityType: "BACKUP",
      title: "بازبینی فایل پشتیبان کامل",
      message: `فایل پشتیبان کامل توسط ${getAuditActorName(membership.user)} بازبینی شد.`,
      metadata: {
        fileName,
        appName: result.appName,
        tenantName: result.tenantName,
        exportedAtJalali: result.exportedAtJalali,
        customerCount: result.customerCount,
        contractCount: result.contractCount,
        paymentCount: result.paymentCount,
        expenseCount: result.expenseCount,
        totalContractAmount: result.totalContractAmount,
        totalPaymentAmount: result.totalPaymentAmount,
        warnings: result.warnings,
      },
      href: "/dashboard/settings/backups",
    });

    revalidatePath("/dashboard/settings/backups");

    redirectTarget = buildRedirectUrl({
      review: result.warnings.length > 0 ? "warning" : "completed",
      tenantName: result.tenantName,
      exportedAt: result.exportedAtJalali,
      customers: result.customerCount,
      contracts: result.contractCount,
      payments: result.paymentCount,
      expenses: result.expenseCount,
      halls: result.hallCount,
      salons: result.salonCount,
      services: result.serviceCount,
      menus: result.menuCount,
      lineItems: result.contractLineItemCount,
      reserved: result.reservedContracts,
      completed: result.completedContracts,
      canceled: result.canceledContracts,
      totalContracts: result.totalContractAmount,
      totalPayments: result.totalPaymentAmount,
      sameTenant: result.sameTenantId ? "yes" : "no",
      warnings: result.warnings.length,
    });
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP_REVIEW",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: message,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_REVIEW",
      entityType: "BACKUP",
      title: "خطای بازبینی فایل پشتیبان کامل",
      message: `بازبینی فایل پشتیبان کامل توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { fileName, status: "FAILED", message },
      href: "/dashboard/settings/backups",
    });

    redirectTarget = buildRedirectUrl({ review: "failed", message });
  }

  redirect(redirectTarget);
}


export async function restoreFullBackupJsonAction(formData: FormData) {
  const membership = await requireTenantPermission("backups.manage");
  const file = formData.get("fullBackupRestoreFile");
  const confirmation = String(formData.get("confirmFullBackupRestore") ?? "");

  if (confirmation !== "RESTORE_FULL_BACKUP_JSON") {
    redirect(buildRedirectUrl({
      restore: "failed",
      message: "برای بازیابی واقعی باید تأیید کنترل‌شده را فعال کنید.",
    }));
  }

  if (!(file instanceof File) || file.size <= 0) {
    redirect(buildRedirectUrl({ restore: "failed", message: "فایل JSON نسخه پشتیبان کامل را انتخاب کنید." }));
  }

  if (file.size > MAX_BACKUP_FILE_SIZE) {
    redirect(buildRedirectUrl({ restore: "failed", message: "حجم فایل پشتیبان بیشتر از حد مجاز است." }));
  }

  const fileName = file.name || "full-backup.json";
  let redirectTarget = buildRedirectUrl({ restore: "failed", message: "بازیابی کنترل‌شده JSON ناموفق بود." });

  try {
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const result = await importFullBackupJsonFile({
      tenantId: membership.tenantId,
      userId: membership.userId,
      fileBytes,
      fileName,
    });

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP_RESTORE",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      recordCount:
        result.importedCustomers +
        result.importedContracts +
        result.importedLineItems +
        result.importedPayments +
        result.importedExpenses +
        result.importedBaseDefinitions,
      status: result.warnings.length > 0 ? "REVIEW_REQUIRED" : "COMPLETED",
      errorMessage: result.warnings.length > 0 ? result.warnings.join(" | ") : undefined,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_RESTORE",
      entityType: "BACKUP",
      title: "بازیابی کنترل‌شده JSON پشتیبان کامل",
      message: `بازیابی کنترل‌شده JSON پشتیبان کامل توسط ${getAuditActorName(membership.user)} انجام شد.`,
      metadata: {
        fileName,
        importedCustomers: result.importedCustomers,
        importedContracts: result.importedContracts,
        importedLineItems: result.importedLineItems,
        importedPayments: result.importedPayments,
        importedExpenses: result.importedExpenses,
        importedBaseDefinitions: result.importedBaseDefinitions,
        updatedRecords: result.updatedRecords,
        skippedRows: result.skippedRows,
        duplicateRows: result.duplicateRows,
        warnings: result.warnings,
      },
      href: "/dashboard/settings/backups",
    });

    revalidatePath("/dashboard/settings/backups");
    revalidatePath("/dashboard/contracts");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/expenses");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/reports");

    redirectTarget = buildRedirectUrl({
      restore: result.warnings.length > 0 ? "review" : "completed",
      imported: result.importedContracts,
      customers: result.importedCustomers,
      payments: result.importedPayments,
      skipped: result.skippedRows,
      duplicates: result.duplicateRows,
    });
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "FULL_BACKUP_RESTORE",
      format: "JSON",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: message,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_RESTORE_FAILED",
      entityType: "BACKUP",
      title: "خطای بازیابی JSON پشتیبان کامل",
      message: `بازیابی کنترل‌شده JSON پشتیبان کامل توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { fileName, message },
      href: "/dashboard/settings/backups",
    });

    redirectTarget = buildRedirectUrl({ restore: "failed", message });
  }

  redirect(redirectTarget);
}


export async function importLegacyBackupAction(formData: FormData) {
  const membership = await requireTenantPermission("backups.manage");
  const file = formData.get("legacyBackupFile");

  if (!(file instanceof File) || file.size <= 0) {
    redirect(buildRedirectUrl({ restore: "failed", message: "فایل بکاپ را انتخاب کنید." }));
  }

  if (file.size > MAX_BACKUP_FILE_SIZE) {
    redirect(buildRedirectUrl({ restore: "failed", message: "حجم فایل بکاپ بیشتر از حد مجاز است." }));
  }

  const fileName = file.name || "legacy-backup.db";
  let redirectTarget = buildRedirectUrl({ restore: "failed", message: "بازگردانی بکاپ ناموفق بود." });

  try {
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const result = await importLegacySqliteBackup({
      tenantId: membership.tenantId,
      userId: membership.userId,
      fileBytes,
      fileName,
    });

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "LEGACY_SQLITE_IMPORT",
      format: "SQLITE",
      fileName,
      requestedBy: membership.userId,
      recordCount: result.importedContracts,
      status: "COMPLETED",
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_RESTORE",
      entityType: "BACKUP",
      title: "بازگردانی بکاپ نرم‌افزار قدیمی",
      message: `بازگردانی بکاپ قدیمی توسط ${getAuditActorName(membership.user)} انجام شد.`,
      metadata: {
        fileName,
        totalRows: result.totalRows,
        importedContracts: result.importedContracts,
        importedCustomers: result.importedCustomers,
        importedPayments: result.importedPayments,
        skippedRows: result.skippedRows,
        duplicateRows: result.duplicateRows,
        warnings: result.warnings,
      },
      href: "/dashboard/settings/backups",
    });

    revalidatePath("/dashboard/settings/backups");
    revalidatePath("/dashboard/contracts");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/reports");

    redirectTarget = buildRedirectUrl({
      restore: result.skippedRows > 0 ? "review" : "completed",
      imported: result.importedContracts,
      customers: result.importedCustomers,
      payments: result.importedPayments,
      skipped: result.skippedRows,
      duplicates: result.duplicateRows,
    });
  } catch (error) {
    const message = getSafeErrorMessage(error);

    await logBackupExport({
      tenantId: membership.tenantId,
      type: "LEGACY_SQLITE_IMPORT",
      format: "SQLITE",
      fileName,
      requestedBy: membership.userId,
      status: "FAILED",
      errorMessage: message,
    });

    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "BACKUP_RESTORE_FAILED",
      entityType: "BACKUP",
      title: "خطای بازگردانی بکاپ نرم‌افزار قدیمی",
      message: `بازگردانی بکاپ قدیمی توسط ${getAuditActorName(membership.user)} ناموفق بود.`,
      metadata: { fileName, message },
      href: "/dashboard/settings/backups",
    });

    redirectTarget = buildRedirectUrl({ restore: "failed", message });
  }

  redirect(redirectTarget);
}
