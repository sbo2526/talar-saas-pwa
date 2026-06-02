"use server";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import type { SecurityActionState } from "@/lib/actions/security-state";
import { requireTenantMember } from "@/lib/auth/session";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime } from "@/lib/date/jalali";
import { createNotificationLog } from "@/lib/notifications/notification-service";
import { dispatchOwnerNotification } from "@/lib/notifications/owner-notification-dispatcher";
import { getPrisma } from "@/lib/prisma";
import { changePasswordSchema } from "@/lib/validation/security";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";

function readChangePasswordForm(formData: FormData) {
  return {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");

  if (!domain) {
    return "ثبت نشده";
  }

  const visible = name.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function recordPasswordChangeSecurityEvent(input: {
  tenantId: string;
  tenantName: string;
  userName: string;
  userEmail: string;
}) {
  const nowLabel = formatJalaliDateTime(new Date());
  const title = "تغییر رمز عبور";
  const message = [
    "رویداد امنیتی",
    "",
    `عنوان: ${title}`,
    `کاربر: ${input.userName}`,
    `ایمیل: ${maskEmail(input.userEmail)}`,
    `زمان: ${nowLabel}`,
  ].join("\n");

  try {
    await dispatchOwnerNotification({
      tenantId: input.tenantId,
      eventType: "SECURITY_EVENT",
      variables: {
        tenantName: escapeTelegramHtml(input.tenantName),
        currentDateTime: escapeTelegramHtml(nowLabel),
        eventType: escapeTelegramHtml(title),
        userName: escapeTelegramHtml(input.userName),
        userEmail: escapeTelegramHtml(maskEmail(input.userEmail)),
      },
    });

    await createNotificationLog({
      tenantId: input.tenantId,
      channel: "TELEGRAM",
      eventType: "SECURITY_EVENT",
      recipient: null,
      recipientLabel: null,
      title,
      message,
      status: "SKIPPED",
      errorMessage: "رویداد امنیتی به سرویس اعلان مالک سپرده شد؛ کانال‌های غیرفعال خودشان نادیده گرفته می‌شوند.",
    });
  } catch {
    // Security activity logging is best-effort and must not expose or block password changes.
  }
}

export async function changePasswordAction(
  _previousState: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const membership = await requireTenantMember();
  const parsed = changePasswordSchema.safeParse(readChangePasswordForm(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات تغییر رمز عبور معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const user = await db.user.findUnique({
    where: { id: membership.userId },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return {
      ok: false,
      message: "برای این حساب، رمز عبور محلی قابل تغییر ثبت نشده است.",
    };
  }

  const currentPasswordIsValid = await compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordIsValid) {
    return {
      ok: false,
      message: "رمز عبور فعلی درست نیست.",
    };
  }

  const newPasswordMatchesExisting = await compare(
    parsed.data.newPassword,
    user.passwordHash,
  );

  if (newPasswordMatchesExisting) {
    return {
      ok: false,
      message: "رمز عبور جدید نباید با رمز عبور فعلی یکسان باشد.",
    };
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "SECURITY_CHANGE",
    entityType: "SECURITY",
    entityId: user.id,
    title: "تغییر رمز عبور",
    message: `رمز عبور حساب توسط ${getAuditActorName(membership.user)} تغییر کرد.`,
    metadata: { event: "PASSWORD_CHANGED", email: user.email },
    href: "/dashboard/settings/security",
  });

  await recordPasswordChangeSecurityEvent({
    tenantId: membership.tenantId,
    tenantName: membership.tenant.name,
    userName: user.name ?? user.email,
    userEmail: user.email,
  });

  revalidatePath("/dashboard/settings/security");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "رمز عبور با موفقیت تغییر کرد.",
  };
}

type CreatableTenantRole = Extract<UserRole, "OWNER" | "ADMIN" | "STAFF">;

const creatableTenantRoles: CreatableTenantRole[] = ["OWNER", "ADMIN", "STAFF"];

function readTenantUserForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim().slice(0, 120),
    email: String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 180),
    password: String(formData.get("password") ?? ""),
    role: String(formData.get("role") ?? "STAFF") as CreatableTenantRole,
  };
}

function isCreatableTenantRole(role: string): role is CreatableTenantRole {
  return creatableTenantRoles.includes(role as CreatableTenantRole);
}

function securityRedirect(code: string): never {
  redirect(`/dashboard/settings/security?createUser=${encodeURIComponent(code)}`);
}

export async function createTenantUserAction(formData: FormData) {
  const membership = await requireTenantPermission("users.manage");
  const values = readTenantUserForm(formData);

  if (!values.email || !values.email.includes("@") || values.password.length < 8 || !isCreatableTenantRole(values.role)) {
    securityRedirect("invalid");
  }

  const db = await getPrisma();
  const existingUser = await db.user.findUnique({
    where: { email: values.email },
    select: { id: true },
  });

  if (existingUser) {
    const existingMembership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId: membership.tenantId,
          userId: existingUser.id,
        },
      },
      select: { id: true },
    });

    if (existingMembership) {
      securityRedirect("already-member");
    }

    securityRedirect("email-exists");
  }

  const passwordHash = await hash(values.password, 12);
  const createdUser = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: values.name || null,
        email: values.email,
        passwordHash,
        status: "ACTIVE",
      },
      select: { id: true, name: true, email: true },
    });

    await tx.tenantMember.create({
      data: {
        tenantId: membership.tenantId,
        userId: user.id,
        role: values.role,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "SECURITY_USER_CREATED",
        entityType: "USER",
        entityId: user.id,
        title: "ساخت حساب کاربری فضای کاری",
        message: `حساب ${user.email} با نقش ${values.role} توسط ${getAuditActorName(membership.user)} ساخته شد.`,
        metadata: { role: values.role, taskId: "TALAR_OWNER_SETTINGS_ACCESS_AND_LEGACY_GATE_50" },
        href: "/dashboard/settings/security",
      },
    });

    return user;
  });

  await createNotificationLog({
    tenantId: membership.tenantId,
    channel: "TELEGRAM",
    eventType: "SECURITY_EVENT",
    recipient: null,
    recipientLabel: null,
    title: "ساخت حساب کاربری جدید",
    message: `حساب ${createdUser.email} با نقش ${values.role} توسط مالک ساخته شد.`,
    status: "SKIPPED",
    errorMessage: "این لاگ فقط برای ردگیری امنیتی داخلی ثبت شده و ارسال کانال خارجی انجام نشده است.",
  });

  revalidatePath("/dashboard/settings/security");
  revalidatePath("/dashboard/settings/activity");
  securityRedirect("created");
}

