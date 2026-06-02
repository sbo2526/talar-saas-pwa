import type { TenantMember } from "@prisma/client";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { buildAuditMessage, getAuditActorName } from "@/lib/audit/audit-log-messages";

type AuditMember = Pick<TenantMember, "tenantId" | "userId"> & {
  user?: { name?: string | null; email?: string | null } | null;
};

export async function auditCreate(input: {
  membership: AuditMember;
  entityType: string;
  entityLabel: string;
  entityId: string;
  recordLabel?: string | null;
  title: string;
  afterData?: unknown;
  href?: string;
}) {
  const userName = getAuditActorName(input.membership.user);
  await createAuditLog({
    tenantId: input.membership.tenantId,
    userId: input.membership.userId,
    action: "CREATE",
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    message: buildAuditMessage({
      entityLabel: input.entityLabel,
      recordLabel: input.recordLabel,
      actionLabel: "ثبت",
      userName,
    }),
    afterData: input.afterData,
    href: input.href,
  });
}

export async function auditUpdate(input: {
  membership: AuditMember;
  action?: string;
  entityType: string;
  entityLabel: string;
  entityId: string;
  recordLabel?: string | null;
  title: string;
  actionLabel?: string;
  beforeData?: unknown;
  afterData?: unknown;
  href?: string;
}) {
  const userName = getAuditActorName(input.membership.user);
  await createAuditLog({
    tenantId: input.membership.tenantId,
    userId: input.membership.userId,
    action: input.action ?? "UPDATE",
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    message: buildAuditMessage({
      entityLabel: input.entityLabel,
      recordLabel: input.recordLabel,
      actionLabel: input.actionLabel ?? "ویرایش",
      userName,
    }),
    beforeData: input.beforeData,
    afterData: input.afterData,
    href: input.href,
  });
}

export async function auditToggle(input: {
  membership: AuditMember;
  entityType: string;
  entityLabel: string;
  entityId: string;
  recordLabel?: string | null;
  title: string;
  isActive: boolean;
  beforeData?: unknown;
  afterData?: unknown;
  href?: string;
}) {
  await auditUpdate({
    ...input,
    action: input.isActive ? "ENABLE" : "DISABLE",
    actionLabel: input.isActive ? "فعال‌سازی" : "غیرفعال‌سازی",
  });
}

export async function auditSettingsUpdate(input: {
  membership: AuditMember;
  entityType: string;
  entityId?: string | null;
  settingName: string;
  beforeData?: unknown;
  afterData?: unknown;
  href?: string;
}) {
  const userName = getAuditActorName(input.membership.user);
  await createAuditLog({
    tenantId: input.membership.tenantId,
    userId: input.membership.userId,
    action: "SETTINGS_UPDATE",
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    title: `به‌روزرسانی ${input.settingName}`,
    message: `${input.settingName} توسط ${userName} به‌روزرسانی شد.`,
    beforeData: input.beforeData,
    afterData: input.afterData,
    href: input.href,
  });
}
