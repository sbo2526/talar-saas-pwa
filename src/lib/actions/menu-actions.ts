"use server";

import type { MenuActionState } from "@/lib/actions/menu-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { menuIdSchema, menuSchema, quickMenuPriceSchema } from "@/lib/validation/menu";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseMenuForm(formData: FormData) {
  return menuSchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    category: formData.get("category"),
    pricingType: formData.get("pricingType"),
    unit: formData.get("unit"),
    pricePerGuest: formData.get("pricePerGuest"),
    basePrice: formData.get("basePrice"),
    minGuests: formData.get("minGuests"),
    maxGuests: formData.get("maxGuests"),
    sortOrder: formData.get("sortOrder"),
    includedItems: formData.get("includedItems"),
    description: formData.get("description"),
    notes: formData.get("notes"),
    isRecommended: formData.get("isRecommended") === "on",
    isTaxable: formData.get("isTaxable") === "on",
    allowPriceOverride: formData.get("allowPriceOverride") === "on",
    isActive: formData.get("isActive") === "on",
  });
}

function parseQuickPriceForm(formData: FormData) {
  return quickMenuPriceSchema.safeParse({
    pricePerGuest: formData.get("pricePerGuest"),
    basePrice: formData.get("basePrice"),
  });
}

function revalidateMenuPaths() {
  revalidatePath("/dashboard/menus");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/menus");
  revalidatePath("/dashboard/contracts/new");
}

export async function createMenuAction(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = parseMenuForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات آیتم معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const created = await db.menu.create({
      data: {
        tenantId: membership.tenantId,
        currency: "IRR",
        ...parsed.data,
        pricePerGuest: parsed.data.pricePerGuest ?? "0",
      },
    });

    await auditCreate({
      membership,
      entityType: "MENU",
      entityLabel: "منوی پذیرایی",
      entityId: created.id,
      recordLabel: created.title,
      title: "ثبت منوی پذیرایی",
      afterData: created,
      href: "/dashboard/menus",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "آیتمی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message: "ثبت آیتم با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateMenuPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "آیتم پذیرایی با موفقیت ثبت شد.",
  };
}

export async function updateMenuAction(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const idParsed = menuIdSchema.safeParse({
    menuId: formData.get("menuId"),
  });
  const parsed = parseMenuForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات آیتم معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const current = await db.menu.findFirst({
      where: { id: idParsed.data.menuId, tenantId: membership.tenantId },
    });

    if (!current) {
      return {
        ok: false,
        message: "آیتم مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
      };
    }

    const updated = await db.menu.update({
      where: { id: current.id },
      data: parsed.data,
    });

    await auditUpdate({
      membership,
      entityType: "MENU",
      entityLabel: "منوی پذیرایی",
      entityId: updated.id,
      recordLabel: updated.title,
      title: "ویرایش منوی پذیرایی",
      beforeData: current,
      afterData: updated,
      href: "/dashboard/menus",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "آیتمی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات آیتم با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateMenuPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تغییرات آیتم با موفقیت ذخیره شد.",
  };
}

export async function quickUpdateMenuPriceAction(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const idParsed = menuIdSchema.safeParse({
    menuId: formData.get("menuId"),
  });
  const parsed = parseQuickPriceForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "قیمت واردشده معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const current = await db.menu.findFirst({
    where: { id: idParsed.data.menuId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message: "آیتم مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.menu.update({
    where: { id: current.id },
    data: {
      pricePerGuest: parsed.data.pricePerGuest,
      basePrice: parsed.data.basePrice,
    },
  });

  await auditUpdate({
    membership,
    entityType: "MENU",
    entityLabel: "منوی پذیرایی",
    entityId: updated.id,
    recordLabel: updated.title,
    title: "به‌روزرسانی قیمت منوی پذیرایی",
    beforeData: current,
    afterData: updated,
    href: "/dashboard/menus",
  });

  revalidateMenuPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "قیمت آیتم برای قراردادهای جدید به‌روزرسانی شد.",
  };
}

export async function toggleMenuStatusAction(
  _previousState: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = menuIdSchema.safeParse({
    menuId: formData.get("menuId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه آیتم معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const current = await db.menu.findFirst({
    where: { id: parsed.data.menuId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message: "آیتم مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.menu.update({
    where: { id: current.id },
    data: { isActive: nextStatus },
  });

  await auditToggle({
    membership,
    entityType: "MENU",
    entityLabel: "منوی پذیرایی",
    entityId: updated.id,
    recordLabel: updated.title,
    title: nextStatus ? "فعال‌سازی منوی پذیرایی" : "غیرفعال‌سازی منوی پذیرایی",
    isActive: nextStatus,
    beforeData: current,
    afterData: updated,
    href: "/dashboard/menus",
  });

  revalidateMenuPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: nextStatus
      ? "آیتم دوباره برای قراردادهای جدید فعال شد."
      : "آیتم غیرفعال شد و در قراردادهای جدید نمایش داده نمی‌شود.",
  };
}
