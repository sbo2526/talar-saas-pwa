import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_OPTIONS,
} from "@/lib/audit/audit-taxonomy";

export {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_OPTIONS,
};

const SENSITIVE_KEY_PATTERN = /^(password|passwordHash|token|botToken|botTokenEncrypted|apiKey|apiKeyEncrypted|secret|session|cookie|authorization|privateKey|accessToken|refreshToken|otp|verificationCode)$/i;
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2_000;

export type CreateAuditLogInput = {
  tenantId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  message: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
  href?: string | null;
  request?: Request;
};

export type GetAuditLogsInput = {
  tenantId: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  query?: string;
  from?: Date | null;
  to?: Date | null;
  limit?: number;
  page?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeScalar(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…`
      : value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    value.constructor?.name === "Decimal"
  ) {
    return value.toString();
  }

  return value;
}

function sanitize(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  const scalar = normalizeScalar(value);
  if (scalar !== value) {
    return scalar;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return "[خلاصه‌شده]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitize(item, depth + 1));
  }

  if (!isRecord(value)) {
    return null;
  }

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      output[key] = "[حذف‌شده]";
      continue;
    }

    output[key] = sanitize(child, depth + 1);
  }

  return output;
}

export function sanitizeAuditPayload(data: unknown): unknown {
  return sanitize(data, 0);
}

function toAuditJson(data: unknown): Prisma.InputJsonValue | undefined {
  if (data === undefined) {
    return undefined;
  }

  return sanitizeAuditPayload(data) as Prisma.InputJsonValue;
}

function readIpAddress(request?: Request) {
  if (!request) {
    return null;
  }

  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  if (!input.tenantId || !input.action || !input.entityType) {
    return;
  }

  try {
    const db = await getPrisma();
    await db.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        title: input.title,
        message: input.message,
        beforeData: toAuditJson(input.beforeData),
        afterData: toAuditJson(input.afterData),
        metadata: toAuditJson(input.metadata),
        ipAddress: readIpAddress(input.request),
        userAgent: input.request?.headers.get("user-agent") ?? null,
        href: input.href ?? null,
      },
    });
  } catch (error) {
    console.error("Audit log write failed", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function getAuditLogs(input: GetAuditLogsInput) {
  const db = await getPrisma();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const page = Math.max(input.page ?? 1, 1);
  const where: Prisma.AuditLogWhereInput = {
    tenantId: input.tenantId,
  };

  if (input.entityType) {
    where.entityType = input.entityType;
  }

  if (input.entityId) {
    where.entityId = input.entityId;
  }

  if (input.action) {
    where.action = input.action;
  }

  if (input.userId) {
    where.userId = input.userId;
  }

  if (input.from || input.to) {
    where.createdAt = {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    };
  }

  if (input.query?.trim()) {
    const query = input.query.trim();
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { message: { contains: query, mode: "insensitive" } },
      { entityId: { contains: query, mode: "insensitive" } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const userIds = Array.from(new Set(logs.map((log) => log.userId).filter(Boolean))) as string[];
  const users = userIds.length
    ? await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));

  return {
    items: logs.map((log) => {
      const user = log.userId ? usersById.get(log.userId) : null;
      return {
        ...log,
        actorName: user?.name || user?.email || "سامانه",
        actionLabel: AUDIT_ACTION_LABELS[log.action] ?? log.action,
        entityLabel: AUDIT_ENTITY_LABELS[log.entityType] ?? log.entityType,
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function getEntityAuditLogs(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  limit?: number;
}) {
  const result = await getAuditLogs({
    tenantId: input.tenantId,
    entityType: input.entityType,
    entityId: input.entityId,
    limit: input.limit ?? 5,
    page: 1,
  });

  return result.items;
}
