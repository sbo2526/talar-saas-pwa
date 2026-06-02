"use server";

import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import type { AuthActionState } from "@/lib/actions/auth-state";
import { registerSchema } from "@/lib/auth/schemas";
import { requireUser } from "@/lib/auth/session";
import { ensureContractCatalogDefaults } from "@/lib/contract-defaults";
import { getPrisma } from "@/lib/prisma";
import { contractCancellationPolicyText } from "@/lib/contracts/cancellation-policy";

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "اطلاعات وارد شده معتبر نیست.",
    };
  }

  const db = await getPrisma();
  const existingEmail = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingEmail) {
    return {
      ok: false,
      message: "با این ایمیل قبلا حساب کاربری ساخته شده است.",
    };
  }

  if (parsed.data.phone) {
    const existingPhone = await db.user.findUnique({
      where: { phone: parsed.data.phone },
    });

    if (existingPhone) {
      return {
        ok: false,
        message: "با این شماره موبایل قبلا حساب کاربری ساخته شده است.",
      };
    }
  }

  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        message: "ایمیل یا شماره موبایل قبلا برای حساب دیگری ثبت شده است.",
      };
    }

    return {
      ok: false,
      message: "ثبت‌نام با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  return {
    ok: true,
    message: "حساب شما ساخته شد. در حال ورود مستقیم به داشبورد هستید.",
    autoLoginEmail: parsed.data.email,
    redirectTo: "/dashboard",
  };
}

export async function startDemoAction() {
  const user = await requireUser();
  const db = await getPrisma();

  const existingDemo = await db.demoAccess.findUnique({
    where: { userId: user.id },
  });

  if (
    existingDemo?.status === "USED" ||
    existingDemo?.status === "EXPIRED"
  ) {
    redirect("/demo?status=already-used");
  }

  const tenantSlug = `demo-${user.id.slice(0, 8)}-${Date.now()}`;

  try {
    await db.$transaction(async (tx) => {
      const demoInTransaction = await tx.demoAccess.findUnique({
        where: { userId: user.id },
      });

      if (
        demoInTransaction?.status === "USED" ||
        demoInTransaction?.status === "EXPIRED"
      ) {
        throw new Error("DEMO_ALREADY_USED");
      }

      if (demoInTransaction?.status === "AVAILABLE") {
        const claim = await tx.demoAccess.updateMany({
          where: {
            userId: user.id,
            status: "AVAILABLE",
          },
          data: {
            status: "USED",
            usedAt: new Date(),
          },
        });

        if (claim.count !== 1) {
          throw new Error("DEMO_ALREADY_USED");
        }
      } else {
        try {
          await tx.demoAccess.create({
            data: {
              userId: user.id,
              status: "USED",
              usedAt: new Date(),
            },
          });
        } catch (error) {
          if (isUniqueConstraintError(error)) {
            throw new Error("DEMO_ALREADY_USED");
          }

          throw error;
        }
      }

      const tenantDisplayName = user.name?.trim() || user.email;
      const tenant = await tx.tenant.create({
        data: {
          name: tenantDisplayName,
          slug: tenantSlug,
          status: "DEMO",
          ownerId: user.id,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "DEMO",
          status: "TRIALING",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      await tx.contractSetting.create({
        data: {
          tenantId: tenant.id,
          contractPrefix: "TLR",
          nextNumber: 1,
          defaultTaxPercent: "0",
          defaultClauses:
            "شرایط اختصاصی هر قرارداد در زمان ثبت مراسم تکمیل و در نسخه چاپی قرارداد درج می‌شود.",
          paymentTerms:
            "زمان‌بندی بیعانه، اقساط و تسویه نهایی طبق توافق طرفین در قرارداد ثبت می‌شود.",
          cancellationPolicy: contractCancellationPolicyText,
          footerNote: "امضای طرفین به منزله پذیرش مفاد قرارداد است.",
          templateBody:
            "اطلاعات تالار، مشتری، مراسم، خدمات، منوی پذیرایی و دریافتی‌ها به‌صورت خودکار در متن قرارداد جای‌گذاری می‌شود.",
          printTemplateName: "قالب رسمی تالار",
        },
      });

      await tx.paymentMethod.createMany({
        data: [
          { tenantId: tenant.id, title: "نقدی", type: "CASH" },
          { tenantId: tenant.id, title: "کارت خوان", type: "CARD" },
          { tenantId: tenant.id, title: "حواله بانکی", type: "BANK_TRANSFER" },
          { tenantId: tenant.id, title: "چک", type: "CHECK" },
        ],
        skipDuplicates: true,
      });

      await tx.financialCategory.createMany({
        data: [
          {
            tenantId: tenant.id,
            title: "پیش دریافت قرارداد",
            type: "INCOME",
            sortOrder: 1,
          },
          {
            tenantId: tenant.id,
            title: "تسویه قرارداد",
            type: "INCOME",
            sortOrder: 2,
          },
          {
            tenantId: tenant.id,
            title: "مواد اولیه",
            type: "EXPENSE",
            sortOrder: 10,
          },
          {
            tenantId: tenant.id,
            title: "حقوق پرسنل",
            type: "EXPENSE",
            sortOrder: 20,
          },
        ],
        skipDuplicates: true,
      });

      await ensureContractCatalogDefaults(tx, tenant.id);

      await tx.demoAccess.update({
        where: { userId: user.id },
        data: {
          tenantId: tenant.id,
          status: "USED",
          usedAt: new Date(),
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DEMO_ALREADY_USED") {
      redirect("/demo?status=already-used");
    }

    redirect("/demo?status=failed");
  }

  redirect("/dashboard");
}
