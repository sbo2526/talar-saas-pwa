import { BadgeCheck, Building2, FileCheck2, MapPin, Phone } from "lucide-react";
import {
  HallInfoForm,
  type HallInfoFormValues,
} from "@/components/dashboard/hall-info-form";
import { HallInfoSummaryCard } from "@/components/dashboard/hall-info-summary-card";
import { HallLogoUploadPanel } from "@/components/dashboard/hall-logo-upload-panel";
import { requireTenantMember } from "@/lib/auth/session";
import { canManageHallInfo } from "@/lib/hall-info/permissions";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  toDateOnlyString,
} from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";

export default async function HallInfoPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const profile = await db.tenantHallProfile.findUnique({
    where: {
      tenantId: membership.tenantId,
    },
  });
  const canEdit = canManageHallInfo(membership);
  const completionItems = getCompletionItems(profile);
  const completionPercent = Math.round(
    (completionItems.filter((item) => item.complete).length /
      completionItems.length) *
      100,
  );

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Building2 size={15} />
              پروفایل اصلی کسب‌وکار
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              اطلاعات تالار
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              اطلاعات هویتی، تماس، نشانی، مجوزها و مشخصات اصلی تالار خود را از
              این بخش ثبت و مدیریت کنید.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill icon={BadgeCheck} label="اطلاعات پایه" />
              <StatusPill icon={Phone} label="اطلاعات تماس" />
              <StatusPill icon={FileCheck2} label="مجوز تالار" />
              <StatusPill icon={MapPin} label="آماده بررسی" />
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-96 sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">فضای کاری فعلی</p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {membership.tenant.name}
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
              این صفحه با مدل عملیاتی «تالارها» و «سالن‌ها» متفاوت است و هویت
              اصلی کسب‌وکار مشتری را نگهداری می‌کند.
            </p>
            <div className="gold-divider my-4" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
                <p className="text-xs font-black text-[#f0dba9]">
                  تکمیل اطلاعات
                </p>
                <p className="mt-1 text-2xl font-black text-[#fff9ed]">
                  {formatPersianNumber(completionPercent)}٪
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
                <p className="text-xs font-black text-[#f0dba9]">تاریخ امروز</p>
                <p className="mt-1 text-sm font-black leading-6 text-[#fff9ed]">
                  {formatJalaliDate(new Date())}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <HallInfoForm values={toFormValues(profile)} canEdit={canEdit} />
        <div className="space-y-4">
          <HallLogoUploadPanel
            logoUrl={profile?.hallLogoUrl}
            canEdit={canEdit}
          />
          <HallInfoSummaryCard
            tenantName={profile?.brandName ?? membership.tenant.name}
            completionPercent={completionPercent}
            items={completionItems}
            updatedAt={formatJalaliDateTime(profile?.updatedAt)}
          />
          <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
            <p className="text-xs font-black text-[#17483f]">
              قابل بررسی توسط پشتیبانی سامانه
            </p>
            <h2 className="mt-1 text-xl font-black">حریم و کاربرد اطلاعات</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-[#6d5f49]">
              این اطلاعات برای راه‌اندازی، پشتیبانی، بررسی وضعیت اشتراک و تکمیل
              فضای اختصاصی تالار استفاده می‌شود. اطلاعات حساس مانند کد ملی و
              تصویر مجوز در صفحات عمومی نمایش داده نمی‌شود.
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}

function StatusPill({
  icon: Icon,
  label,
}: {
  icon: typeof BadgeCheck;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-3 py-1.5 text-xs font-black text-[#7d6841]">
      <Icon size={14} className="text-[#9f7131]" />
      {label}
    </span>
  );
}

function toFormValues(
  profile: {
    brandName: string | null;
    legalName: string | null;
    managerName: string | null;
    managerNationalCode: string | null;
    registrationNumber: string | null;
    economicCode: string | null;
    licenseNumber: string | null;
    licenseIssuedAt: Date | null;
    licenseExpiresAt: Date | null;
    licenseImageUrl: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    totalCapacity: number | null;
    parkingCapacity: number | null;
    hasParking: boolean;
    hasBrideRoom: boolean;
    hasCateringKitchen: boolean;
    hasOutdoorSpace: boolean;
    hasValet: boolean;
    description: string | null;
    internalNote: string | null;
    hallLogoUrl?: string | null;
  } | null,
): HallInfoFormValues {
  return {
    brandName: profile?.brandName ?? "",
    legalName: profile?.legalName ?? "",
    managerName: profile?.managerName ?? "",
    managerNationalCode: profile?.managerNationalCode ?? "",
    registrationNumber: profile?.registrationNumber ?? "",
    economicCode: profile?.economicCode ?? "",
    licenseNumber: profile?.licenseNumber ?? "",
    licenseIssuedAt: toInputDate(profile?.licenseIssuedAt),
    licenseExpiresAt: toInputDate(profile?.licenseExpiresAt),
    licenseImageUrl: profile?.licenseImageUrl ?? "",
    province: profile?.province ?? "",
    city: profile?.city ?? "",
    address: profile?.address ?? "",
    postalCode: profile?.postalCode ?? "",
    phone: profile?.phone ?? "",
    mobile: profile?.mobile ?? "",
    email: profile?.email ?? "",
    website: profile?.website ?? "",
    instagram: profile?.instagram ?? "",
    totalCapacity: profile?.totalCapacity ? String(profile.totalCapacity) : "",
    parkingCapacity: profile?.parkingCapacity
      ? String(profile.parkingCapacity)
      : "",
    hasParking: profile?.hasParking ?? false,
    hasBrideRoom: profile?.hasBrideRoom ?? false,
    hasCateringKitchen: profile?.hasCateringKitchen ?? false,
    hasOutdoorSpace: profile?.hasOutdoorSpace ?? false,
    hasValet: profile?.hasValet ?? false,
    description: profile?.description ?? "",
    internalNote: profile?.internalNote ?? "",
  };
}

function getCompletionItems(
  profile: {
    brandName: string | null;
    legalName: string | null;
    managerName: string | null;
    province: string | null;
    city: string | null;
    address: string | null;
    phone: string | null;
    mobile: string | null;
    licenseNumber: string | null;
    licenseImageUrl: string | null;
    totalCapacity: number | null;
    parkingCapacity: number | null;
  } | null,
) {
  return [
    {
      label: "اطلاعات هویتی تکمیل شده",
      complete: Boolean(
        profile?.brandName && profile?.legalName && profile?.managerName,
      ),
    },
    {
      label: "اطلاعات تماس تکمیل شده",
      complete: Boolean(profile?.phone || profile?.mobile),
    },
    {
      label: "نشانی تالار ثبت شده",
      complete: Boolean(profile?.province && profile?.city && profile?.address),
    },
    {
      label: "مجوز تالار بارگذاری شده",
      complete: Boolean(profile?.licenseNumber && profile?.licenseImageUrl),
    },
    {
      label: "مشخصات امکانات ثبت شده",
      complete: Boolean(profile?.totalCapacity || profile?.parkingCapacity),
    },
  ];
}

function toInputDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }

  return toDateOnlyString(date);
}
