"use server";

import type { SalonActionState } from "@/lib/actions/salon-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { salonIdSchema, salonSchema } from "@/lib/validation/salon";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseSalonForm(formData: FormData) {
  return salonSchema.safeParse({
    hallId: formData.get("hallId"),
    name: formData.get("name"),
    code: formData.get("code"),
    floor: formData.get("floor"),
    locationNote: formData.get("locationNote"),
    capacity: formData.get("capacity"),
    minCapacity: formData.get("minCapacity"),
    maxCapacity: formData.get("maxCapacity"),
    basePrice: formData.get("basePrice"),
    hasStage: formData.get("hasStage") === "on",
    hasDanceFloor: formData.get("hasDanceFloor") === "on",
    hasSeparateEntrance: formData.get("hasSeparateEntrance") === "on",
    hasVipRoom: formData.get("hasVipRoom") === "on",
    hasSoundSystem: formData.get("hasSoundSystem") === "on",
    hasProjector: formData.get("hasProjector") === "on",
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
  });
}

function revalidateSalonPaths() {
  revalidatePath("/dashboard/salons");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/salons");
}

async function assertHallBelongsToTenant(hallId: string, tenantId: string) {
  const db = await getPrisma();
  const hall = await db.hall.findFirst({
    where: {
      id: hallId,
      tenantId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(hall);
}

export async function createSalonAction(
  _previousState: SalonActionState,
  formData: FormData,
): Promise<SalonActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = parseSalonForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات سالن معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const hallIsValid = await assertHallBelongsToTenant(
    parsed.data.hallId,
    membership.tenantId,
  );

  if (!hallIsValid) {
    return {
      ok: false,
      message:
        "تالار انتخاب‌شده پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const db = await getPrisma();

  try {
    await db.salon.create({
      data: {
        tenantId: membership.tenantId,
        ...parsed.data,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "سالنی با این نام در تالار انتخاب‌شده یا با این کد داخلی قبلاً ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ثبت سالن با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateSalonPaths();

  return {
    ok: true,
    message: "سالن با موفقیت ثبت شد.",
  };
}

export async function updateSalonAction(
  _previousState: SalonActionState,
  formData: FormData,
): Promise<SalonActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const idParsed = salonIdSchema.safeParse({
    salonId: formData.get("salonId"),
  });
  const parsed = parseSalonForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات سالن معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const hallIsValid = await assertHallBelongsToTenant(
    parsed.data.hallId,
    membership.tenantId,
  );

  if (!hallIsValid) {
    return {
      ok: false,
      message:
        "تالار انتخاب‌شده پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const db = await getPrisma();

  try {
    const result = await db.salon.updateMany({
      where: {
        id: idParsed.data.salonId,
        tenantId: membership.tenantId,
      },
      data: parsed.data,
    });

    if (result.count !== 1) {
      return {
        ok: false,
        message:
          "سالن مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "سالنی با این نام در تالار انتخاب‌شده یا با این کد داخلی قبلاً ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات سالن با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateSalonPaths();

  return {
    ok: true,
    message: "تغییرات سالن با موفقیت ذخیره شد.",
  };
}

export async function toggleSalonStatusAction(
  _previousState: SalonActionState,
  formData: FormData,
): Promise<SalonActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = salonIdSchema.safeParse({
    salonId: formData.get("salonId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه سالن معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const result = await db.salon.updateMany({
    where: {
      id: parsed.data.salonId,
      tenantId: membership.tenantId,
    },
    data: {
      isActive: nextStatus,
    },
  });

  if (result.count !== 1) {
    return {
      ok: false,
      message: "سالن مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  revalidateSalonPaths();

  return {
    ok: true,
    message: nextStatus
      ? "سالن دوباره فعال شد."
      : "سالن غیرفعال شد و در پیشنهادهای عملیاتی جدید نمایش داده نمی‌شود.",
  };
}
