"use server";

import type { HallInfoActionState } from "@/lib/actions/hall-info-state";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { requireTenantMember } from "@/lib/auth/session";
import { canManageHallInfo } from "@/lib/hall-info/permissions";
import { getPrisma } from "@/lib/prisma";
import {
  hallInfoSchema,
  parseBooleanField,
} from "@/lib/validation/hall-info";
import { auditSettingsUpdate } from "@/lib/audit/audit-action-helpers";

const uploadDirectory = path.join(
  process.cwd(),
  "public",
  "uploads",
  "hall-licenses",
);

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const maxLicenseImageSize = 5 * 1024 * 1024;

export async function updateHallInfoAction(
  _previousState: HallInfoActionState,
  formData: FormData,
): Promise<HallInfoActionState> {
  const membership = await requireTenantMember();

  if (!canManageHallInfo(membership)) {
    return {
      ok: false,
      message: "شما دسترسی لازم برای ویرایش اطلاعات تالار را ندارید.",
    };
  }
  const parsed = hallInfoSchema.safeParse({
    brandName: formData.get("brandName"),
    legalName: formData.get("legalName"),
    managerName: formData.get("managerName"),
    managerNationalCode: formData.get("managerNationalCode"),
    registrationNumber: formData.get("registrationNumber"),
    economicCode: formData.get("economicCode"),
    licenseNumber: formData.get("licenseNumber"),
    licenseIssuedAt: formData.get("licenseIssuedAt"),
    licenseExpiresAt: formData.get("licenseExpiresAt"),
    province: formData.get("province"),
    city: formData.get("city"),
    address: formData.get("address"),
    postalCode: formData.get("postalCode"),
    phone: formData.get("phone"),
    mobile: formData.get("mobile"),
    email: formData.get("email"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
    totalCapacity: formData.get("totalCapacity"),
    parkingCapacity: formData.get("parkingCapacity"),
    hasParking: parseBooleanField(formData, "hasParking"),
    hasBrideRoom: parseBooleanField(formData, "hasBrideRoom"),
    hasCateringKitchen: parseBooleanField(formData, "hasCateringKitchen"),
    hasOutdoorSpace: parseBooleanField(formData, "hasOutdoorSpace"),
    hasValet: parseBooleanField(formData, "hasValet"),
    description: formData.get("description"),
    internalNote: formData.get("internalNote"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات تالار معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const licenseImage = formData.get("licenseImage");
  const uploadResult = await saveLicenseImage(licenseImage);

  if (!uploadResult.ok) {
    return {
      ok: false,
      message: uploadResult.message,
    };
  }

  const profileData = nullifyUndefinedFields(parsed.data);
  const db = await getPrisma();

  try {
    const beforeProfile = await db.tenantHallProfile.findUnique({
      where: { tenantId: membership.tenantId },
    });

    const afterProfile = await db.tenantHallProfile.upsert({
      where: {
        tenantId: membership.tenantId,
      },
      create: {
        tenantId: membership.tenantId,
        ...profileData,
        licenseImageUrl: uploadResult.publicUrl ?? null,
        licenseImageKey: uploadResult.key ?? null,
      },
      update: {
        ...profileData,
        ...(uploadResult.publicUrl
          ? {
              licenseImageUrl: uploadResult.publicUrl,
              licenseImageKey: uploadResult.key ?? null,
            }
          : {}),
      },
    });

    await auditSettingsUpdate({
      membership,
      entityType: "HALL_INFO",
      entityId: afterProfile.id,
      settingName: "اطلاعات تالار",
      beforeData: beforeProfile,
      afterData: afterProfile,
      href: "/dashboard/hall-info",
    });
  } catch {
    return {
      ok: false,
      message:
        "ذخیره اطلاعات تالار با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidatePath("/dashboard/hall-info");
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "اطلاعات تالار با موفقیت ذخیره شد.",
  };
}

function nullifyUndefinedFields<T extends Record<string, unknown>>(
  value: T,
): { [K in keyof T]: Exclude<T[K], undefined> | null } {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      fieldValue === undefined ? null : fieldValue,
    ]),
  ) as { [K in keyof T]: Exclude<T[K], undefined> | null };
}

async function saveLicenseImage(file: FormDataEntryValue | null): Promise<
  | {
      ok: true;
      publicUrl?: string;
      key?: string;
    }
  | {
      ok: false;
      message: string;
    }
> {
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: true,
    };
  }

  if (file.size > maxLicenseImageSize) {
    return {
      ok: false,
      message: "حجم تصویر مجوز نباید بیشتر از ۵ مگابایت باشد.",
    };
  }

  const extension = allowedImageTypes.get(file.type);
  if (!extension) {
    return {
      ok: false,
      message: "فقط فایل‌های jpg، jpeg، png یا webp برای تصویر مجوز مجاز هستند.",
    };
  }

  const originalExtension = path
    .extname(file.name)
    .replace(".", "")
    .toLowerCase();
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

  if (!allowedExtensions.includes(originalExtension)) {
    return {
      ok: false,
      message: "پسوند فایل تصویر مجوز معتبر نیست.",
    };
  }

  await mkdir(uploadDirectory, { recursive: true });

  const fileName = `${randomUUID()}.${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, bytes);

  return {
    ok: true,
    publicUrl: `/uploads/hall-licenses/${fileName}`,
    key: `hall-licenses/${fileName}`,
  };
}
