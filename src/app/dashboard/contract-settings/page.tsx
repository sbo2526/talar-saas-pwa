import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  FileText,
  Hash,
  Percent,
  PenLine,
  Printer,
  Save,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CONTRACT_SETTING_FORM_ID,
  ContractSettingForm,
  type ContractSettingFormValues,
} from "@/components/dashboard/contract-setting-form";
import { HallLogoUploadPanel } from "@/components/dashboard/hall-logo-upload-panel";
import { requireTenantMember } from "@/lib/auth/session";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { contractCancellationPolicyText } from "@/lib/contracts/cancellation-policy";
import { getPrisma } from "@/lib/prisma";

const defaultContractTexts = {
  defaultClauses:
    "شرایط اختصاصی هر قرارداد در زمان ثبت مراسم تکمیل و در نسخه چاپی قرارداد درج می‌شود.",
  paymentTerms:
    "زمان‌بندی بیعانه، اقساط و تسویه نهایی طبق توافق طرفین در قرارداد ثبت می‌شود.",
  cancellationPolicy: contractCancellationPolicyText,
  footerNote: "امضای طرفین به منزله پذیرش مفاد قرارداد است.",
  templateBody:
    "اطلاعات تالار، مشتری، مراسم، خدمات، منوی پذیرایی و دریافت‌ها به‌صورت خودکار در متن قرارداد جای‌گذاری می‌شود.",
};

export default async function ContractSettingsPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const [settings, hallProfile] = await Promise.all([
    db.contractSetting.findUnique({ where: { tenantId } }),
    db.tenantHallProfile.findUnique({
      where: { tenantId },
      select: {
        brandName: true,
        legalName: true,
        licenseNumber: true,
        licenseImageUrl: true,
        hallLogoUrl: true,
      },
    }),
  ]);

  const values: ContractSettingFormValues = {
    contractPrefix: settings?.contractPrefix ?? "TLR",
    nextNumber: settings?.nextNumber ? String(settings.nextNumber) : "1",
    fiscalYear: settings?.fiscalYear ?? "",
    defaultDepositPercent: settings?.defaultDepositPercent?.toString() ?? "0",
    defaultTaxPercent: settings?.defaultTaxPercent?.toString() ?? "0",
    defaultDiscountPercent:
      settings?.defaultDiscountPercent?.toString() ?? "0",
    defaultClauses: cleanContractText(
      settings?.defaultClauses,
      defaultContractTexts.defaultClauses,
    ),
    paymentTerms: cleanContractText(
      settings?.paymentTerms,
      defaultContractTexts.paymentTerms,
    ),
    cancellationPolicy: cleanContractText(
      settings?.cancellationPolicy,
      defaultContractTexts.cancellationPolicy,
    ),
    footerNote: cleanContractText(settings?.footerNote, defaultContractTexts.footerNote),
    templateBody: cleanContractText(
      settings?.templateBody,
      defaultContractTexts.templateBody,
    ),
    customerSignatureLabel:
      settings?.customerSignatureLabel ?? "امضای مشتری",
    managerSignatureLabel:
      settings?.managerSignatureLabel ?? "امضای مدیر تالار",
    printTemplateName: settings?.printTemplateName ?? "قالب رسمی تالار",
    showLogoOnPrint: settings?.showLogoOnPrint ?? true,
    showLicenseInfoOnPrint: settings?.showLicenseInfoOnPrint ?? true,
    requireNationalCode: settings?.requireNationalCode ?? false,
    requirePhone: settings?.requirePhone ?? true,
  };

  const sampleNumber = buildContractNumberPreview(values);
  const readiness = getReadiness(values);
  const isReady = readiness.incomplete.length === 0;
  const tenantDisplayName =
    hallProfile?.brandName || hallProfile?.legalName || membership.tenant.name;
  const hasLicenseInfo = Boolean(
    hallProfile?.licenseNumber || hallProfile?.licenseImageUrl,
  );

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <FileSignature size={15} />
              مرکز تنظیمات قرارداد
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              تنظیمات قرارداد
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              شماره‌گذاری، پیش‌فرض‌های مالی، شروط قرارداد، قالب چاپ و امضاهای
              قراردادهای تالار را از این بخش مدیریت کنید.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-3 py-1">
                <CalendarDays size={15} className="text-[#9f7131]" />
                {formatJalaliDate(new Date())}
              </span>
              <span className="rounded-full border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-3 py-1">
                {tenantDisplayName}
              </span>
              <span
                className={`rounded-full border px-3 py-1 ${
                  isReady
                    ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
                    : "border-[#c7a15a]/30 bg-[#c7a15a]/10 text-[#7d6841]"
                }`}
              >
                {isReady ? "کامل" : "نیازمند تکمیل"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:min-w-64">
            <button
              type="submit"
              form={CONTRACT_SETTING_FORM_ID}
              disabled={!canEdit}
              className="btn-luxury-dark justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />
              ذخیره تنظیمات
            </button>
            <a
              href="#contract-preview"
              className="btn-luxury-secondary justify-center px-5 py-3"
            >
              <FileText size={17} />
              پیش‌نمایش قرارداد
            </a>
          </div>
        </div>
      </div>

      <ReadinessOverview readiness={readiness} isReady={isReady} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard label="شماره قرارداد بعدی" value={sampleNumber} icon={Hash} />
        <SummaryCard
          label="بیعانه پیش‌فرض"
          value={`${formatPersianNumber(values.defaultDepositPercent)}٪`}
          icon={Percent}
        />
        <SummaryCard
          label="قالب چاپ"
          value={values.printTemplateName || "نیازمند تکمیل"}
          icon={Printer}
        />
        <SummaryCard
          label="آخرین به‌روزرسانی"
          value={formatJalaliDateTime(settings?.updatedAt)}
          icon={CalendarDays}
        />
      </div>

      <details className="xl:hidden" id="contract-preview-mobile">
        <summary className="cursor-pointer rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 px-4 py-3 text-sm font-black text-[#111827] shadow-[0_14px_44px_rgba(17,24,39,0.07)]">
          نمایش پیش‌نمایش قرارداد
        </summary>
        <div className="mt-3">
          <PreviewPanel
            sampleNumber={sampleNumber}
            values={values}
            isReady={isReady}
            updatedAt={settings?.updatedAt ?? null}
            hasLicenseInfo={hasLicenseInfo}
          />
        </div>
      </details>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-4">
          <HallLogoUploadPanel logoUrl={hallProfile?.hallLogoUrl} canEdit={canEdit} />
          <ContractSettingForm values={values} canEdit={canEdit} />
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-5 space-y-4">
            <PreviewPanel
              sampleNumber={sampleNumber}
              values={values}
              isReady={isReady}
              updatedAt={settings?.updatedAt ?? null}
              hasLicenseInfo={hasLicenseInfo}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}

