import type { OwnerOperationModel, OwnerSettlementCycle } from "@prisma/client";
import { jalaliToDate } from "@/lib/date/jalali";

export const ownerOperationModelLabels: Record<OwnerOperationModel, string> = {
  OWNER_OPERATED: "مالک، بهره‌بردار مستقیم تالار است",
  FIXED_RENT: "اجاره ثابت ماهانه",
  MANAGEMENT_CONTRACT: "مدیریت پیمانی درصدی",
  MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE: "مدیریت پیمانی با حداقل تضمین",
};

export const ownerOperationModelDescriptions: Record<OwnerOperationModel, string> = {
  OWNER_OPERATED: "کل درآمد و هزینه‌ها برای مالک ثبت می‌شود و سهم پیمانکار محاسبه نمی‌شود.",
  FIXED_RENT: "مالک اجاره ثابت دریافت می‌کند و درصدی از قراردادها محاسبه نمی‌شود.",
  MANAGEMENT_CONTRACT: "مالک از هر مراسم برگزارشده و کنسلی درصد مشخص دریافت می‌کند.",
  MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE:
    "مالک درصد مشخص دریافت می‌کند، اما اگر سهم ماهانه کمتر از حداقل تضمین باشد، حداقل ماهانه ملاک تسویه است.",
};

export const ownerSettlementCycleLabels: Record<OwnerSettlementCycle, string> = {
  MONTHLY: "ماهانه",
};

export const ownerOperationModelOptions: OwnerOperationModel[] = [
  "OWNER_OPERATED",
  "FIXED_RENT",
  "MANAGEMENT_CONTRACT",
  "MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE",
];

export const ownerSettlementCycleOptions: OwnerSettlementCycle[] = ["MONTHLY"];

export const defaultOwnerOperationStartJalaliDayKey = "1405-03-01";
export const defaultOwnerOperationStartDate = jalaliToDate(1405, 3, 1);

export const defaultOwnerOperationSetting = {
  operationModel: "MANAGEMENT_CONTRACT_WITH_MINIMUM_GUARANTEE" as OwnerOperationModel,
  ownerRevenueSharePercent: "25",
  ownerCancellationSharePercent: "50",
  monthlyMinimumGuarantee: "150000000",
  settlementCycle: "MONTHLY" as OwnerSettlementCycle,
  effectiveFrom: defaultOwnerOperationStartDate,
  effectiveFromJalaliDayKey: defaultOwnerOperationStartJalaliDayKey,
  isActive: true,
  note: "مدل پیش‌فرض پیشنهادی: ۲۵٪ سهم مالک از مراسم برگزارشده، ۵۰٪ سهم مالک از کنسلی، حداقل تضمین ماهانه ۱۵۰٬۰۰۰٬۰۰۰ تومان. شروع محاسبات مالک و تعیین تکلیف اجباری مراسم از ۱ خرداد ۱۴۰۵.",
};

export function isValidOwnerOperationModel(value: string): value is OwnerOperationModel {
  return ownerOperationModelOptions.includes(value as OwnerOperationModel);
}

export function isValidOwnerSettlementCycle(value: string): value is OwnerSettlementCycle {
  return ownerSettlementCycleOptions.includes(value as OwnerSettlementCycle);
}

export function formatPercentValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "—";
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(numberValue)}٪`;
}

export function formatTomanValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "—";
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(numberValue)} تومان`;
}
