"use server";

import { revalidatePath } from "next/cache";
import { requireTenantMember } from "@/lib/auth/session";
import { createNotificationLog, ensureDefaultNotificationTemplates } from "@/lib/notifications/notification-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { auditSettingsUpdate } from "@/lib/audit/audit-action-helpers";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

export async function ensureNotificationDefaultsAction() {
  const membership = await requireTenantMember();

  await ensureDefaultNotificationTemplates(membership.tenantId);

  await auditSettingsUpdate({
    membership,
    entityType: "NOTIFICATION_SETTING",
    settingName: "تنظیمات اعلان‌ها",
    afterData: { defaultsEnsured: true },
    href: "/dashboard/settings/message-templates",
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/message-templates");

  return {
    ok: true,
    message: "قالب‌های اعلان بررسی و آماده شدند.",
  };
}

export async function createTestNotificationLogAction() {
  const membership = await requireTenantMember();

  const notificationLog = await createNotificationLog({
    tenantId: membership.tenantId,
    channel: "TELEGRAM",
    eventType: "TEST_MESSAGE",
    title: "پیام تست",
    message: `پیام تست اعلان برای ${membership.tenant.name}`,
    recipientLabel: membership.tenant.name,
  });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "NOTIFICATION_SENT",
    entityType: "NOTIFICATION_SETTING",
    entityId: notificationLog.id,
    title: "ثبت پیام تست اعلان",
    message: `پیام تست اعلان توسط ${getAuditActorName(membership.user)} ثبت شد.`,
    afterData: notificationLog,
    href: "/dashboard/settings/notification-logs",
  });

  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "لاگ پیام تست بدون ارسال خارجی ثبت شد.",
  };
}
