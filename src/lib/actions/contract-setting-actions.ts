"use server";

import type { ContractSettingActionState } from "@/lib/actions/contract-setting-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { contractSettingSchema } from "@/lib/validation/contract-setting";
import { auditSettingsUpdate } from "@/lib/audit/audit-action-helpers";
import { contractCancellationPolicyText } from "@/lib/contracts/cancellation-policy";
import {
  deleteTenantUploadByKey,
  isUploadedFile,
  saveTenantLogoUpload,
} from "@/lib/uploads/local-upload";

function parseContractSettingForm(formData: FormData) {
  return contractSettingSchema.safeParse({
    contractPrefix: formData.get("contractPrefix"),
    nextNumber: formData.get("nextNumber"),
    fiscalYear: formData.get("fiscalYear"),
    defaultDepositPercent: formData.get("defaultDepositPercent"),
    defaultTaxPercent: formData.get("defaultTaxPercent"),
    defaultDiscountPercent: formData.get("defaultDiscountPercent"),
    defaultClauses: formData.get("defaultClauses"),
    paymentTerms: formData.get("paymentTerms"),
    cancellationPolicy: formData.get("cancellationPolicy"),
    footerNote: formData.get("footerNote"),
    templateBody: formData.get("templateBody"),
    customerSignatureLabel: formData.get("customerSignatureLabel"),
    managerSignatureLabel: formData.get("managerSignatureLabel"),
    printTemplateName: formData.get("printTemplateName"),
    showLogoOnPrint: formData.get("showLogoOnPrint") === "on",
    showLicenseInfoOnPrint: formData.get("showLicenseInfoOnPrint") === "on",
    requireNationalCode: formData.get("requireNationalCode") === "on",
    requirePhone: formData.get("requirePhone") === "on",
  });
}

function revalidateContractSettingPaths() {
  revalidatePath("/dashboard/contract-settings");
  revalidatePath("/dashboard/base");
  revalidatePath("/dashboard/base/contract-settings");
  revalidatePath("/dashboard/contracts/new");
  revalidatePath("/dashboard/contracts");
}

export async function updateContractSettingAction(
  _previousState: ContractSettingActionState,
  formData: FormData,
): Promise<ContractSettingActionState> {
  const membership = await requireTenantPermission("settings.manage");
  const parsed = parseContractSettingForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "تنظیمات قرارداد معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const beforeSetting = await db.contractSetting.findUnique({
      where: { tenantId: membership.tenantId },
    });

    const afterSetting = await db.contractSetting.upsert({
      where: {
        tenantId: membership.tenantId,
      },
      update: parsed.data,
      create: {
        tenantId: membership.tenantId,
        ...parsed.data,
      },
    });

    await auditSettingsUpdate({
      membership,
      entityType: "CONTRACT_SETTING",
      entityId: afterSetting.id,
      settingName: "تنظیمات قرارداد",
      beforeData: beforeSetting,
      afterData: afterSetting,
      href: "/dashboard/contract-settings",
    });
  } catch {
    return {
      ok: false,
      message:
        "ذخیره تنظیمات قرارداد با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateContractSettingPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "تنظیمات قرارداد با موفقیت ذخیره شد.",
  };
}

export async function resetContractSettingDefaultsAction(): Promise<void> {
  const membership = await requireTenantPermission("settings.manage");
  const db = await getPrisma();

  const beforeSetting = await db.contractSetting.findUnique({
    where: { tenantId: membership.tenantId },
  });

  const afterSetting = await db.contractSetting.upsert({
    where: {
      tenantId: membership.tenantId,
    },
    update: {
      contractPrefix: "TLR",
      nextNumber: 1,
      fiscalYear: null,
      defaultDepositPercent: "0",
      defaultTaxPercent: "0",
      defaultDiscountPercent: "0",
      defaultClauses:
        "شرایط اختصاصی هر قرارداد در زمان ثبت مراسم تکمیل و در نسخه چاپی قرارداد درج می‌شود.",
      templateBody:
        "اطلاعات تالار، مشتری، مراسم، خدمات، منوی پذیرایی و دریافتی‌ها به‌صورت خودکار در متن قرارداد جای‌گذاری می‌شود.",
      cancellationPolicy: contractCancellationPolicyText,
      paymentTerms:
        "زمان‌بندی بیعانه، اقساط و تسویه نهایی طبق توافق طرفین در قرارداد ثبت می‌شود.",
      footerNote: "امضای طرفین به منزله پذیرش مفاد قرارداد است.",
      customerSignatureLabel: "امضای مشتری",
      managerSignatureLabel: "امضای مدیر تالار",
      printTemplateName: "قالب رسمی تالار",
      showLogoOnPrint: true,
      showLicenseInfoOnPrint: true,
      requireNationalCode: false,
      requirePhone: true,
    },
    create: {
      tenantId: membership.tenantId,
      contractPrefix: "TLR",
      nextNumber: 1,
      defaultDepositPercent: "0",
      defaultTaxPercent: "0",
      defaultDiscountPercent: "0",
      defaultClauses:
        "شرایط اختصاصی هر قرارداد در زمان ثبت مراسم تکمیل و در نسخه چاپی قرارداد درج می‌شود.",
      templateBody:
        "اطلاعات تالار، مشتری، مراسم، خدمات، منوی پذیرایی و دریافتی‌ها به‌صورت خودکار در متن قرارداد جای‌گذاری می‌شود.",
      cancellationPolicy: contractCancellationPolicyText,
      paymentTerms:
        "زمان‌بندی بیعانه، اقساط و تسویه نهایی طبق توافق طرفین در قرارداد ثبت می‌شود.",
      footerNote: "امضای طرفین به منزله پذیرش مفاد قرارداد است.",
      customerSignatureLabel: "امضای مشتری",
      managerSignatureLabel: "امضای مدیر تالار",
      printTemplateName: "قالب رسمی تالار",
      showLogoOnPrint: true,
      showLicenseInfoOnPrint: true,
      requireNationalCode: false,
      requirePhone: true,
    },
  });

  await auditSettingsUpdate({
    membership,
    entityType: "CONTRACT_SETTING",
    entityId: afterSetting.id,
    settingName: "تنظیمات قرارداد",
    beforeData: beforeSetting,
    afterData: afterSetting,
    href: "/dashboard/contract-settings",
  });

  revalidateContractSettingPaths();
  revalidatePath("/dashboard/settings/activity");
}


