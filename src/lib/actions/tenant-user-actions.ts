"use server";

import { hash } from "bcryptjs";
import type { TenantMemberStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { isTenantRoleKey } from "@/lib/auth/tenant-permissions";
import { getPrisma } from "@/lib/prisma";

const tenantUserManagementPath = "/dashboard/settings/users";

function cleanText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function normalizeEmail(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  return text ? text.toLowerCase() : null;
}

function normalizeRole(value: FormDataEntryValue | null): UserRole | null {
  const text = cleanText(value);
  if (!text || !isTenantRoleKey(text)) return null;
  return text as UserRole;
}

function normalizeStatus(value: FormDataEntryValue | null): TenantMemberStatus | null {
  const text = cleanText(value);
  if (text === "ACTIVE" || text === "INVITED" || text === "SUSPENDED") {
    return text;
  }

  return null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function redirectWithStatus(status: string): never {
  redirect(`${tenantUserManagementPath}?status=${status}`);
  throw new Error("NEXT_REDIRECT");
}

async function requireTenantOwnerForUserManagement() {
  const membership = await requireTenantMember();

  if (membership.role !== "OWNER") {
    redirectWithStatus("owner-only");
  }

  return membership;
}

export async function createTenantUserAction(formData: FormData) {
  const membership = await requireTenantOwnerForUserManagement();
  const db = await getPrisma();

  const name = cleanText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const phone = cleanText(formData.get("phone"));
  const password = cleanText(formData.get("password"));
  const role = normalizeRole(formData.get("role"));
  const title = cleanText(formData.get("title"));
  const status = normalizeStatus(formData.get("status")) ?? "ACTIVE";
  const mustChangePassword = formData.get("mustChangePassword") === "on";

  if (!name || !email || !password || !role) {
    redirectWithStatus("create-invalid");
  }

  if (password.length < 8) {
    redirectWithStatus("password-short");
  }

  if (role === "OWNER" && membership.role !== "OWNER") {
    redirectWithStatus("owner-role-forbidden");
  }

  const passwordHash = await hash(password, 12);

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        update: {
          name,
          phone: phone ?? undefined,
          passwordHash,
          status: "ACTIVE",
        },
        create: {
          name,
          email,
          phone,
          passwordHash,
          status: "ACTIVE",
        },
      });

      const existingMembership = await tx.tenantMember.findUnique({
        where: {
          tenantId_userId: {
            tenantId: membership.tenantId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        await tx.tenantMember.update({
          where: { id: existingMembership.id },
          data: {
            role,
            status,
            title,
            mustChangePassword,
            invitedByUserId: membership.userId,
          },
        });
      } else {
        await tx.tenantMember.create({
          data: {
            tenantId: membership.tenantId,
            userId: user.id,
            role,
            status,
            title,
            mustChangePassword,
            invitedByUserId: membership.userId,
          },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectWithStatus("duplicate-user");
    }

    redirectWithStatus("create-failed");
  }

  revalidatePath(tenantUserManagementPath);
  redirectWithStatus("created");
}

export async function updateTenantUserRoleAction(formData: FormData) {
  const membership = await requireTenantOwnerForUserManagement();
  const db = await getPrisma();

  const memberId = cleanText(formData.get("memberId"));
  const role = normalizeRole(formData.get("role"));
  const title = cleanText(formData.get("title"));

  if (!memberId || !role) {
    redirectWithStatus("update-invalid");
  }

  if (role === "OWNER" && membership.role !== "OWNER") {
    redirectWithStatus("owner-role-forbidden");
  }

  const targetMembership = await db.tenantMember.findFirst({
    where: {
      id: memberId,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  if (!targetMembership) {
    redirectWithStatus("member-not-found");
  }

  if (targetMembership.userId === membership.userId && targetMembership.role === "OWNER" && role !== "OWNER") {
    redirectWithStatus("self-owner-demotion-blocked");
  }

  await db.tenantMember.update({
    where: { id: targetMembership.id },
    data: {
      role,
      title,
    },
  });

  revalidatePath(tenantUserManagementPath);
  redirectWithStatus("updated");
}

export async function updateTenantUserStatusAction(formData: FormData) {
  const membership = await requireTenantOwnerForUserManagement();
  const db = await getPrisma();

  const memberId = cleanText(formData.get("memberId"));
  const status = normalizeStatus(formData.get("status"));

  if (!memberId || !status) {
    redirectWithStatus("status-invalid");
  }

  const targetMembership = await db.tenantMember.findFirst({
    where: {
      id: memberId,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  if (!targetMembership) {
    redirectWithStatus("member-not-found");
  }

  if (targetMembership.userId === membership.userId && status === "SUSPENDED") {
    redirectWithStatus("self-suspend-blocked");
  }

  if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
    redirectWithStatus("owner-status-forbidden");
  }

  await db.tenantMember.update({
    where: { id: targetMembership.id },
    data: { status },
  });

  revalidatePath(tenantUserManagementPath);
  redirectWithStatus("status-updated");
}

export async function resetTenantUserPasswordAction(formData: FormData) {
  const membership = await requireTenantOwnerForUserManagement();
  const db = await getPrisma();

  const memberId = cleanText(formData.get("memberId"));
  const password = cleanText(formData.get("password"));

  if (!memberId || !password) {
    redirectWithStatus("reset-invalid");
  }

  if (password.length < 8) {
    redirectWithStatus("password-short");
  }

  const targetMembership = await db.tenantMember.findFirst({
    where: {
      id: memberId,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
      userId: true,
      role: true,
    },
  });

  if (!targetMembership) {
    redirectWithStatus("member-not-found");
  }

  if (targetMembership.role === "OWNER" && membership.role !== "OWNER") {
    redirectWithStatus("owner-reset-forbidden");
  }

  const passwordHash = await hash(password, 12);

  await db.$transaction([
    db.user.update({
      where: { id: targetMembership.userId },
      data: {
        passwordHash,
        status: "ACTIVE",
      },
    }),
    db.tenantMember.update({
      where: { id: targetMembership.id },
      data: {
        status: "ACTIVE",
        mustChangePassword: true,
      },
    }),
  ]);

  revalidatePath(tenantUserManagementPath);
  redirectWithStatus("password-reset");
}