function cleanContractText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();

  if (!normalized) {
    return fallback;
  }

  const lower = normalized.toLowerCase();
  const isNonProduction =
    lower.includes("demo") ||
    normalized.includes("دوره بررسی") ||
    lower.includes("todo") ||
    lower.includes("mvp") ||
    lower.includes("placeholder");

  return isNonProduction ? fallback : normalized;
}

function buildContractNumberPreview(values: ContractSettingFormValues) {
  const nextNumber = String(values.nextNumber || "1").padStart(4, "0");
  const parts = [values.contractPrefix || "TALAR"];

  if (values.fiscalYear) {
    parts.push(values.fiscalYear);
  }

  parts.push(nextNumber);
  return parts.map((part) => toPersianDigits(part)).join("-");
}

function getReadiness(values: ContractSettingFormValues) {
  const checklist = [
    {
      href: "#contract-numbering",
      label: "شماره‌گذاری قرارداد",
      complete: Boolean(values.contractPrefix && values.nextNumber),
    },
    {
      href: "#contract-financial",
      label: "پیش‌فرض‌های مالی",
      complete: [
        values.defaultDepositPercent,
        values.defaultTaxPercent,
        values.defaultDiscountPercent,
      ].every((value) => value !== ""),
    },
    {
      href: "#contract-texts",
      label: "شروط و متن‌های قرارداد",
      complete: Boolean(
        values.defaultClauses &&
          values.paymentTerms &&
          values.cancellationPolicy &&
          values.footerNote &&
          values.templateBody,
      ),
    },
    {
      href: "#contract-print",
      label: "قالب چاپ و امضا",
      complete: Boolean(
        values.printTemplateName &&
          values.customerSignatureLabel &&
          values.managerSignatureLabel,
      ),
    },
  ];
  const completeCount = checklist.filter((item) => item.complete).length;
  const percentage = Math.round((completeCount / checklist.length) * 100);

  return {
    checklist,
    percentage,
    completeCount,
    incomplete: checklist.filter((item) => !item.complete),
  };
}