export async function uploadHallLogoAction(formData: FormData) {
  const membership = await requireTenantPermission("settings.manage");
  const file = formData.get("hallLogo");

  if (!isUploadedFile(file)) {
    return { ok: false, message: "فایل انتخاب‌شده معتبر نیست." };
  }

  const db = await getPrisma();

  try {
    const saved = await saveTenantLogoUpload({
      file,
      tenantId: membership.tenantId,
      area: "hall-logo",
      maxBytes: 5 * 1024 * 1024,
    });
    const beforeProfile = await db.tenantHallProfile.findUnique({
      where: { tenantId: membership.tenantId },
    });
    const afterProfile = await db.tenantHallProfile.upsert({
      where: { tenantId: membership.tenantId },
      update: { hallLogoUrl: saved.dataUrl ?? saved.publicUrl, hallLogoKey: saved.key },
      create: {
        tenantId: membership.tenantId,
        hallLogoUrl: saved.dataUrl ?? saved.publicUrl,
        hallLogoKey: saved.key,
      },
    });

    await deleteTenantUploadByKey(beforeProfile?.hallLogoKey);

    await auditSettingsUpdate({
      membership,
      entityType: "HALL_INFO",
      entityId: afterProfile.id,
      settingName: "لوگوی چاپ قرارداد",
      beforeData: beforeProfile,
      afterData: afterProfile,
      href: "/dashboard/contract-settings",
    });
  } catch (error) {
    const message = getHallLogoUploadErrorMessage(error);
    return { ok: false, message };
  }

  revalidateContractSettingPaths();
  revalidatePath("/dashboard/hall-info");
  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard/contracts/new");
  revalidatePath("/dashboard/settings/activity");

  return { ok: true, message: "لوگوی تالار با موفقیت ذخیره شد." };
}

export async function removeHallLogoAction() {
  const membership = await requireTenantPermission("settings.manage");
  const db = await getPrisma();
  const beforeProfile = await db.tenantHallProfile.findUnique({
    where: { tenantId: membership.tenantId },
  });

  if (!beforeProfile) {
    return { ok: false, message: "اطلاعات تالار پیدا نشد." };
  }

  const afterProfile = await db.tenantHallProfile.update({
    where: { tenantId: membership.tenantId },
    data: { hallLogoUrl: null, hallLogoKey: null },
  });

  await deleteTenantUploadByKey(beforeProfile.hallLogoKey);

  await auditSettingsUpdate({
    membership,
    entityType: "HALL_INFO",
    entityId: afterProfile.id,
    settingName: "لوگوی چاپ قرارداد",
    beforeData: beforeProfile,
    afterData: afterProfile,
    href: "/dashboard/contract-settings",
  });

  revalidateContractSettingPaths();
  revalidatePath("/dashboard/hall-info");
  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard/contracts/new");
  revalidatePath("/dashboard/settings/activity");

  return { ok: true, message: "لوگوی چاپ قرارداد حذف شد." };
}

function getHallLogoUploadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "بارگذاری لوگو با خطا مواجه شد.";
  }

  const messages: Record<string, string> = {
    INVALID_UPLOAD_MIME: "فایل انتخاب‌شده معتبر نیست.",
    INVALID_UPLOAD_SIZE: "حجم فایل بیش از حد مجاز است.",
    INVALID_IMAGE_PROCESSING: "بارگذاری لوگو با خطا مواجه شد.",
  };

  return messages[error.message] ?? "بارگذاری لوگو با خطا مواجه شد.";
}
