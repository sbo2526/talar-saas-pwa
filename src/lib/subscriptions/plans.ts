export type PurchasablePlan = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export type PlanCatalogItem = {
  plan: PurchasablePlan;
  title: string;
  badge?: string;
  priceLabel: string;
  shortDescription: string;
  description: string;
  features: string[];
  bestFor: string;
};

export const purchasablePlanValues = [
  "STARTER",
  "PROFESSIONAL",
  "ENTERPRISE",
] as const satisfies readonly PurchasablePlan[];

export const purchasablePlanRanks: Record<PurchasablePlan, number> = {
  STARTER: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: 3,
};

export function getPurchasablePlanRank(
  plan: PurchasablePlan | string | null | undefined,
) {
  if (!plan) return 0;
  return purchasablePlanRanks[plan as PurchasablePlan] ?? 0;
}

export function isPurchasablePlanDowngrade(input: {
  currentPlan?: string | null;
  requestedPlan: PurchasablePlan;
}) {
  return (
    getPurchasablePlanRank(input.currentPlan) >
    getPurchasablePlanRank(input.requestedPlan)
  );
}

export function isPurchasablePlanUpgrade(input: {
  currentPlan?: string | null;
  requestedPlan: PurchasablePlan;
}) {
  return (
    getPurchasablePlanRank(input.currentPlan) <
    getPurchasablePlanRank(input.requestedPlan)
  );
}

export function isSamePurchasablePlan(input: {
  currentPlan?: string | null;
  requestedPlan: PurchasablePlan;
}) {
  return input.currentPlan === input.requestedPlan;
}

export const planCatalog: PlanCatalogItem[] = [
  {
    plan: "STARTER",
    title: "پلن پایه",
    priceLabel: "شروع اقتصادی",
    shortDescription: "برای تالارهای کوچک و شروع بهره‌برداری واقعی",
    description: "مناسب مدیریت اولیه قراردادها، مشتریان، دریافت‌ها و گزارش‌های ضروری بدون پیچیدگی اضافه.",
    bestFor: "شروع فروش و ثبت قراردادهای روزمره",
    features: [
      "مدیریت قرارداد و مشتری",
      "ثبت دریافت‌ها و اقساط",
      "تقویم رزرو و پیگیری مراسم",
      "گزارش‌های پایه مالی و عملیاتی",
    ],
  },
  {
    plan: "PROFESSIONAL",
    title: "پلن حرفه‌ای",
    badge: "پیشنهادی",
    priceLabel: "برای بهره‌برداری جدی",
    shortDescription: "برای تالارهایی که فروش، مالی و پیگیری روزانه فعال دارند",
    description: "گزینه اصلی برای تالارهای فعال که به مدیریت کامل‌تر قرارداد، مالی، اعلان و گزارش نیاز دارند.",
    bestFor: "مدیریت حرفه‌ای فروش، دریافت‌ها و پیگیری‌ها",
    features: [
      "همه امکانات پلن پایه",
      "مدیریت سالن، منو، خدمات و تنظیمات قرارداد",
      "اعلان‌ها، پیام‌ها و پیگیری‌های سیستمی",
      "گزارش‌های مدیریتی دقیق‌تر",
    ],
  },
  {
    plan: "ENTERPRISE",
    title: "پلن سازمانی",
    priceLabel: "قیمت‌گذاری توافقی",
    shortDescription: "برای مجموعه‌های چندتالاره یا نیازمند راه‌اندازی اختصاصی",
    description: "برای مجموعه‌هایی که چند فضای کاری، آموزش، استقرار اختصاصی یا هماهنگی ویژه نیاز دارند.",
    bestFor: "استقرار اختصاصی و توسعه قابل مذاکره",
    features: [
      "همه امکانات پلن حرفه‌ای",
      "هماهنگی اختصاصی برای استقرار",
      "پیگیری اولویت‌دار از طریق تیکت",
      "امکان بررسی نیازهای سفارشی",
    ],
  },
];

export const planCatalogByValue = new Map(
  planCatalog.map((item) => [item.plan, item]),
);

export function getPurchasablePlan(
  plan: FormDataEntryValue | string | null | undefined,
) {
  if (typeof plan !== "string") return null;
  return planCatalogByValue.get(plan as PurchasablePlan) ?? null;
}

export function isPurchaseRequestReference(value: string | null | undefined) {
  return Boolean(value?.startsWith("PURCHASE_REQUEST:"));
}
