"use server";

import type { AccountActionState } from "@/lib/actions/account-state";
import { revalidatePath } from "next/cache";
import { accountProfileSchema } from "@/lib/validation/account";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { buildAuditMessage, getAuditActorName } from "@/lib/audit/audit-log-messages";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function updateAccountProfileAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await requireUser();
  const parsed = accountProfileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    nationalCode: formData.get("nationalCode"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات واردشده برای حساب کاربری معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const membership = await getCurrentTenantMember(user.id);

  if (parsed.data.phone) {
    const duplicatePhone = await db.user.findFirst({
      where: {
        phone: parsed.data.phone,
        NOT: {
          id: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicatePhone) {
      return {
        ok: false,
        message: "این شماره موبایل قبلاً برای حساب دیگری ثبت شده است.",
      };
    }
  }

  if (parsed.data.nationalCode) {
    const duplicateNationalCode = await db.user.findFirst({
      where: {
        nationalCode: parsed.data.nationalCode,
        NOT: {
          id: user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateNationalCode) {
      return {
        ok: false,
        message: "این کد ملی قبلاً برای حساب دیگری ثبت شده است.",
      };
    }
  }

  try {
    const updatedUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone ?? null,
        nationalCode: parsed.data.nationalCode ?? null,
        address: parsed.data.address ?? null,
        postalCode: parsed.data.postalCode ?? null,
      },
    });

    if (membership) {
      const userName = getAuditActorName(membership.user);
      await createAuditLog({
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "UPDATE",
        entityType: "ACCOUNT",
        entityId: user.id,
        title: "ویرایش حساب کاربری",
        message: buildAuditMessage({
          entityLabel: "حساب کاربری",
          recordLabel: updatedUser.name ?? updatedUser.email,
          actionLabel: "ویرایش",
          userName,
        }),
        beforeData: user,
        afterData: updatedUser,
        href: "/dashboard/account",
      });
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "شماره موبایل یا کد ملی قبلاً برای حساب دیگری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message:
        "ذخیره تغییرات حساب با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "اطلاعات حساب با موفقیت به‌روزرسانی شد.",
  };
}
