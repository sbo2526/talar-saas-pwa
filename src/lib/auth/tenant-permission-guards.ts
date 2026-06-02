import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import {
  canTenantAccess,
  canTenantAccessAny,
  type TenantPermission,
} from "@/lib/auth/tenant-permissions";

export async function requireTenantPermission(permission: TenantPermission) {
  const membership = await requireTenantMember();

  if (!canTenantAccess(membership, permission)) {
    redirect("/dashboard?error=forbidden");
  }

  return membership;
}

export async function requireAnyTenantPermission(permissions: readonly TenantPermission[]) {
  const membership = await requireTenantMember();

  if (!canTenantAccessAny(membership, permissions)) {
    redirect("/dashboard?error=forbidden");
  }

  return membership;
}
