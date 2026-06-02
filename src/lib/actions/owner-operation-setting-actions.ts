"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { parseDateLikeToDate, toLatinDigits } from "@/lib/date/jalali";
import {
  defaultOwnerOperationSetting,
  isValidOwnerOperationModel,
  isValidOwnerSettlementCycle,
} from "@/lib/owner-operation/owner-operation-settings";
import { getPrisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimalString(formData: FormData, key: string, fallback: string) {
  const raw = toLatinDigits(readString(formData, key)).replace(/[,،\s]/g, "");
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed.toFixed(2);
}

function readPercentString(formData: FormData, key: string, fallback: string) {
  const parsed = Number(readDecimalString(formData, key, fallback));
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.max(0, Math.min(100, parsed));
  return clamped.toFixed(2);
}

function readNote(formData: FormData) {
  const note = readString(formData, "note").slice(0, 900);
  return note || null;
}

type SerializableOwnerOperationSetting = {
  id: string;
  operationModel: string;
  ownerRevenueSharePercent: { toString(): string };
  ownerCancellationSharePercent: { toString(): string };
  monthlyMinimumGuarantee: { toString(): string };
  settlementCycle: string;
  effectiveFrom: Date;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
} | null;

function serializeOwnerOperationSetting(setting: SerializableOwnerOperationSetting) {
  if (!setting) return null;

  return {
    id: setting.id,
    operationModel: setting.operationModel,
    ownerRevenueSharePercent: setting.ownerRevenueSharePercent.toString(),
    ownerCancellationSharePercent: setting.ownerCancellationSharePercent.toString(),
    monthlyMinimumGuarantee: setting.monthlyMinimumGuarantee.toString(),
    settlementCycle: setting.settlementCycle,
    effectiveFrom: setting.effectiveFrom.toISOString(),
    isActive: setting.isActive,
    note: setting.note,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}

export async function saveOwnerOperationSettingAction(formData: FormData) {
  const membership = await requireTenantPermission("owner.settings.manage");
  const db = await getPrisma();

  const rawOperationModel = readString(formData, "operationModel");
  const operationModel = isValidOwnerOperationModel(rawOperationModel)
    ? rawOperationModel
    : defaultOwnerOperationSetting.operationModel;

  const rawSettlementCycle = readString(formData, "settlementCycle");
  const settlementCycle = isValidOwnerSettlementCycle(rawSettlementCycle)
    ? rawSettlementCycle
    : defaultOwnerOperationSetting.settlementCycle;

  const ownerRevenueSharePercent = readPercentString(
    formData,
    "ownerRevenueSharePercent",
    defaultOwnerOperationSetting.ownerRevenueSharePercent,
  );
  const ownerCancellationSharePercent = readPercentString(
    formData,
    "ownerCancellationSharePercent",
    defaultOwnerOperationSetting.ownerCancellationSharePercent,
  );
  const monthlyMinimumGuarantee = readDecimalString(
    formData,
    "monthlyMinimumGuarantee",
    defaultOwnerOperationSetting.monthlyMinimumGuarantee,
  );
  const isActive = readString(formData, "isActive") !== "OFF";
  const parsedEffectiveFrom = parseDateLikeToDate(readString(formData, "effectiveFrom"));
  const effectiveFrom = parsedEffectiveFrom ?? defaultOwnerOperationSetting.effectiveFrom;
  const note = readNote(formData);
  const beforeSetting = await db.ownerOperationSetting.findUnique({
    where: { tenantId: membership.tenantId },
  });
  const beforeJson = serializeOwnerOperationSetting(beforeSetting);
  const afterSetting = await db.$transaction(async (tx) => {
    const setting = await tx.ownerOperationSetting.upsert({
      where: { tenantId: membership.tenantId },
      update: {
        operationModel,
        ownerRevenueSharePercent,
        ownerCancellationSharePercent,
        monthlyMinimumGuarantee,
        settlementCycle,
        effectiveFrom,
        isActive,
        note,
      },
      create: {
        tenantId: membership.tenantId,
        operationModel,
        ownerRevenueSharePercent,
        ownerCancellationSharePercent,
        monthlyMinimumGuarantee,
        settlementCycle,
        effectiveFrom,
        isActive,
        note,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "OWNER_OPERATION_SETTING_UPDATED",
        entityType: "OWNER_OPERATION_SETTING",
        entityId: setting.id,
        title: "ثبت تنظیمات مالک و مدل بهره‌برداری تالار",
        message:
          "مدل بهره‌برداری تالار، سهم مالک از مراسم، سهم مالک از کنسلی و حداقل تضمین ماهانه ثبت شد.",
        beforeData: beforeJson ?? undefined,
        afterData: {
          id: setting.id,
          operationModel,
          ownerRevenueSharePercent,
          ownerCancellationSharePercent,
          monthlyMinimumGuarantee,
          settlementCycle,
          isActive,
          note,
          effectiveFrom: setting.effectiveFrom.toISOString(),
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_OWNER_OPERATION_MODEL_SETTINGS_32",
          ownerSettlementDeferredToPhase33: true,
          preventsHardcodedOwnerPercent: true,
          ownerOperationStartDateScope: effectiveFrom.toISOString(),
        } satisfies Prisma.InputJsonValue,
        href: "/dashboard/settings/owner-operation",
      },
    });

    return setting;
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard/settings/owner-operation");
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/invoices");

  redirect(`/dashboard/settings/owner-operation?saved=1&setting=${afterSetting.id}`);
}
