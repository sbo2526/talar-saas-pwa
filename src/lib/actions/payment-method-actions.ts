"use server";

import type { PaymentMethodActionState } from "@/lib/actions/payment-method-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import {
  paymentMethodIdSchema,
  paymentMethodSchema,
} from "@/lib/validation/payment-method";
import { auditCreate, auditToggle, auditUpdate } from "@/lib/audit/audit-action-helpers";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function parsePaymentMethodForm(formData: FormData) {
  return paymentMethodSchema.safeParse({
    title: formData.get("title"),
    code: formData.get("code"),
    type: formData.get("type"),
    description: formData.get("description"),
    bankName: formData.get("bankName"),
    accountHolder: formData.get("accountHolder"),
    accountNumber: formData.get("accountNumber"),
    cardNumber: formData.get("cardNumber"),
    iban: formData.get("iban"),
    posTerminalId: formData.get("posTerminalId"),
    gatewayName: formData.get("gatewayName"),
    isDefault: formData.get("isDefault") === "on",
    isActive: formData.get("isActive") === "on",
  });
}

function revalidatePaymentMethodPaths() {
  revalidatePath("/dashboard/payment-methods");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/payments/new");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/payment-methods");
}

export async function createPaymentMethodAction(
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const membership = await requireTenantPermission("payment_methods.manage");
  const parsed = parsePaymentMethodForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات روش دریافت معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();
  let createdMethod: { id: string; title: string } | null = null;

  try {
    createdMethod = await db.$transaction(async (tx) => {
      if (parsed.data.isDefault && parsed.data.isActive) {
        await tx.paymentMethod.updateMany({
          where: { tenantId: membership.tenantId },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.create({
        data: {
          tenantId: membership.tenantId,
          ...parsed.data,
          isDefault: parsed.data.isDefault && parsed.data.isActive,
        },
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "روش دریافتی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ثبت روش دریافت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  if (createdMethod) {
    await auditCreate({
      membership,
      entityType: "PAYMENT_METHOD",
      entityLabel: "روش دریافت",
      entityId: createdMethod.id,
      recordLabel: createdMethod.title,
      title: "ثبت روش دریافت",
      afterData: createdMethod,
      href: "/dashboard/payment-methods",
    });
  }

  revalidatePaymentMethodPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "روش دریافت با موفقیت ثبت شد.",
  };
}

export async function updatePaymentMethodAction(
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const membership = await requireTenantPermission("payment_methods.manage");
  const idParsed = paymentMethodIdSchema.safeParse({
    paymentMethodId: formData.get("paymentMethodId"),
  });
  const parsed = parsePaymentMethodForm(formData);

  if (!idParsed.success || !parsed.success) {
    return {
      ok: false,
      message:
        idParsed.error?.issues[0]?.message ??
        parsed.error?.issues[0]?.message ??
        "اطلاعات روش دریافت معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const current = await db.paymentMethod.findFirst({
      where: { id: idParsed.data.paymentMethodId, tenantId: membership.tenantId },
    });

    if (!current) {
      throw new Error("PAYMENT_METHOD_NOT_FOUND");
    }

    const updated = await db.$transaction(async (tx) => {
      if (parsed.data.isDefault && parsed.data.isActive) {
        await tx.paymentMethod.updateMany({
          where: {
            tenantId: membership.tenantId,
            NOT: { id: idParsed.data.paymentMethodId },
          },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.update({
        where: { id: current.id },
        data: {
          ...parsed.data,
          isDefault: parsed.data.isDefault && parsed.data.isActive,
        },
      });
    });

    await auditUpdate({
      membership,
      entityType: "PAYMENT_METHOD",
      entityLabel: "روش دریافت",
      entityId: updated.id,
      recordLabel: updated.title,
      title: "ویرایش روش دریافت",
      beforeData: current,
      afterData: updated,
      href: "/dashboard/payment-methods",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PAYMENT_METHOD_NOT_FOUND"
    ) {
      return {
        ok: false,
        message:
          "روش دریافت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
      };
    }

    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message:
          "روش دریافتی با این نام یا کد داخلی قبلاً در همین فضای کاری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات روش دریافت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidatePaymentMethodPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تغییرات روش دریافت با موفقیت ذخیره شد.",
  };
}

export async function togglePaymentMethodStatusAction(
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const membership = await requireTenantPermission("payment_methods.manage");
  const parsed = paymentMethodIdSchema.safeParse({
    paymentMethodId: formData.get("paymentMethodId"),
  });
  const nextStatus = formData.get("nextStatus") === "active";

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه روش دریافت معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const current = await db.paymentMethod.findFirst({
    where: { id: parsed.data.paymentMethodId, tenantId: membership.tenantId },
  });

  if (!current) {
    return {
      ok: false,
      message:
        "روش دریافت مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
    };
  }

  const updated = await db.paymentMethod.update({
    where: { id: current.id },
    data: {
      isActive: nextStatus,
      ...(nextStatus ? {} : { isDefault: false }),
    },
  });

  await auditToggle({
    membership,
    entityType: "PAYMENT_METHOD",
    entityLabel: "روش دریافت",
    entityId: updated.id,
    recordLabel: updated.title,
    title: nextStatus ? "فعال‌سازی روش دریافت" : "غیرفعال‌سازی روش دریافت",
    isActive: nextStatus,
    beforeData: current,
    afterData: updated,
    href: "/dashboard/payment-methods",
  });

  revalidatePaymentMethodPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: nextStatus
      ? "روش دریافت دوباره فعال شد."
      : "روش دریافت غیرفعال شد و در ثبت دریافتی‌های جدید پیشنهاد نمی‌شود.",
  };
}

export async function setDefaultPaymentMethodAction(
  _previousState: PaymentMethodActionState,
  formData: FormData,
): Promise<PaymentMethodActionState> {
  const membership = await requireTenantPermission("payment_methods.manage");
  const parsed = paymentMethodIdSchema.safeParse({
    paymentMethodId: formData.get("paymentMethodId"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "شناسه روش دریافت معتبر نیست.",
    };
  }

  const db = await getPrisma();
  let defaultMethod: { id: string; title: string } | null = null;

  try {
    defaultMethod = await db.$transaction(async (tx) => {
      const method = await tx.paymentMethod.findFirst({
        where: {
          id: parsed.data.paymentMethodId,
          tenantId: membership.tenantId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!method) {
        throw new Error("PAYMENT_METHOD_NOT_FOUND");
      }

      await tx.paymentMethod.updateMany({
        where: { tenantId: membership.tenantId },
        data: { isDefault: false },
      });

      return tx.paymentMethod.update({
        where: { id: method.id },
        data: { isDefault: true },
      });
    });
  } catch {
    return {
      ok: false,
      message:
        "برای انتخاب روش پیش‌فرض، روش دریافت باید فعال و متعلق به همین فضای کاری باشد.",
    };
  }

  if (defaultMethod) {
    await auditUpdate({
      membership,
      action: "SETTINGS_UPDATE",
      actionLabel: "تنظیم به‌عنوان پیش‌فرض",
      entityType: "PAYMENT_METHOD",
      entityLabel: "روش دریافت",
      entityId: defaultMethod.id,
      recordLabel: defaultMethod.title,
      title: "تنظیم روش دریافت پیش‌فرض",
      afterData: defaultMethod,
      href: "/dashboard/payment-methods",
    });
  }

  revalidatePaymentMethodPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "روش دریافت پیش‌فرض با موفقیت تنظیم شد.",
  };
}
