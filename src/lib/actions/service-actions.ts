"use server";

import type { ServiceActionState } from "@/lib/actions/service-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { quickServicePriceSchema, serviceIdSchema, serviceSchema } from "@/lib/validation/service";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    category: formData.get("category"),
    pricingType: formData.get("pricingType"),
    unit: formData.get("unit"),
    price: formData.get("price"),
    basePrice: formData.get("basePrice"),
    sortOrder: formData.get("sortOrder"),
    description: formData.get("description"),
    notes: formData.get("notes"),
    isRequired: formData.get("isRequired") === "on",
    allowPriceOverride: formData.get("allowPriceOverride") === "on",
    isActive: formData.get("isActive") === "on",
  });
}

function parseQuickPriceForm(formData: FormData) {
  return quickServicePriceSchema.safeParse({
    price: formData.get("price"),
    basePrice: formData.get("basePrice"),
  });
}

function revalidateServicePaths() {
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/services");
  revalidatePath("/dashboard/contracts/new");
}

export async function createServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = parseServiceForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات خدمت معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const created = await db.service.create({
      data: {
        tenantId: membership.tenantId,
        ...parsed.data,
        price: parsed.data.price ?? "0",
      },
    });

    await auditCreate({
      membership,
      entityType: "SERVICE",
      entityLabel: "خدمات مراسم",
      entityId: created.id,
      recordLabel: created.title,
      title: "ثبت خدمت مراسم",
      afterData: created,
      href: "/dashboard/services",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "خدمتی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message: "ثبت خدمت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateServicePaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "خدمت با موفقیت ثبت شد.",
  };
}

export async function updateServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const idParsed = serviceIdSchema.safeParse({
    serviceId: formData.get("serviceId"),
  });
  const parsed = parseServiceForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات خدمت معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const current = await db.service.findFirst({
      where: { id: idParsed.data.serviceId, tenantId: membership.tenantId },
    });

    if (!current) {
      return {
        ok: false,
        message: "خدمت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
      };
    }

    const updated = await db.service.update({
      where: { id: current.id },
      data: parsed.data,
    });

    await auditUpdate({
      membership,
      entityType: "SERVICE",
      entityLabel: "خدمات مراسم",
      entityId: updated.id,
      recordLabel: updated.title,
      title: "ویرایش خدمت مراسم",
      beforeData: current,
      afterData: updated,
      href: "/dashboard/services",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "خدمتی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات خدمت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateServicePaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تغییرات خدمت با موفقیت ذخیره شد.",
  };
}

export async function quickUpdateServicePriceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const idParsed = serviceIdSchema.safeParse({
    serviceId: formData.get("serviceId"),
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
  const current = await db.service.findFirst({
    where: { id: idParsed.data.serviceId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message: "خدمت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.service.update({
    where: { id: current.id },
    data: {
      price: parsed.data.price,
      basePrice: parsed.data.basePrice,
    },
  });

  await auditUpdate({
    membership,
    entityType: "SERVICE",
    entityLabel: "خدمات مراسم",
    entityId: updated.id,
    recordLabel: updated.title,
    title: "به‌روزرسانی قیمت خدمت مراسم",
    beforeData: current,
    afterData: updated,
    href: "/dashboard/services",
  });

  revalidateServicePaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "قیمت خدمت برای قراردادهای جدید به‌روزرسانی شد.",
  };
}

export async function toggleServiceStatusAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const membership = await requireTenantPermission("packages.manage");
  const parsed = serviceIdSchema.safeParse({
    serviceId: formData.get("serviceId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه خدمت معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const current = await db.service.findFirst({
    where: { id: parsed.data.serviceId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message: "خدمت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.service.update({
    where: { id: current.id },
    data: { isActive: nextStatus },
  });

  await auditToggle({
    membership,
    entityType: "SERVICE",
    entityLabel: "خدمات مراسم",
    entityId: updated.id,
    recordLabel: updated.title,
    title: nextStatus ? "فعال‌سازی خدمت مراسم" : "غیرفعال‌سازی خدمت مراسم",
    isActive: nextStatus,
    beforeData: current,
    afterData: updated,
    href: "/dashboard/services",
  });

  revalidateServicePaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: nextStatus
      ? "خدمت دوباره برای قراردادهای جدید فعال شد."
      : "خدمت غیرفعال شد و در قراردادهای جدید نمایش داده نمی‌شود.",
  };
}
