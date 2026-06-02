import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Calculator,
  HandCoins,
  Percent,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { saveOwnerOperationSettingAction } from "@/lib/actions/owner-operation-setting-actions";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, formatJalaliDayKey } from "@/lib/date/jalali";
import {
  defaultOwnerOperationSetting,
  formatPercentValue,
  formatTomanValue,
  ownerOperationModelDescriptions,
  ownerOperationModelLabels,
  ownerOperationModelOptions,
  ownerSettlementCycleLabels,
  ownerSettlementCycleOptions,
} from "@/lib/owner-operation/owner-operation-settings";
import { getPrisma } from "@/lib/prisma";

const inputClass =
  "w-full rounded-2xl border border-[#d8c08b]/65 bg-white/86 px-3 py-3 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/55 focus:bg-white";

export default async function OwnerOperationSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string }>;
}) {
  const membership = await requireTenantPermission("owner.settings.view");
  const db = await getPrisma();
  const params = await searchParams;
  const setting = await db.ownerOperationSetting.findUnique({
    where: { tenantId: membership.tenantId },
  });

  const operationModel =
    setting?.operationModel ?? defaultOwnerOperationSetting.operationModel;
  const settlementCycle =
    setting?.settlementCycle ?? defaultOwnerOperationSetting.settlementCycle;
  const ownerRevenueSharePercent =
    setting?.ownerRevenueSharePercent?.toString() ??
    defaultOwnerOperationSetting.ownerRevenueSharePercent;
  const ownerCancellationSharePercent =
    setting?.ownerCancellationSharePercent?.toString() ??
    defaultOwnerOperationSetting.ownerCancellationSharePercent;
  const monthlyMinimumGuarantee =
    setting?.monthlyMinimumGuarantee?.toString() ??
    defaultOwnerOperationSetting.monthlyMinimumGuarantee;
  const effectiveFrom = formatJalaliDayKey(
    setting?.effectiveFrom ?? defaultOwnerOperationSetting.effectiveFrom,
  );
  const isActive = setting?.isActive ?? defaultOwnerOperationSetting.isActive;
  const note = setting?.note ?? defaultOwnerOperationSetting.note;
  const lastUpdated = setting?.updatedAt
    ? formatJalaliDateTime(setting.updatedAt)
    : "هنوز ذخیره رسمی انجام نشده است";

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_15rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_18px_54px_rgba(17,24,39,0.09)] sm:rounded-[1.85rem] sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <HandCoins size={15} />
              مدل بهره‌برداری و سهم مالک
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              تنظیمات مالک، پیمان و حداقل تضمین
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              مدل بهره‌برداری، درصد سهم مالک، سهم کنسلی، حداقل تضمین و تاریخ شروع کنترل مالی از این صفحه مدیریت می‌شود.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/72 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm"
          >
            بازگشت به تنظیمات
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {params?.saved === "1" ? (
        <div className="rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] px-4 py-3 text-sm font-black leading-7 text-[#17483f]">
          تنظیمات مالک و مدل بهره‌برداری با موفقیت ثبت شد.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          icon={Building2}
          label="مدل فعلی"
          value={ownerOperationModelLabels[operationModel]}
          source="این مقدار از رکورد تنظیمات مالک خوانده می‌شود و تعیین می‌کند تالار با چه مدل بهره‌برداری اداره می‌شود."
        />
        <SummaryCard
          icon={Percent}
          label="سهم مراسم"
          value={formatPercentValue(ownerRevenueSharePercent)}
          source="این درصد در محاسبه سهم مالک از فاکتورهای قطعی بعد از مراسم استفاده می‌شود."
        />
        <SummaryCard
          icon={ShieldCheck}
          label="سهم کنسلی"
          value={formatPercentValue(ownerCancellationSharePercent)}
          source="این درصد فقط برای درآمد یا خسارت کنسلی‌های معتبر بعد از تاریخ شروع کنترل مالی استفاده می‌شود."
        />
        <SummaryCard
          icon={WalletCards}
          label="حداقل تضمین ماهانه"
          value={formatTomanValue(monthlyMinimumGuarantee)}
          source="اگر سهم محاسبه‌شده مالک در یک ماه کمتر از این عدد باشد، تسویه مالک نباید از این حد پایین‌تر ثبت شود."
          strong
        />
        <SummaryCard
          icon={BadgeCheck}
          label="شروع کنترل اجباری"
          value={formatJalaliDateTime(
            setting?.effectiveFrom ?? defaultOwnerOperationSetting.effectiveFrom,
          )}
          source="قراردادهای قبل از این تاریخ آرشیوی هستند و در تسویه مالک، کنترل مالی و قفل تعیین‌تکلیف ۲۴ ساعته محاسبه نمی‌شوند."
        />
      </div>

      <form
        action={saveOwnerOperationSettingAction}
        className="rounded-[1.45rem] border border-[#d8c08b]/65 bg-[#fff9ee]/96 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.85rem] sm:p-5"
      >
        <div className="space-y-5">
          <FormSection
            title="۱. مدل بهره‌برداری"
            description="ابتدا نوع همکاری و دوره تسویه مالک را مشخص کنید."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="نوع بهره‌برداری تالار"
                description="برای سناریوی فعلی، مدیریت پیمانی با حداقل تضمین مناسب است."
              >
                <select
                  name="operationModel"
                  defaultValue={operationModel}
                  className={inputClass}
                >
                  {ownerOperationModelOptions.map((option) => (
                    <option key={option} value={option}>
                      {ownerOperationModelLabels[option]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="دوره تسویه مالک"
                description="در تنظیمات فعلی فقط تسویه ماهانه مجاز است."
              >
                <select
                  name="settlementCycle"
                  defaultValue={settlementCycle}
                  className={inputClass}
                >
                  {ownerSettlementCycleOptions.map((option) => (
                    <option key={option} value={option}>
                      {ownerSettlementCycleLabels[option]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="۲. درصدها و حداقل تضمین"
            description="درصد سهم مراسم، درصد سهم کنسلی و کف تضمین ماهانه را وارد کنید."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field
                label="سهم مالک از مراسم برگزارشده"
                description="درصدی از مبلغ فاکتور قطعی بعد از مراسم."
              >
                <div className="relative">
                  <input
                    name="ownerRevenueSharePercent"
                    defaultValue={ownerRevenueSharePercent}
                    inputMode="decimal"
                    className={`${inputClass} pl-10`}
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#7d6841]">
                    ٪
                  </span>
                </div>
              </Field>

              <Field
                label="سهم مالک از کنسلی"
                description="درصد سهم مالک از مبلغ خسارت یا درآمد کنسلی."
              >
                <div className="relative">
                  <input
                    name="ownerCancellationSharePercent"
                    defaultValue={ownerCancellationSharePercent}
                    inputMode="decimal"
                    className={`${inputClass} pl-10`}
                  />
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-[#7d6841]">
                    ٪
                  </span>
                </div>
              </Field>

              <Field
                label="حداقل تضمین ماهانه مالک"
                description="اگر سهم واقعی کمتر از این عدد باشد، تسویه مالک نباید از این کمتر شود."
              >
                <input
                  name="monthlyMinimumGuarantee"
                  defaultValue={monthlyMinimumGuarantee}
                  inputMode="numeric"
                  className={inputClass}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="۳. شروع کنترل و وضعیت"
            description="تاریخ شروع باعث می‌شود قراردادهای قدیمی فقط آرشیوی بمانند و وارد محاسبات جاری نشوند."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="شروع کنترل مالی و تعیین تکلیف اجباری"
                description="برای شروع از اول خرداد ۱۴۰۵ مقدار 1405-03-01 را ثبت کنید."
              >
                <input
                  name="effectiveFrom"
                  defaultValue={effectiveFrom}
                  inputMode="numeric"
                  dir="ltr"
                  className={inputClass}
                />
              </Field>

              <Field
                label="وضعیت اعتبار تنظیمات"
                description="غیرفعال کردن یعنی محاسبه سهم مالک نباید با این تنظیمات انجام شود."
              >
                <select
                  name="isActive"
                  defaultValue={isActive ? "ON" : "OFF"}
                  className={inputClass}
                >
                  <option value="ON">فعال</option>
                  <option value="OFF">غیرفعال</option>
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="۴. یادداشت داخلی"
            description="این متن فقط برای توضیح قرارداد بهره‌برداری و کنترل‌های داخلی استفاده می‌شود."
          >
            <textarea
              name="note"
              defaultValue={note ?? ""}
              rows={4}
              className={`${inputClass} min-h-28 resize-y leading-8`}
            />
          </FormSection>

          <div className="rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] p-4 text-center text-sm font-bold leading-7 text-[#17483f]">
            قراردادها و داده‌های قبل از «شروع کنترل مالی و تعیین تکلیف اجباری» برای سابقه در سامانه باقی می‌مانند، اما در تسویه مالک، کنترل مالی مالک، نمای مالی مالک و هشدار اجباری بعد از مراسم محاسبه یا نمایش داده نمی‌شوند.
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-[#d8c08b]/50 bg-white/58 p-3">
            <Link
              href="/dashboard/settings"
              className="rounded-2xl border border-[#d8c08b]/65 bg-white/78 px-4 py-2.5 text-sm font-black text-[#7d6841]"
            >
              انصراف
            </Link>
            <button
              type="submit"
              className="rounded-2xl border border-[#17483f]/15 bg-[#17483f] px-5 py-2.5 text-sm font-black text-[#fff8ea] shadow-[0_12px_30px_rgba(23,72,63,0.18)] transition hover:-translate-y-0.5"
            >
              ذخیره تنظیمات مالک
            </button>
          </div>
        </div>
      </form>

      <div className="grid gap-3 lg:grid-cols-3">
        <InfoCard icon={Calculator} title="فرمول اثر بعدی">
          <p>سهم مالک از مراسم = جمع فاکتورهای قطعی × درصد سهم مراسم</p>
          <p>سهم مالک از کنسلی = جمع درآمد کنسلی × درصد سهم کنسلی</p>
          <p>مبلغ نهایی مالک = بیشترین مقدار بین سهم محاسباتی و حداقل تضمین ماهانه</p>
        </InfoCard>
        <InfoCard icon={BadgeCheck} title="وضعیت تنظیمات">
          <p>
            {isActive
              ? "تنظیمات فعال است و محاسبات مالک و قفل تعیین‌تکلیف از تاریخ شروع تعیین‌شده به بعد اجرا می‌شود."
              : "تنظیمات غیرفعال است و مسیرهای مالی مالک باید با وضعیت امن متوقف شوند."}
          </p>
          <p className="mt-2">آخرین ویرایش: {lastUpdated}</p>
        </InfoCard>
        <InfoCard icon={Building2} title="شرح مدل انتخابی">
          <p>{ownerOperationModelDescriptions[operationModel]}</p>
        </InfoCard>
      </div>
    </section>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-white/42 p-4">
      <div className="mb-4 text-center md:text-right">
        <h2 className="text-base font-black text-[#111827]">{title}</h2>
        <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <span className="text-xs font-bold leading-6 text-[#7d6841]">
        {description}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  source,
  strong = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  source: string;
  strong?: boolean;
}) {
  return (
    <article
      className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${
        strong
          ? "border-[#17483f]/22 bg-[#f1fbf5] text-[#17483f]"
          : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"
      }`}
    >
      <div className="flex min-h-32 flex-col items-center justify-center gap-2">
        <p className="text-center text-xs font-black opacity-75">{label}</p>
        <span className="flex size-10 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]">
          <Icon size={18} />
        </span>
        <p className="text-center text-lg font-black leading-7">{value}</p>
      </div>
      <details className="mt-3 rounded-2xl border border-[#d8c08b]/45 bg-white/55 px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49] open:text-right">
        <summary className="cursor-pointer list-none text-center font-black text-[#7d6841]">
          منبع داده
        </summary>
        <p className="mt-2">{source}</p>
      </details>
    </article>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-center text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <span className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]">
        <Icon size={18} />
      </span>
      <h2 className="mt-3 font-black text-[#111827]">{title}</h2>
      <div className="mt-2 space-y-1">{children}</div>
    </article>
  );
}
