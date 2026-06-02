import {
  canTenantAccess,
  type TenantPermissionMemberLike,
} from "@/lib/auth/tenant-permissions";

export function canManageHallInfo(
  member: TenantPermissionMemberLike | null | undefined,
) {
  if (!member) return false;

  if (member.role === "OWNER" || member.role === "ADMIN") {
    return true;
  }

  return canTenantAccess(member, "settings.manage");
}
