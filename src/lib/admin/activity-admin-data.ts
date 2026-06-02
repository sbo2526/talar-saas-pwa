import { getPrisma } from "@/lib/prisma";
import { normalizeSearchParam } from "@/lib/admin/admin-utils";

export type AdminActivityParams = {
  q?: string;
  action?: string;
  entityType?: string;
  tenantId?: string;
};

export async function getAdminActivityPageData(params: AdminActivityParams) {
  const db = await getPrisma();
  const q = normalizeSearchParam(params.q);
  const where = {
    ...(params.action && params.action !== "all" ? { action: params.action } : {}),
    ...(params.entityType && params.entityType !== "all" ? { entityType: params.entityType } : {}),
    ...(params.tenantId && params.tenantId !== "all" ? { tenantId: params.tenantId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { message: { contains: q, mode: "insensitive" as const } },
            { entityId: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, tenants] = await Promise.all([
    db.auditLog.findMany({ where, take: 80, orderBy: { createdAt: "desc" }, include: { tenant: { select: { id: true, name: true } } } }),
    db.tenant.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return { items, tenants };
}
