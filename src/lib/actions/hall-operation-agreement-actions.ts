"use server";

import type { HallOperationAgreementActionState } from "@/lib/actions/hall-operation-agreement-state";
import { revalidatePath } from "next/cache";
import { auditSettingsUpdate } from "@/lib/audit/audit-action-helpers";
import { requireTenantRole } from "@/lib/auth/session";
import { buildOperationAgreementSummary } from "@/lib/hall-operation-agreement/options";
import { getPrisma } from "@/lib/prisma";
import { hallOperationAgreementSchema } from "@/lib/validation/hall-operation-agreement";

function parseAgreementForm(formData: FormData) {
  return hallOperationAgreementSchema.safeParse({
    agreementId: formData.get("agreementId"),
    hallId: formData.get("hallId"),
    operationModel: formData.get("operationModel"),
    ownerName: formData.get("ownerName"),
    operatorName: formData.get("operatorName"),
    agreementTitle: formData.get("agreementTitle"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: formData.get("effectiveTo"),
    status: formData.get("status"),
    ownerEventSharePercent: formData.get("ownerEventSharePercent"),
    ownerCancellationSharePercent: formData.get("ownerCancellationSharePercent"),
    ownerExtraServiceSharePercent: formData.get("ownerExtraServiceSharePercent"),
    includeExtraServicesInOwnerShare: formData.get("includeExtraServicesInOwnerShare") === "on",
    monthlyMinimumGuaranteeAmount: formData.get("monthlyMinimumGuaranteeAmount"),
    monthlyFixedRentAmount: formData.get("monthlyFixedRentAmount"),
    settlementCycle: formData.get("settlementCycle"),
    settlementDayOfMonth: formData.get("settlementDayOfMonth"),
    offInvoiceIncomePolicy: formData.get("offInvoiceIncomePolicy"),
    notes: formData.get("notes"),
  });
}

function revalidateAgreementPaths() {
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/operation-agreement");
  revalidatePath("/dashboard/settings");
}

export async function saveHallOperationAgreementAction(
  _previousState: HallOperationAgreementActionState,
  formData: FormData,
): Promise<HallOperationAgreementActionState> {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const parsed = parseAgreementForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "تنظیمات مدل بهره‌برداری معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();
  const input = parsed.data;
  const ownerName = input.ownerName;

  if (!ownerName) {
    return {
      ok: false,
      message: "نام مالک الزامی است.",
    };
  }

  if (input.hallId) {
    const hallExists = await db.hall.count({
      where: { id: input.hallId, tenantId: membership.tenantId },
    });

    if (hallExists !== 1) {
      return {
        ok: false,
        message: "تالار انتخاب‌شده به فضای کاری فعلی تعلق ندارد.",
      };
    }
  }

  try {
    const beforeAgreement = input.agreementId
      ? await db.hallOperationAgreement.findFirst({
          where: { id: input.agreementId, tenantId: membership.tenantId },
        })
      : null;

    if (input.agreementId && !beforeAgreement) {
      return {
        ok: false,
        message: "توافق بهره‌برداری مورد نظر پیدا نشد یا به این فضای کاری تعلق ندارد.",
      };
    }

    const data = {
      hallId: input.hallId ?? null,
      operationModel: input.operationModel,
      ownerName,
      operatorName: input.operatorName ?? null,
      agreementTitle: input.agreementTitle ?? null,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      status: input.status,
      ownerEventSharePercent: input.ownerEventSharePercent ?? null,
      ownerCancellationSharePercent: input.ownerCancellationSharePercent ?? null,
      ownerExtraServiceSharePercent: input.ownerExtraServiceSharePercent ?? null,
      includeExtraServicesInOwnerShare: input.includeExtraServicesInOwnerShare,
      monthlyMinimumGuaranteeAmount: input.monthlyMinimumGuaranteeAmount ?? null,
      monthlyFixedRentAmount: input.monthlyFixedRentAmount ?? null,
      settlementCycle: input.settlementCycle,
      settlementDayOfMonth: input.settlementDayOfMonth ?? null,
      offInvoiceIncomePolicy: input.offInvoiceIncomePolicy,
      notes: input.notes ?? null,
    };

    const afterAgreement = beforeAgreement
      ? await db.hallOperationAgreement.update({
          where: { id: beforeAgreement.id },
          data,
        })
      : await db.hallOperationAgreement.create({
          data: {
            tenantId: membership.tenantId,
            ...data,
          },
        });

    if (afterAgreement.status === "ACTIVE") {
      await db.hallOperationAgreement.updateMany({
        where: {
          tenantId: membership.tenantId,
          id: { not: afterAgreement.id },
          hallId: afterAgreement.hallId,
          status: "ACTIVE",
        },
        data: { status: "INACTIVE" },
      });
    }

    await auditSettingsUpdate({
      membership,
      entityType: "HALL_OPERATION_AGREEMENT",
      entityId: afterAgreement.id,
      settingName: "مدل بهره‌برداری و سهم مالک",
      beforeData: beforeAgreement,
      afterData: afterAgreement,
      href: "/dashboard/base/operation-agreement",
    });

    revalidateAgreementPaths();

    return {
      ok: true,
      message: `مدل بهره‌برداری و سهم مالک ذخیره شد. ${buildOperationAgreementSummary({
        operationModel: afterAgreement.operationModel,
        ownerEventSharePercent: afterAgreement.ownerEventSharePercent?.toString(),
        ownerCancellationSharePercent: afterAgreement.ownerCancellationSharePercent?.toString(),
        ownerExtraServiceSharePercent: afterAgreement.ownerExtraServiceSharePercent?.toString(),
        includeExtraServicesInOwnerShare: afterAgreement.includeExtraServicesInOwnerShare,
        monthlyMinimumGuaranteeAmount: afterAgreement.monthlyMinimumGuaranteeAmount?.toString(),
        monthlyFixedRentAmount: afterAgreement.monthlyFixedRentAmount?.toString(),
        offInvoiceIncomePolicy: afterAgreement.offInvoiceIncomePolicy,
      })}`,
    };
  } catch {
    return {
      ok: false,
      message:
        "ذخیره مدل بهره‌برداری با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }
}
