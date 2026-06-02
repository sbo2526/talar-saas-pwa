"use server";

import { revalidatePath } from "next/cache";
import type { NotificationTemplateActionState } from "@/lib/actions/notification-template-state";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getDefaultNotificationTemplate } from "@/lib/notifications/template-renderer";
import { getPrisma } from "@/lib/prisma";
import {
  notificationTemplateToggleSchema,
  notificationTemplateUpdateSchema,
} from "@/lib/validation/notification";
import { auditSettingsUpdate, auditToggle } from "@/lib/audit/audit-action-helpers";

type TemplateActionClient = {
  notificationTemplate: {
    findFirst(args: unknown): Promise<{
      id: string;
      tenantId: string;
      channel: string;
      eventType: string;
      title: string;
      body: string;
      isEnabled: boolean;
    } | null>;
    updateMany(args: unknown): Promise<unknown>;
  };
};

function booleanFromForm(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function revalidateTemplatePaths() {
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/message-templates");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  revalidatePath("/dashboard/settings/notification-logs");
}

export async function updateNotificationTemplateAction(
  _previousState: NotificationTemplateActionState,
  formData: FormData,
): Promise<NotificationTemplateActionState> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = notificationTemplateUpdateSchema.safeParse({
    templateId: formData.get("templateId"),
    title: formData.get("title"),
    body: formData.get("body"),
    isEnabled: booleanFromForm(formData, "isEnabled"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "اطلاعات قالب پیام معتبر نیست.",
    };
  }

  const db = (await getPrisma()) as unknown as TemplateActionClient;
  const existing = await db.notificationTemplate.findFirst({
    where: { id: parsed.data.templateId, tenantId: membership.tenantId },
    select: { id: true, tenantId: true, channel: true, eventType: true, title: true, body: true, isEnabled: true },
  });

  if (!existing) {
    return { ok: false, message: "قالب انتخاب‌شده معتبر نیست." };
  }

  const afterTemplate = {
    ...existing,
    title: parsed.data.title,
    body: parsed.data.body,
    isEnabled: parsed.data.isEnabled,
  };

  await db.notificationTemplate.updateMany({
    where: { id: existing.id, tenantId: membership.tenantId },
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      isEnabled: parsed.data.isEnabled,
    },
  });

  await auditSettingsUpdate({
    membership,
    entityType: "MESSAGE_TEMPLATE",
    entityId: existing.id,
    settingName: "قالب پیام",
    beforeData: existing,
    afterData: afterTemplate,
    href: `/dashboard/settings/message-templates/${existing.id}`,
  });

  revalidateTemplatePaths();
  revalidatePath("/dashboard/settings/activity");

  return { ok: true, message: "قالب پیام با موفقیت ذخیره شد." };
}

export async function toggleNotificationTemplateAction(formData: FormData): Promise<void> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = notificationTemplateToggleSchema.safeParse({ templateId: formData.get("templateId") });

  if (!parsed.success) {
    return;
  }

  const db = (await getPrisma()) as unknown as TemplateActionClient;
  const existing = await db.notificationTemplate.findFirst({
    where: { id: parsed.data.templateId, tenantId: membership.tenantId },
    select: { id: true, tenantId: true, channel: true, eventType: true, title: true, body: true, isEnabled: true },
  });

  if (!existing) {
    return;
  }

  const afterTemplate = { ...existing, isEnabled: !existing.isEnabled };

  await db.notificationTemplate.updateMany({
    where: { id: existing.id, tenantId: membership.tenantId },
    data: { isEnabled: !existing.isEnabled },
  });

  await auditToggle({
    membership,
    entityType: "MESSAGE_TEMPLATE",
    entityLabel: "قالب پیام",
    entityId: existing.id,
    recordLabel: existing.title,
    title: afterTemplate.isEnabled ? "فعال‌سازی قالب پیام" : "غیرفعال‌سازی قالب پیام",
    isActive: afterTemplate.isEnabled,
    beforeData: existing,
    afterData: afterTemplate,
    href: `/dashboard/settings/message-templates/${existing.id}`,
  });

  revalidateTemplatePaths();
  revalidatePath("/dashboard/settings/activity");
}

export async function resetNotificationTemplateAction(formData: FormData): Promise<void> {
  const membership = await requireTenantPermission("notifications.manage");
  const parsed = notificationTemplateToggleSchema.safeParse({ templateId: formData.get("templateId") });

  if (!parsed.success) {
    return;
  }

  const db = (await getPrisma()) as unknown as TemplateActionClient;
  const existing = await db.notificationTemplate.findFirst({
    where: { id: parsed.data.templateId, tenantId: membership.tenantId },
    select: { id: true, tenantId: true, channel: true, eventType: true, title: true, body: true, isEnabled: true },
  });

  if (!existing) {
    return;
  }

  const defaultTemplate = getDefaultNotificationTemplate(existing.channel, existing.eventType);

  if (!defaultTemplate) {
    return;
  }

  const afterTemplate = {
    ...existing,
    title: defaultTemplate.title,
    body: defaultTemplate.body,
    isEnabled: true,
  };

  await db.notificationTemplate.updateMany({
    where: { id: existing.id, tenantId: membership.tenantId },
    data: {
      title: defaultTemplate.title,
      body: defaultTemplate.body,
      isEnabled: true,
    },
  });

  await auditSettingsUpdate({
    membership,
    entityType: "MESSAGE_TEMPLATE",
    entityId: existing.id,
    settingName: "قالب پیام",
    beforeData: existing,
    afterData: afterTemplate,
    href: `/dashboard/settings/message-templates/${existing.id}`,
  });

  revalidateTemplatePaths();
  revalidatePath("/dashboard/settings/activity");
}
