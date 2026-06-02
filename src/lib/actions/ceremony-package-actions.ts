"use server";

import type { CeremonyPackageActionState } from "@/lib/actions/ceremony-package-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";
import { getPrisma } from "@/lib/prisma";
import {
  ceremonyPackageIdSchema,
  ceremonyPackageSchema,
} from "@/lib/validation/ceremony-package";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parsePackageForm(formData: FormData) {
  return ceremonyPackageSchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    description: formData.get("description"),
    pricePerGuest: formData.get("pricePerGuest"),
    includedItemsNote: formData.get("includedItemsNote"),
    serviceIds: formData.getAll("serviceIds"),
    menuIds: formData.getAll("menuIds"),
    sortOrder: formData.get("sortOrder"),
    allowPriceOverride: formData.get("allowPriceOverride") === "on",
    isActive: formData.get("isActive") === "on",
  });
}

function revalidatePackagePaths() {
  revalidatePath("/dashboard/packages");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/packages");
  revalidatePath("/dashboard/contracts/new");
}

async function validateCatalogIds(tenantId: string, serviceIds: string[], menuIds: string[]) {
  const db = await getPrisma();
  const [serviceCount, menuCount] = await Promise.all([
    serviceIds.length ? db.service.count({ where: { tenantId, id: { in: serviceIds } } }) : Promise.resolve(0),
    menuIds.length ? db.menu.count({ where: { tenantId, id: { in: menuIds } } }) : Promise.resolve(0),
  ]);

  return serviceCount === serviceIds.length && menuCount === menuIds.length;
}

export async function createCeremonyPackageAction(
  _previousState: CeremonyPackageActionState,
  formData: FormData,
): Promise<CeremonyPackageActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = parsePackageForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات پکیج معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const validIds = await validateCatalogIds(
    membership.tenantId,
    parsed.data.serviceIds,
    parsed.data.menuIds,
  );

  if (!validIds) {
    return {
      ok: false,
      message: "برخی خدمات یا منوهای انتخاب‌شده معتبر نیستند.",
    };
  }

  const db = await getPrisma();

  try {
    const created = await db.ceremonyPackage.create({
      data: {
        tenantId: membership.tenantId,
        ...parsed.data,
        pricePerGuest: parsed.data.pricePerGuest ?? "0",
      },
    });

    await auditCreate({
      membership,
      entityType: "CEREMONY_PACKAGE",
      entityLabel: "پکیج اختصاصی مراسم",
      entityId: created.id,
      recordLabel: created.title,
      title: "ثبت پکیج اختصاصی مراسم",
      afterData: created,
      href: "/dashboard/packages",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "پکیجی با این نام یا کد داخلی قبلاً ثبت شده است.",
      };
    }

    return {
      ok: false,
      message: "ثبت پکیج با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidatePackagePaths();

  return { ok: true, message: "پکیج اختصاصی مراسم با موفقیت ثبت شد." };
}

export async function updateCeremonyPackageAction(
  _previousState: CeremonyPackageActionState,
  formData: FormData,
): Promise<CeremonyPackageActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const idParsed = ceremonyPackageIdSchema.safeParse({
    packageId: formData.get("packageId"),
  });
  const parsed = parsePackageForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات پکیج معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const validIds = await validateCatalogIds(
    membership.tenantId,
    parsed.data.serviceIds,
    parsed.data.menuIds,
  );

  if (!validIds) {
    return {
      ok: false,
      message: "برخی خدمات یا منوهای انتخاب‌شده معتبر نیستند.",
    };
  }

  const db = await getPrisma();

  try {
    const current = await db.ceremonyPackage.findFirst({
      where: { id: idParsed.data.packageId, tenantId: membership.tenantId },
    });

    if (!current) {
      return {
        ok: false,
        message: "پکیج مورد نظر پیدا نشد یا به فضای کاری فعلی تعلق ندارد.",
      };
    }

    const updated = await db.ceremonyPackage.update({
      where: { id: current.id },
      data: parsed.data,
    });

    await auditUpdate({
      membership,
      entityType: "CEREMONY_PACKAGE",
      entityLabel: "پکیج اختصاصی مراسم",
      entityId: updated.id,
      recordLabel: updated.title,
      title: "ویرایش پکیج اختصاصی مراسم",
      beforeData: current,
      afterData: updated,
      href: "/dashboard/packages",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "پکیجی با این نام یا کد داخلی قبلاً ثبت شده است.",
      };
    }

    return {
      ok: false,
      message: "ذخیره تغییرات پکیج با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidatePackagePaths();

  return { ok: true, message: "تغییرات پکیج با موفقیت ذخیره شد." };
}

export async function toggleCeremonyPackageStatusAction(
  _previousState: CeremonyPackageActionState,
  formData: FormData,
): Promise<CeremonyPackageActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = ceremonyPackageIdSchema.safeParse({
    packageId: formData.get("packageId"),
  });

  if (!parsed.success) {
    return { ok: false, message: "شناسه پکیج معتبر نیست." };
  }

  const db = await getPrisma();
  const current = await db.ceremonyPackage.findFirst({
    where: { id: parsed.data.packageId, tenantId: membership.tenantId },
  });

  if (!current) {
    return { ok: false, message: "پکیج مورد نظر پیدا نشد." };
  }

  const updated = await db.ceremonyPackage.update({
    where: { id: current.id },
    data: { isActive: !current.isActive },
  });

  await auditToggle({
    membership,
    entityType: "CEREMONY_PACKAGE",
    entityLabel: "پکیج اختصاصی مراسم",
    entityId: updated.id,
    recordLabel: updated.title,
    title: updated.isActive ? "فعال‌سازی پکیج اختصاصی" : "غیرفعال‌سازی پکیج اختصاصی",
    isActive: updated.isActive,
    beforeData: current,
    afterData: updated,
    href: "/dashboard/packages",
  });

  revalidatePackagePaths();

  return {
    ok: true,
    message: updated.isActive ? "پکیج فعال شد." : "پکیج غیرفعال شد.",
  };
}
