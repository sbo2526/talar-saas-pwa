export const tenantRoleKeys = [
  "OWNER",
  "ADMIN",
  "STAFF",
  "ACCOUNTANT",
  "PARTNER",
  "TENANT_OPERATOR",
  "RECEPTION",
  "VIEWER",
] as const;

export type TenantRoleKey = (typeof tenantRoleKeys)[number];

export const tenantMemberStatusKeys = ["ACTIVE", "INVITED", "SUSPENDED"] as const;

export type TenantMemberLifecycleStatus = (typeof tenantMemberStatusKeys)[number];

export const tenantPermissionKeys = [
  "dashboard.view",
  "users.view",
  "users.manage",
  "users.reset_password",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "contracts.view",
  "contracts.create",
  "contracts.edit",
  "contracts.delete",
  "contracts.status.manage",
  "calendar.view",
  "calendar.manage",
  "payments.view",
  "payments.create",
  "payments.edit",
  "payments.delete",
  "invoices.view",
  "invoices.create",
  "invoices.adjust",
  "invoices.owner_approval",
  "expenses.view",
  "expenses.create",
  "expenses.edit",
  "expenses.delete",
  "reports.view",
  "reports.financial.view",
  "owner.settings.view",
  "owner.settings.manage",
  "owner.financial.view",
  "owner.settlement.view",
  "owner.settlement.manage",
  "owner.audit.view",
  "settings.view",
  "settings.manage",
  "packages.manage",
  "payment_methods.manage",
  "notifications.manage",
  "backups.manage",
] as const;

export type TenantPermission = (typeof tenantPermissionKeys)[number];

export type TenantPermissionOverrideValue = boolean | "allow" | "deny";

export type TenantPermissionOverrides =
  | Partial<Record<TenantPermission, TenantPermissionOverrideValue>>
  | {
      allow?: TenantPermission[];
      deny?: TenantPermission[];
    };

export type TenantPermissionMemberLike = {
  role: string;
  status?: string | null;
  permissionsOverride?: unknown;
};

export const tenantRoleLabels: Record<TenantRoleKey, string> = {
  OWNER: "مالک",
  ADMIN: "مدیر تالار",
  STAFF: "کارمند",
  ACCOUNTANT: "حسابدار",
  PARTNER: "شریک",
  TENANT_OPERATOR: "مستاجر / بهره‌بردار",
  RECEPTION: "پذیرش",
  VIEWER: "مشاهده‌گر",
};

export const ownerAuthorityPermissions = [
  "owner.settings.view",
  "owner.settings.manage",
  "owner.financial.view",
  "owner.settlement.view",
  "owner.settlement.manage",
  "owner.audit.view",
] as const satisfies readonly TenantPermission[];

export const operationalPermissions = [
  "customers.view",
  "contracts.view",
  "calendar.view",
  "payments.view",
  "invoices.view",
  "expenses.view",
  "reports.view",
] as const satisfies readonly TenantPermission[];

export const settingsPermissions = [
  "settings.view",
  "settings.manage",
  "packages.manage",
  "payment_methods.manage",
  "notifications.manage",
  "backups.manage",
] as const satisfies readonly TenantPermission[];

export const defaultTenantRolePermissions: Record<TenantRoleKey, readonly TenantPermission[]> = {
  OWNER: tenantPermissionKeys,
  ADMIN: [
    "dashboard.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "contracts.view",
    "contracts.create",
    "contracts.edit",
    "contracts.status.manage",
    "calendar.view",
    "calendar.manage",
    "payments.view",
    "payments.create",
    "invoices.view",
    "invoices.create",
    "expenses.view",
    "expenses.create",
    "reports.view",
    "reports.financial.view",
    "owner.financial.view",
    "owner.settlement.view",
    "owner.audit.view",
    "settings.view",
    "packages.manage",
    "payment_methods.manage",
    "notifications.manage",
  ],
  STAFF: [
    "dashboard.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "contracts.view",
    "contracts.create",
    "contracts.edit",
    "calendar.view",
    "calendar.manage",
    "payments.view",
    "payments.create",
    "invoices.view",
    "reports.view",
  ],
  ACCOUNTANT: [
    "dashboard.view",
    "contracts.view",
    "payments.view",
    "payments.create",
    "payments.edit",
    "invoices.view",
    "invoices.create",
    "invoices.adjust",
    "expenses.view",
    "expenses.create",
    "expenses.edit",
    "reports.view",
    "reports.financial.view",
    "owner.audit.view",
    "payment_methods.manage",
  ],
  PARTNER: [
    "dashboard.view",
    "contracts.view",
    "calendar.view",
    "invoices.view",
    "reports.view",
    "reports.financial.view",
    "owner.financial.view",
    "owner.settlement.view",
  ],
  TENANT_OPERATOR: [
    "dashboard.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "contracts.view",
    "contracts.create",
    "contracts.edit",
    "contracts.status.manage",
    "calendar.view",
    "calendar.manage",
    "payments.view",
    "payments.create",
    "invoices.view",
    "expenses.view",
    "expenses.create",
    "packages.manage",
    "reports.view",
  ],
  RECEPTION: [
    "dashboard.view",
    "customers.view",
    "customers.create",
    "customers.edit",
    "contracts.view",
    "contracts.create",
    "calendar.view",
    "calendar.manage",
  ],
  VIEWER: [
    "dashboard.view",
    "customers.view",
    "contracts.view",
    "calendar.view",
    "payments.view",
    "invoices.view",
    "expenses.view",
    "reports.view",
  ],
};