function ReadinessOverview({
  readiness,
  isReady,
}: {
  readiness: ReturnType<typeof getReadiness>;
  isReady: boolean;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr] lg:items-center">
        <div>
          <p className="text-xs font-black text-[#17483f]">آمادگی تنظیمات</p>
          <h2 className="mt-1 text-xl font-black">
            {isReady
              ? "تنظیمات پایه کامل است"
              : `${formatPersianNumber(readiness.incomplete.length)} بخش نیازمند تکمیل است`}
          </h2>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#eadbbf]">
            <div
              className="h-full rounded-full bg-[#17483f]"
              style={{ width: `${readiness.percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-black text-[#7d6841]">
            {formatPersianNumber(readiness.percentage)}٪ تکمیل شده
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {readiness.checklist.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3 transition hover:border-[#c7a15a]/75"
            >
              {item.complete ? (
                <CheckCircle2 className="shrink-0 text-[#17483f]" size={18} />
              ) : (
                <BadgeCheck className="shrink-0 text-[#c7a15a]" size={18} />
              )}
              <span className="text-sm font-black leading-6">{item.label}</span>
            </a>
          ))}
        </div>
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
  icon: LucideIcon;
}) {
  return (
    <article className="min-h-32 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
        <Icon size={17} />
      </span>
      <p className="mt-3 text-xs font-black leading-6 text-[#7d6841] sm:text-sm">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black leading-tight sm:text-xl">
        {value}
      </p>
    </article>
  );
}

function PreviewPanel({
  sampleNumber,
  values,
  isReady,
  updatedAt,
  hasLicenseInfo,
}: {
  sampleNumber: string;
  values: ContractSettingFormValues;
  isReady: boolean;
  updatedAt: Date | null;
  hasLicenseInfo: boolean;
}) {
  return (
    <section
      id="contract-preview"
      className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#17483f]">پیش‌نمایش قرارداد</p>
          <h2 className="mt-1 text-xl font-black">قالب فعال چاپ</h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-black ${
            isReady
              ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
              : "border-[#c7a15a]/30 bg-[#c7a15a]/10 text-[#7d6841]"
          }`}
        >
          {isReady ? "آماده" : "نیازمند تکمیل"}
        </span>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4">
        <div className="flex items-center justify-between gap-3 border-b border-[#d8c08b]/45 pb-3">
          <span className="text-sm font-bold text-[#7d6841]">شماره قرارداد</span>
          <span className="text-lg font-black text-[#111827]">{sampleNumber}</span>
        </div>
        <p className="mt-4 text-sm font-black text-[#111827]">قرارداد برگزاری مراسم</p>
        <p className="mt-2 line-clamp-4 text-xs font-bold leading-6 text-[#6d5f49]">
          {values.defaultClauses}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <SignatureBox label={values.customerSignatureLabel} />
          <SignatureBox label={values.managerSignatureLabel} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold leading-6 text-[#6d5f49]">
        <span>قالب چاپ: {values.printTemplateName}</span>
        <span>
          نمونه مالی: بیعانه {formatIRR(percentOf(100_000_000, values.defaultDepositPercent))}
        </span>
        <span>آخرین به‌روزرسانی: {formatJalaliDateTime(updatedAt)}</span>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-[#d8c08b]/55 bg-white/45 p-3 text-xs font-bold leading-6 text-[#7d6841]">
        <span>{values.showLogoOnPrint ? "نمایش لوگو در چاپ فعال است." : "نمایش لوگو در چاپ غیرفعال است."}</span>
        <span>
          {hasLicenseInfo
            ? "اطلاعات مجوز برای چاپ آماده است."
            : "برای نمایش اطلاعات مجوز، اطلاعات تالار را تکمیل کنید."}
        </span>
        {hasLicenseInfo ? null : (
          <Link href="/dashboard/hall-info" className="font-black text-[#17483f] underline-offset-4 hover:underline">
            تکمیل اطلاعات تالار
          </Link>
        )}
      </div>
    </section>
  );
}

function percentOf(amount: number, percent: string) {
  const value = Number(String(percent).replace(/[،,]/g, "."));
  return Number.isFinite(value) ? Math.round((amount * value) / 100) : 0;
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#c7a15a]/55 bg-white/55 p-3 text-center text-xs font-black text-[#111827]">
      <PenLine className="mx-auto mb-2 text-[#9f7131]" size={17} />
      {label}
    </div>
  );
}
