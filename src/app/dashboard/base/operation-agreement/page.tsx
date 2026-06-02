import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Landmark,
  Percent,
  ShieldCheck,
} from "lucide-react";
import {
  HallOperationAgreementForm,
  type HallOperationAgreementFormValues,
} from "@/components/dashboard/hall-operation-agreement-form";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toDateOnlyString } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import {
  agreementStatusLabels,
  buildOperationAgreementSummary,
  offInvoicePolicyLabels,
  operationModelLabels,
  settlementCycleLabels,
} from "@/lib/hall-operation-agreement/options";
import { getPrisma } from "@/lib/prisma";

export default async function HallOperationAgreementPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const [activeAgreement, latestAgreement, halls] = await Promise.all([
    db.hallOperationAgreement.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: { hall: { select: { name: true } } },
      orderBy: [{ effectiveFrom: "desc" }, { updatedAt: "desc" }],
    }),
    db.hallOperationAgreement.findFirst({
      where: { tenantId },
      include: { hall: { select: { name: true } } },
      orderBy: [{ updatedAt: "desc" }],
    }),
    db.hall.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const visibleAgreement = activeAgreement ?? latestAgreement;
  const values = toFormValues(visibleAgreement);
  const summary = buildOperationAgreementSummary(values);

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Landmark size={15} />
              تعاریف پایه / بهره‌برداری تالار
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              مدل بهره‌برداری و سهم مالک
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              مدل مالکیت، بهره‌برداری، اجاره، مدیریت پیمانی و حداقل تضمین مالک را برای فضای کاری تالار ثبت کنید. این فاز فقط زیرساخت تنظیمات است و تسویه واقعی ماهانه نمی‌سازد.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-3 py-1">
                <CalendarDays size={15} className="text-[#9f7131]" />
                {formatJalaliDate(new Date())}
              </span>
              <span className="rounded-full border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-3 py-1">
                {membership.tenant.name}
              </span>
              <span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1 text-[#17483f]">
                {activeAgreement ? "توافق فعال ثبت شده" : "نیازمند ثبت توافق"}
              </span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-80 sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">وضعیت فعلی</p>
            <h2 className="mt-2 text-2xl font-black text-[#fff9ed]">
              {visibleAgreement ? operationModelLabels[values.operationModel] : "تعریف نشده"}
            </h2>
            <div className="gold-divider my-4" />
            <p className="text-sm font-bold leading-7 text-[#d9caa9]">
              {visibleAgreement
                ? `آخرین به‌روزرسانی: ${formatJalaliDateTime(visibleAgreement.updatedAt)}`
                : "برای شروع، فرم پایین صفحه را تکمیل و ذخیره کنید."}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard
          label="مدل اقتصادی"
          value={operationModelLabels[values.operationModel]}
          icon={Landmark}
        />
        <SummaryCard
          label="سهم مالک از مراسم"
          value={values.ownerEventSharePercent ? `${formatPersianNumber(values.ownerEventSharePercent)}٪` : "—"}
          icon={Percent}
        />
        <SummaryCard
          label="حداقل تضمین / اجاره"
          value={getPrimaryMoneyLabel(values)}
          icon={Banknote}
        />
        <SummaryCard
          label="دوره تسویه"
          value={settlementCycleLabels[values.settlementCycle]}
          icon={CalendarDays}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <HallOperationAgreementForm
          values={values}
          halls={halls}
          canEdit={canEdit}
        />

        <aside className="space-y-4">
          <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
            <p className="text-xs font-black text-[#f0dba9]">خلاصه توافق فعال</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">
              {visibleAgreement?.agreementTitle || "مدل بهره‌برداری"}
            </h2>
            <div className="gold-divider my-5" />
            <div className="grid gap-2.5">
              <InfoRow label="مالک" value={values.ownerName || "ثبت نشده"} />
              <InfoRow label="بهره‌بردار" value={values.operatorName || "ثبت نشده"} />
              <InfoRow label="تالار" value={visibleAgreement?.hall?.name ?? "کل فضای کاری"} />
              <InfoRow label="وضعیت" value={agreementStatusLabels[values.status]} />
              <InfoRow label="درآمد خارج از فاکتور" value={offInvoicePolicyLabels[values.offInvoiceIncomePolicy]} />
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black text-[#17483f]">
              <CheckCircle2 size={16} />
              خلاصه قابل بررسی
            </div>
            <p className="mt-3 text-sm font-black leading-8 text-[#6d5f49]">
              {summary}
            </p>
          </section>

          <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
            <div className="flex items-center gap-2 text-xs font-black text-[#17483f]">
              <ShieldCheck size={16} />
              مرزبندی فاز ۲۸
            </div>
            <ul className="mt-3 grid gap-2 text-sm font-bold leading-7 text-[#6d5f49]">
              <li>تسویه ماهانه مالک در این فاز محاسبه نمی‌شود.</li>
              <li>فاکتور پس از مراسم یا پرداخت به مالک ساخته نشده است.</li>
              <li>پرسشنامه درآمد خارج از فاکتور برای مشتری فعال نشده است.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BadgeCheck;
}) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <div className="flex items-center gap-2 text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
        <Icon size={16} className="text-[#9f7131]" />
        {label}
      </div>
      <p className="mt-2 break-words text-lg font-black leading-tight sm:text-xl">
        {value}
      </p>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
      <p className="text-xs font-black text-[#f0dba9]">{label}</p>
      <p className="mt-1 text-sm font-black leading-6 text-[#fff9ed]">{value}</p>
    </div>
  );
}

