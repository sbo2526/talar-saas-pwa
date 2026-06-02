import type { TenantMemberStatus } from "@prisma/client";
import {
  getTenantRoleLabel,
  isTenantRoleKey,
  tenantRoleKeys,
} from "@/lib/auth/tenant-permissions";

const tenantMemberStatusLabels: Record<TenantMemberStatus, string> = {
  ACTIVE: "فعال",
  INVITED: "دعوت‌شده",
  SUSPENDED: "غیرفعال",
};

export function getTenantMemberStatusLabel(status: TenantMemberStatus) {
  return tenantMemberStatusLabels[status];
}

export function getSelectableTenantRoles(currentRole: string) {
  if (currentRole === "OWNER") return tenantRoleKeys;
  return tenantRoleKeys.filter((role) => role !== "OWNER");
}

export function getTenantUserRoleLabel(role: string) {
  return isTenantRoleKey(role) ? getTenantRoleLabel(role) : role;
}
