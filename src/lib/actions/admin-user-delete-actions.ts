/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { rm } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isPlatformAdminUser, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildUserRedirect(userId: string, code: string) {
  return `/admin/users/${encodeURIComponent(userId)}?deleteError=${encodeURIComponent(code)}`;
}

function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

async function deleteTenantUploadDirectories(tenantIds: string[]) {
  const uploadsRoot = path.join(process.cwd(), "public", "uploads", "tenants");

  await Promise.all(
    tenantIds.map(async (tenantId) => {
      const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);
      if (!safeTenantId) return;

      const tenantUploadPath = path.resolve(uploadsRoot, safeTenantId);
      if (!tenantUploadPath.startsWith(uploadsRoot + path.sep)) return;

      try {
        await rm(tenantUploadPath, { recursive: true, force: true });
      } catch {
        // File cleanup is best-effort. The database deletion must not be rolled
        // back because a local upload file is already missing or storage is read-only.
      }
    }),
  );
}

async function deleteOwnedTenantData(tx: any, tenantIds: string[]) {
  if (tenantIds.length === 0) return;
  const tenantWhere = { tenantId: { in: tenantIds } };

  await tx.supportTicketAttachment.deleteMany({ where: tenantWhere });
  await tx.supportTicketMessage.deleteMany({ where: tenantWhere });
  await tx.supportTicket.deleteMany({ where: tenantWhere });

  await tx.paymentCheque.deleteMany({ where: tenantWhere });
  await tx.paymentInstallment.deleteMany({ where: tenantWhere });
  await tx.expenseCheque.deleteMany({ where: tenantWhere });
  await tx.contractLineItem.deleteMany({ where: tenantWhere });

  await tx.expense.deleteMany({ where: tenantWhere });
  await tx.payment.deleteMany({ where: tenantWhere });
  await tx.contract.deleteMany({ where: tenantWhere });
  await tx.customer.deleteMany({ where: tenantWhere });

  await tx.notificationLog.deleteMany({ where: tenantWhere });
  await tx.inAppNotification.deleteMany({ where: tenantWhere });
  await tx.notificationTemplate.deleteMany({ where: tenantWhere });
  await tx.auditLog.deleteMany({ where: tenantWhere });
  await tx.backupExportLog.deleteMany({ where: tenantWhere });
  await tx.calendarDayNote.deleteMany({ where: tenantWhere });

  await tx.telegramIntegrationSetting.deleteMany({ where: tenantWhere });
  await tx.smsIntegrationSetting.deleteMany({ where: tenantWhere });
  await tx.contractSetting.deleteMany({ where: tenantWhere });
  await tx.contractEventType.deleteMany({ where: tenantWhere });

  await tx.financialCategory.updateMany({ where: tenantWhere, data: { parentId: null } });
  await tx.financialCategory.deleteMany({ where: tenantWhere });

  await tx.paymentMethod.deleteMany({ where: tenantWhere });
  await tx.ceremonyPackage.deleteMany({ where: tenantWhere });
  await tx.menu.deleteMany({ where: tenantWhere });
  await tx.service.deleteMany({ where: tenantWhere });
  await tx.salon.deleteMany({ where: tenantWhere });
  await tx.hall.deleteMany({ where: tenantWhere });
  await tx.tenantHallProfile.deleteMany({ where: tenantWhere });

  await tx.subscription.deleteMany({ where: tenantWhere });
  await tx.demoAccess.deleteMany({ where: tenantWhere });
  await tx.tenantMember.deleteMany({ where: tenantWhere });
  await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
}

export async function deleteAdminUserCascadeAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const db = await getPrisma();
  const userId = getStringValue(formData, "userId");
  const confirmEmail = normalizeEmail(getStringValue(formData, "confirmEmail"));

  if (!userId) {
    redirect("/admin/users?deleteError=missing-user");
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      ownedTenants: { select: { id: true, name: true } },
      memberships: { select: { tenantId: true, role: true } },
    },
  });

  if (!target) {
    redirect("/admin/users?deleteError=user-not-found");
  }

  if (target.id === admin.id) {
    redirect(buildUserRedirect(target.id, "cannot-delete-self"));
  }

  if (await isPlatformAdminUser(target)) {
    redirect(buildUserRedirect(target.id, "cannot-delete-platform-admin"));
  }

  if (!confirmEmail || confirmEmail !== normalizeEmail(target.email)) {
    redirect(buildUserRedirect(target.id, "confirmation-mismatch"));
  }

  const ownedTenantIds = target.ownedTenants.map((tenant) => tenant.id);
  const memberTenantIds = Array.from(new Set(target.memberships.map((membership) => membership.tenantId)));
  const nonOwnedMemberTenantIds = memberTenantIds.filter((tenantId) => !ownedTenantIds.includes(tenantId));
  const userMessageIds = (
    await db.supportTicketMessage.findMany({
      where: { senderUserId: target.id },
      select: { id: true },
    })
  ).map((message) => message.id);

  await db.$transaction(async (tx) => {
    if (userMessageIds.length > 0) {
      await tx.supportTicketAttachment.deleteMany({ where: { messageId: { in: userMessageIds } } });
      await tx.supportTicketMessage.deleteMany({ where: { id: { in: userMessageIds } } });
    }

    await tx.supportTicket.deleteMany({ where: { createdByUserId: target.id } });
    await tx.inAppNotification.deleteMany({ where: { userId: target.id } });
    await tx.auditLog.deleteMany({ where: { userId: target.id } });
    await tx.tenantMember.deleteMany({ where: { userId: target.id, tenantId: { in: nonOwnedMemberTenantIds } } });

    await deleteOwnedTenantData(tx, ownedTenantIds);

    await tx.user.delete({ where: { id: target.id } });
  }, { maxWait: 10_000, timeout: 30_000 });

  await deleteTenantUploadDirectories(ownedTenantIds);

  revalidatePath("/admin/users");
  revalidatePath("/admin/tenants");
  revalidatePath("/admin/activity");
  revalidatePath("/admin/support");

  redirect(`/admin/users?deletedUser=1&deletedTenants=${ownedTenantIds.length}`);
}