function getPrimaryMoneyLabel(values: HallOperationAgreementFormValues) {
  if (values.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT") {
    return values.monthlyMinimumGuaranteeAmount
      ? `${formatPersianNumber(values.monthlyMinimumGuaranteeAmount)} تومان`
      : "—";
  }

  if (values.operationModel === "FIXED_RENT" || values.operationModel === "FIXED_RENT_PLUS_PERCENTAGE") {
    return values.monthlyFixedRentAmount
      ? `${formatPersianNumber(values.monthlyFixedRentAmount)} تومان`
      : "—";
  }

  return "—";
}

function toFormValues(
  agreement: {
    id: string;
    hallId: string | null;
    operationModel: HallOperationAgreementFormValues["operationModel"];
    ownerName: string;
    operatorName: string | null;
    agreementTitle: string | null;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    status: HallOperationAgreementFormValues["status"];
    ownerEventSharePercent: { toString(): string } | null;
    ownerCancellationSharePercent: { toString(): string } | null;
    ownerExtraServiceSharePercent: { toString(): string } | null;
    includeExtraServicesInOwnerShare: boolean;
    monthlyMinimumGuaranteeAmount: { toString(): string } | null;
    monthlyFixedRentAmount: { toString(): string } | null;
    settlementCycle: HallOperationAgreementFormValues["settlementCycle"];
    settlementDayOfMonth: number | null;
    offInvoiceIncomePolicy: HallOperationAgreementFormValues["offInvoiceIncomePolicy"];
    notes: string | null;
  } | null,
): HallOperationAgreementFormValues {
  return {
    id: agreement?.id ?? "",
    hallId: agreement?.hallId ?? "",
    operationModel: agreement?.operationModel ?? "GUARANTEED_PERCENTAGE_MANAGEMENT",
    ownerName: agreement?.ownerName ?? "",
    operatorName: agreement?.operatorName ?? "",
    agreementTitle: agreement?.agreementTitle ?? "",
    effectiveFrom: toDateOnlyString(agreement?.effectiveFrom ?? new Date()),
    effectiveTo: toDateOnlyString(agreement?.effectiveTo),
    status: agreement?.status ?? "ACTIVE",
    ownerEventSharePercent: agreement?.ownerEventSharePercent?.toString() ?? "25",
    ownerCancellationSharePercent: agreement?.ownerCancellationSharePercent?.toString() ?? "50",
    ownerExtraServiceSharePercent: agreement?.ownerExtraServiceSharePercent?.toString() ?? "",
    includeExtraServicesInOwnerShare: agreement?.includeExtraServicesInOwnerShare ?? false,
    monthlyMinimumGuaranteeAmount: agreement?.monthlyMinimumGuaranteeAmount?.toString() ?? "150000000",
    monthlyFixedRentAmount: agreement?.monthlyFixedRentAmount?.toString() ?? "",
    settlementCycle: agreement?.settlementCycle ?? "MONTHLY",
    settlementDayOfMonth: agreement?.settlementDayOfMonth ? String(agreement.settlementDayOfMonth) : "",
    offInvoiceIncomePolicy: agreement?.offInvoiceIncomePolicy ?? "REPORT_ONLY",
    notes: agreement?.notes ?? "",
  };
}
