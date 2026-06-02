import { prisma } from "@/lib/prisma";
import { toPersianDigits } from "@/lib/date/jalali";

export type InitialSetupSectionKey =
  | "hallInfo"
  | "hallsAndSalons"
  | "services"
  | "menus"
  | "paymentMethods"
  | "financialCategories"
  | "contractSettings";

export type InitialSetupSectionStatus = {
  key: InitialSetupSectionKey;
  title: string;
  isComplete: boolean;
  status: string;
  count?: number;
  missingFields?: string[];
};

export type InitialSetupOverview = {
  sections: InitialSetupSectionStatus[];
  incompleteCount: number;
  completeCount: number;
  totalCount: number;
  statusLabel: string;
  readinessLabel: string;
};

const REQUIRED_HALL_INFO_FIELDS = [
  { key: "brandName", label: "نام تالار" },
  { key: "phone", label: "شماره تماس" },
  { key: "address", label: "آدرس" },
] as const;

export async function getInitialSetupOverview(
  tenantId: string,
): Promise<InitialSetupOverview> {
  const [hallInfo, hallCount, salonCount, serviceCount, menuCount, paymentMethodCount, financialCategoryCount, contractSetting] =
    await Promise.all([
      prisma.tenantHallProfile.findUnique({
        where: { tenantId },
        select: {
          brandName: true,
          phone: true,
          mobile: true,
          address: true,
          hallLogoUrl: true,
          legalName: true,
          registrationNumber: true,
          licenseNumber: true,
          description: true,
        },
      }),
      prisma.hall.count({ where: { tenantId } }),
      prisma.salon.count({ where: { tenantId } }),
      prisma.service.count({ where: { tenantId, isActive: true } }),
      prisma.menu.count({ where: { tenantId, isActive: true } }),
      prisma.paymentMethod.count({ where: { tenantId, isActive: true } }),
      prisma.financialCategory.count({ where: { tenantId, isActive: true } }),
      prisma.contractSetting.findUnique({
        where: { tenantId },
        select: { id: true, contractPrefix: true, nextNumber: true, defaultClauses: true },
      }),
    ]);

  const hallInfoMissingFields = REQUIRED_HALL_INFO_FIELDS.filter(({ key }) => {
    if (key === "phone") {
      return !hallInfo?.phone?.trim() && !hallInfo?.mobile?.trim();
    }

    return !hallInfo?.[key]?.trim();
  }).map(({ label }) => label);

  const sections: InitialSetupSectionStatus[] = [
    {
      key: "hallInfo",
      title: "اطلاعات تالار",
      isComplete: Boolean(hallInfo) && hallInfoMissingFields.length === 0,
      status: hallInfoMissingFields.length === 0 && hallInfo ? "کامل" : "نیازمند تکمیل",
      missingFields: hallInfoMissingFields,
    },
    {
      key: "hallsAndSalons",
      title: "تالارها و سالن‌ها",
      isComplete: hallCount > 0 && salonCount > 0,
      status: `${toPersianDigits(hallCount)} تالار · ${toPersianDigits(salonCount)} سالن`,
      count: hallCount + salonCount,
    },
    {
      key: "services",
      title: "خدمات مراسم",
      isComplete: serviceCount > 0,
      status: `${toPersianDigits(serviceCount)} خدمت فعال`,
      count: serviceCount,
    },
    {
      key: "menus",
      title: "منوی پذیرایی",
      isComplete: menuCount > 0,
      status: `${toPersianDigits(menuCount)} آیتم فعال`,
      count: menuCount,
    },
    {
      key: "paymentMethods",
      title: "روش‌های دریافت",
      isComplete: paymentMethodCount > 0,
      status: `${toPersianDigits(paymentMethodCount)} روش فعال`,
      count: paymentMethodCount,
    },
    {
      key: "financialCategories",
      title: "دسته‌بندی مالی",
      isComplete: financialCategoryCount > 0,
      status: `${toPersianDigits(financialCategoryCount)} دسته‌بندی فعال`,
      count: financialCategoryCount,
    },
    {
      key: "contractSettings",
      title: "تنظیمات قرارداد",
      isComplete: Boolean(contractSetting?.contractPrefix && contractSetting.nextNumber),
      status: contractSetting ? "آماده شماره‌گذاری" : "نیازمند ایجاد",
    },
  ];

  const incompleteCount = sections.filter((section) => !section.isComplete).length;
  const completeCount = sections.length - incompleteCount;

  return {
    sections,
    incompleteCount,
    completeCount,
    totalCount: sections.length,
    statusLabel: getStatusLabel(incompleteCount),
    readinessLabel:
      incompleteCount === 0
        ? "سامانه برای استفاده عملیاتی آماده است."
        : `${toPersianDigits(incompleteCount)} بخش هنوز نیازمند بررسی یا تکمیل است.`,
  };
}

function getStatusLabel(incompleteCount: number) {
  if (incompleteCount === 0) {
    return "آماده استفاده";
  }

  if (incompleteCount <= 2) {
    return `${toPersianDigits(incompleteCount)} بخش ناقص است`;
  }

  return "نیازمند بررسی";
}
