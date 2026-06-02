"use server";

import type { HallActionState } from "@/lib/actions/hall-state";
import { revalidatePath } from "next/cache";
import { hallIdSchema, hallSchema } from "@/lib/validation/hall";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parseHallForm(formData: FormData) {
  return hallSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    province: formData.get("province"),
    city: formData.get("city"),
    address: formData.get("address"),
    phone: formData.get("phone"),
    managerName: formData.get("managerName"),
    totalCapacity: formData.get("totalCapacity"),
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
  });
}

function revalidateHallPaths() {
  revalidatePath("/dashboard/halls");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/halls");
}

export async function createHallAction(
  _previousState: HallActionState,
  formData: FormData,
): Promise<HallActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = parseHallForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات تالار معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    await db.hall.create({
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
          "تالاری با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ثبت تالار با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateHallPaths();

  return {
    ok: true,
    message: "تالار با موفقیت ثبت شد.",
  };
}

export async function updateHallAction(
  _previousState: HallActionState,
  formData: FormData,
): Promise<HallActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const idParsed = hallIdSchema.safeParse({
    hallId: formData.get("hallId"),
  });
  const parsed = parseHallForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات تالار معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const result = await db.hall.updateMany({
      where: {
        id: idParsed.data.hallId,
        tenantId: membership.tenantId,
      },
      data: parsed.data,
    });

    if (result.count !== 1) {
      return {
        ok: false,
        message: "تالار مورد نظر پیدا نشد یا به این فضای کاری تعلق ندارد.",
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "تالاری با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات تالار با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateHallPaths();

  return {
    ok: true,
    message: "تغییرات تالار با موفقیت ذخیره شد.",
  };
}

export async function toggleHallStatusAction(
  _previousState: HallActionState,
  formData: FormData,
): Promise<HallActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = hallIdSchema.safeParse({
    hallId: formData.get("hallId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه تالار معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const result = await db.hall.updateMany({
    where: {
      id: parsed.data.hallId,
      tenantId: membership.tenantId,
    },
    data: {
      isActive: nextStatus,
    },
  });

  if (result.count !== 1) {
    return {
      ok: false,
      message: "تالار مورد نظر پیدا نشد یا به این فضای کاری تعلق ندارد.",
    };
  }

  revalidateHallPaths();

  return {
    ok: true,
    message: nextStatus
      ? "تالار دوباره فعال شد."
      : "تالار غیرفعال شد و در پیشنهادهای عملیاتی جدید نمایش داده نمی‌شود.",
  };
}
