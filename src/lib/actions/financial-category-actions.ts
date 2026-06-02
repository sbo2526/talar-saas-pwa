"use server";

import type { FinancialCategoryActionState } from "@/lib/actions/financial-category-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import {
  financialCategoryIdSchema,
  financialCategorySchema,
} from "@/lib/validation/financial-category";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseFinancialCategoryForm(formData: FormData) {
  return financialCategorySchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    type: formData.get("type"),
    parentId: formData.get("parentId"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
  });
}

function revalidateFinancialCategoryPaths() {
  revalidatePath("/dashboard/financial-categories");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/financial-categories");
}

async function assertParentBelongsToTenant(
  parentId: string | undefined,
  tenantId: string,
  currentId?: string,
) {
  if (!parentId) {
    return true;
  }

  if (currentId && parentId === currentId) {
    return false;
  }

  const db = await getPrisma();
  const parent = await db.financialCategory.findFirst({
    where: { id: parentId, tenantId },
    select: { id: true },
  });

  return Boolean(parent);
}

export async function createFinancialCategoryAction(
  _previousState: FinancialCategoryActionState,
  formData: FormData,
): Promise<FinancialCategoryActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = parseFinancialCategoryForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات دسته مالی معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const parentIsValid = await assertParentBelongsToTenant(
    parsed.data.parentId,
    membership.tenantId,
  );

  if (!parentIsValid) {
    return {
      ok: false,
      message:
        "دسته مادر انتخاب‌شده پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const db = await getPrisma();

  try {
    const created = await db.financialCategory.create({
      data: {
        tenantId: membership.tenantId,
        ...parsed.data,
      },
    });

    await auditCreate({
      membership,
      entityType: "FINANCIAL_CATEGORY",
      entityLabel: "دسته‌بندی مالی",
      entityId: created.id,
      recordLabel: created.title,
      title: "ثبت دسته‌بندی مالی",
      afterData: created,
      href: "/dashboard/financial-categories",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "دسته مالی با این نام، نوع یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ثبت دسته مالی با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateFinancialCategoryPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "دسته مالی با موفقیت ثبت شد.",
  };
}

export async function updateFinancialCategoryAction(
  _previousState: FinancialCategoryActionState,
  formData: FormData,
): Promise<FinancialCategoryActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const idParsed = financialCategoryIdSchema.safeParse({
    financialCategoryId: formData.get("financialCategoryId"),
  });
  const parsed = parseFinancialCategoryForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات دسته مالی معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const parentIsValid = await assertParentBelongsToTenant(
    parsed.data.parentId,
    membership.tenantId,
    idParsed.data.financialCategoryId,
  );

  if (!parentIsValid) {
    return {
      ok: false,
      message:
        "دسته مادر انتخاب‌شده معتبر نیست یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const db = await getPrisma();

  try {
    const current = await db.financialCategory.findFirst({
      where: { id: idParsed.data.financialCategoryId, tenantId: membership.tenantId },
    });

    if (!current) {
      return {
        ok: false,
        message:
          "دسته مالی مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
      };
    }

    const updated = await db.financialCategory.update({
      where: { id: current.id },
      data: parsed.data,
    });

    await auditUpdate({
      membership,
      entityType: "FINANCIAL_CATEGORY",
      entityLabel: "دسته‌بندی مالی",
      entityId: updated.id,
      recordLabel: updated.title,
      title: "ویرایش دسته‌بندی مالی",
      beforeData: current,
      afterData: updated,
      href: "/dashboard/financial-categories",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "دسته مالی با این نام، نوع یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات دسته مالی با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateFinancialCategoryPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تغییرات دسته مالی با موفقیت ذخیره شد.",
  };
}

export async function toggleFinancialCategoryStatusAction(
  _previousState: FinancialCategoryActionState,
  formData: FormData,
): Promise<FinancialCategoryActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = financialCategoryIdSchema.safeParse({
    financialCategoryId: formData.get("financialCategoryId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه دسته مالی معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const current = await db.financialCategory.findFirst({
    where: { id: parsed.data.financialCategoryId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message:
        "دسته مالی مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.financialCategory.update({
    where: { id: current.id },
    data: { isActive: nextStatus },
  });

  await auditToggle({
    membership,
    entityType: "FINANCIAL_CATEGORY",
    entityLabel: "دسته‌بندی مالی",
    entityId: updated.id,
    recordLabel: updated.title,
    title: nextStatus ? "فعال‌سازی دسته‌بندی مالی" : "غیرفعال‌سازی دسته‌بندی مالی",
    isActive: nextStatus,
    beforeData: current,
    afterData: updated,
    href: "/dashboard/financial-categories",
  });

  revalidateFinancialCategoryPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: nextStatus
      ? "دسته مالی دوباره فعال شد."
      : "دسته مالی غیرفعال شد و در ثبت‌های مالی جدید پیشنهاد نمی‌شود.",
  };
}