export function isTenantRoleKey(value: string): value is TenantRoleKey {
  return tenantRoleKeys.includes(value as TenantRoleKey);
}

export function isTenantPermission(value: string): value is TenantPermission {
  return tenantPermissionKeys.includes(value as TenantPermission);
}

export function getTenantRoleLabel(role: string) {
  return isTenantRoleKey(role) ? tenantRoleLabels[role] : role;
}

export function getTenantMemberLifecycleStatus(
  member: Pick<TenantPermissionMemberLike, "status">,
): TenantMemberLifecycleStatus {
  if (member.status === "INVITED" || member.status === "SUSPENDED") {
    return member.status;
  }

  return "ACTIVE";
}

export function getDefaultTenantRolePermissions(role: string): readonly TenantPermission[] {
  if (isTenantRoleKey(role)) {
    return defaultTenantRolePermissions[role];
  }

  return defaultTenantRolePermissions.VIEWER;
}

export function normalizeTenantPermissionOverrides(
  value: unknown,
): Partial<Record<TenantPermission, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: Partial<Record<TenantPermission, boolean>> = {};
  const record = value as Record<string, unknown>;

  if (Array.isArray(record.allow)) {
    for (const item of record.allow) {
      if (typeof item === "string" && isTenantPermission(item)) {
        normalized[item] = true;
      }
    }
  }

  if (Array.isArray(record.deny)) {
    for (const item of record.deny) {
      if (typeof item === "string" && isTenantPermission(item)) {
        normalized[item] = false;
      }
    }
  }

  for (const [key, raw] of Object.entries(record)) {
    if (!isTenantPermission(key)) continue;

    if (raw === true || raw === "allow") {
      normalized[key] = true;
    } else if (raw === false || raw === "deny") {
      normalized[key] = false;
    }
  }

  return normalized;
}

export function getTenantPermissionSet(member: TenantPermissionMemberLike) {
  if (getTenantMemberLifecycleStatus(member) !== "ACTIVE") {
    return new Set<TenantPermission>();
  }

  const permissionSet = new Set<TenantPermission>(
    getDefaultTenantRolePermissions(member.role),
  );
  const overrides = normalizeTenantPermissionOverrides(member.permissionsOverride);

  for (const [permission, allowed] of Object.entries(overrides)) {
    if (!isTenantPermission(permission)) continue;

    if (allowed) {
      permissionSet.add(permission);
    } else {
      permissionSet.delete(permission);
    }
  }

  return permissionSet;
}

export function canTenantAccess(
  member: TenantPermissionMemberLike | null | undefined,
  permission: TenantPermission,
) {
  if (!member) return false;

  return getTenantPermissionSet(member).has(permission);
}

export function canTenantAccessAny(
  member: TenantPermissionMemberLike | null | undefined,
  permissions: readonly TenantPermission[],
) {
  if (!member) return false;

  const permissionSet = getTenantPermissionSet(member);

  return permissions.some((permission) => permissionSet.has(permission));
}

export function canSeeOwnerAuthorityGroup(member: TenantPermissionMemberLike | null | undefined) {
  return canTenantAccessAny(member, ownerAuthorityPermissions);
}

export function canSeeOperationalGroup(member: TenantPermissionMemberLike | null | undefined) {
  return canTenantAccessAny(member, operationalPermissions);
}

export function canSeeSettingsGroup(member: TenantPermissionMemberLike | null | undefined) {
  return canTenantAccessAny(member, settingsPermissions);
}
