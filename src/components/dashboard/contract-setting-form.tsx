"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Hash,
  Percent,
  Printer,
  Save,
  ShieldCheck,
  Signature,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { updateContractSettingAction } from "@/lib/actions/contract-setting-actions";
import { initialContractSettingActionState } from "@/lib/actions/contract-setting-state";
import { toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { contractCancellationPolicyText } from "@/lib/contracts/cancellation-policy";

export const CONTRACT_SETTING_FORM_ID = "contract-settings-form";

const sampleContractAmount = 100_000_000;

const suggestedTexts = {
  defaultClauses:
    "شرایط اختصاصی هر قرارداد در زمان ثبت مراسم تکمیل و در نسخه چاپی قرارداد درج می‌شود.",
  paymentTerms:
    "زمان‌بندی بیعانه، اقساط و تسویه نهایی طبق توافق طرفین در قرارداد ثبت می‌شود.",
  cancellationPolicy: contractCancellationPolicyText,
  footerNote: "امضای طرفین به منزله پذیرش مفاد قرارداد است.",
  templateBody:
    "اطلاعات تالار، مشتری، مراسم، خدمات، منوی پذیرایی و دریافت‌ها به‌صورت خودکار در متن قرارداد جای‌گذاری می‌شود.",
};

const sectionLinks = [
  { href: "#contract-numbering", label: "شماره‌گذاری", icon: Hash },
  { href: "#contract-financial", label: "پیش‌فرض‌های مالی", icon: Percent },
  { href: "#contract-customer", label: "اطلاعات مشتری", icon: ShieldCheck },
  { href: "#contract-texts", label: "متن‌های قرارداد", icon: FileText },
  { href: "#contract-print", label: "چاپ و امضا", icon: Printer },
] as const;

export type ContractSettingFormValues = {
  contractPrefix: string;
  nextNumber: string;
  fiscalYear: string;
  defaultDepositPercent: string;
  defaultTaxPercent: string;
  defaultDiscountPercent: string;
  defaultClauses: string;
  paymentTerms: string;
  cancellationPolicy: string;
  footerNote: string;
  templateBody: string;
  customerSignatureLabel: string;
  managerSignatureLabel: string;
  printTemplateName: string;
  showLogoOnPrint: boolean;
  showLicenseInfoOnPrint: boolean;
  requireNationalCode: boolean;
  requirePhone: boolean;
};

export function ContractSettingForm({
  values,
  canEdit,
}: {
  values: ContractSettingFormValues;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    updateContractSettingAction,
    initialContractSettingActionState,
  );

  const financialPreview = useMemo(() => {
    const deposit = percentOf(sampleContractAmount, values.defaultDepositPercent);
    const tax = percentOf(sampleContractAmount, values.defaultTaxPercent);
    const discount = percentOf(sampleContractAmount, values.defaultDiscountPercent);

    return { deposit, tax, discount };
  }, [
    values.defaultDepositPercent,
    values.defaultDiscountPercent,
    values.defaultTaxPercent,
  ]);

  const previewParts = [values.contractPrefix || "TALAR"];
  if (values.fiscalYear) {
    previewParts.push(values.fiscalYear);
  }
  previewParts.push(String(values.nextNumber || "1").padStart(4, "0"));
  const nextNumberPreview = previewParts.map((part) => toPersianDigits(part)).join("-");

  return (
    <form id={CONTRACT_SETTING_FORM_ID} action={formAction} className="grid gap-5">
      <nav className="sticky top-3 z-20 -mx-1 overflow-x-auto rounded-[1.45rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-2 shadow-[0_18px_50px_rgba(17,24,39,0.08)] backdrop-blur-xl">
        <div className="flex min-w-max items-center gap-2 px-1">
          {sectionLinks.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/86 px-3.5 py-2 text-xs font-black text-[#6d5f49] transition hover:border-[#c7a15a] hover:text-[#111827]"
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </div>
      </nav>

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند تنظیمات قرارداد را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <FormSection
        id="contract-numbering"
        icon={Hash}
        title="شماره‌گذاری قرارداد"
        description="الگوی شماره قراردادهای جدید را مشخص کنید تا شماره‌ها مرتب، قابل پیگیری و اختصاصی فضای کاری شما باشند."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            label="پیشوند شماره قرارداد"
            name="contractPrefix"
            defaultValue={values.contractPrefix}
            placeholder="TALAR"
            disabled={!canEdit}
            dir="ltr"
          />
          <Field
            label="شماره قرارداد بعدی"
            name="nextNumber"
            defaultValue={values.nextNumber}
            placeholder="۱۰۰۱"
            disabled={!canEdit}
            dir="ltr"
            inputMode="numeric"
          />
          <Field
            label="سال مالی / دوره قرارداد"
            name="fiscalYear"
            defaultValue={values.fiscalYear}
            placeholder="۱۴۰۵"
            disabled={!canEdit}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
            <p className="text-xs font-black text-[#7d6841]">شماره بعدی</p>
            <p className="mt-2 text-2xl font-black text-[#111827]">
              {nextNumberPreview}
            </p>
          </div>
          {values.contractPrefix.toUpperCase() === "DEMO" ? (
            <div className="rounded-[1.35rem] border border-[#c7a15a]/40 bg-[#c7a15a]/10 p-4 text-sm font-bold leading-7 text-[#7d6841]">
              پیشنهاد: برای نسخه نهایی از پیشوند اختصاصی تالار استفاده کنید.
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-[#25a46d]/20 bg-[#25a46d]/10 p-4 text-sm font-bold leading-7 text-[#17483f]">
              پیشوند قرارداد برای شماره‌های آینده آماده است.
            </div>
          )}
        </div>
      </FormSection>

      <FormSection
        id="contract-financial"
        icon={Percent}
        title="پیش‌فرض‌های مالی"
        description="درصدهای پیشنهادی برای بیعانه، مالیات و تخفیف را تعیین کنید تا هنگام ثبت قرارداد سریع‌تر محاسبه شوند."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PercentField
            label="درصد بیعانه پیش‌فرض"
            name="defaultDepositPercent"
            defaultValue={values.defaultDepositPercent}
            disabled={!canEdit}
          />
          <PercentField
            label="درصد مالیات پیش‌فرض"
            name="defaultTaxPercent"
            defaultValue={values.defaultTaxPercent}
            disabled={!canEdit}
          />
          <PercentField
            label="درصد تخفیف پیش‌فرض"
            name="defaultDiscountPercent"
            defaultValue={values.defaultDiscountPercent}
            disabled={!canEdit}
          />
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
          <p className="text-sm font-black text-[#111827]">
            نمونه محاسبه برای قرارداد {formatIRR(sampleContractAmount)}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <PreviewAmount label="بیعانه پیشنهادی" value={financialPreview.deposit} />
            <PreviewAmount label="مالیات پیشنهادی" value={financialPreview.tax} />
            <PreviewAmount label="تخفیف پیشنهادی" value={financialPreview.discount} />
          </div>
        </div>
      </FormSection>

      <FormSection
        id="contract-customer"
        icon={ShieldCheck}
        title="اطلاعات الزامی مشتری"
        description="مشخص کنید ثبت قرارداد بدون کدام اطلاعات مشتری مجاز نباشد."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleField
            name="requireNationalCode"
            label="الزام کد ملی"
            description="در ثبت قرارداد، کد ملی مشتری اجباری باشد."
            defaultChecked={values.requireNationalCode}
            disabled={!canEdit}
          />
          <ToggleField
            name="requirePhone"
            label="الزام شماره تماس"
            description="در ثبت قرارداد، شماره تماس مشتری اجباری باشد."
            defaultChecked={values.requirePhone}
            disabled={!canEdit}
          />
        </div>
      </FormSection>

      <FormSection
        id="contract-texts"
        icon={FileText}
        title="متن‌های قراردادی پیش‌فرض"
        description="متن‌های رسمی قرارداد را یک‌بار تعریف کنید تا در قراردادهای آینده با ادبیات یکپارچه استفاده شوند."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Textarea
            label="شروط پیش‌فرض قرارداد"
            name="defaultClauses"
            defaultValue={values.defaultClauses}
            suggestedValue={suggestedTexts.defaultClauses}
            disabled={!canEdit}
            maxLength={5000}
          />
          <Textarea
            label="شرایط دریافت"
            name="paymentTerms"
            defaultValue={values.paymentTerms}
            suggestedValue={suggestedTexts.paymentTerms}
            disabled={!canEdit}
            maxLength={3000}
          />
          <Textarea
            label="شرایط لغو قرارداد"
            name="cancellationPolicy"
            defaultValue={values.cancellationPolicy}
            suggestedValue={suggestedTexts.cancellationPolicy}
            disabled={!canEdit}
            maxLength={3000}
          />
          <Textarea
            label="یادداشت فوتر قرارداد"
            name="footerNote"
            defaultValue={values.footerNote}
            suggestedValue={suggestedTexts.footerNote}
            disabled={!canEdit}
            maxLength={1000}
          />
          <Textarea
            label="قالب متن قرارداد"
            name="templateBody"
            defaultValue={values.templateBody}
            suggestedValue={suggestedTexts.templateBody}
            disabled={!canEdit}
            maxLength={6000}
            className="lg:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection
        id="contract-print"
        icon={Printer}
        title="چاپ و امضا"
        description="نام قالب چاپ، عنوان امضاها و نمایش لوگو یا اطلاعات مجوز را برای نسخه چاپی قرارداد تنظیم کنید."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <Field
            label="نام قالب چاپ"
            name="printTemplateName"
            defaultValue={values.printTemplateName}
            placeholder="قالب رسمی تالار"
            disabled={!canEdit}
          />
          <Field
            label="عنوان امضای مشتری"
            name="customerSignatureLabel"
            defaultValue={values.customerSignatureLabel}
            placeholder="امضای مشتری"
            disabled={!canEdit}
          />
          <Field
            label="عنوان امضای مدیر تالار"
            name="managerSignatureLabel"
            defaultValue={values.managerSignatureLabel}
            placeholder="امضای مدیر تالار"
            disabled={!canEdit}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1.1fr]">
          <ToggleField
            name="showLogoOnPrint"
            label="نمایش لوگو در چاپ"
            description="لوگوی تالار در سربرگ قرارداد چاپ شود."
            defaultChecked={values.showLogoOnPrint}
            disabled={!canEdit}
          />
          <ToggleField
            name="showLicenseInfoOnPrint"
            label="نمایش اطلاعات مجوز"
            description="اطلاعات مجوز تالار در نسخه چاپی نمایش داده شود."
            defaultChecked={values.showLicenseInfoOnPrint}
            disabled={!canEdit}
          />
          <div className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
            <p className="text-xs font-black text-[#7d6841]">پیش‌نمایش امضا</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm font-black text-[#111827]">
              <span className="rounded-2xl border border-dashed border-[#c7a15a]/55 bg-white/50 px-3 py-5">
                <Signature className="mx-auto mb-2 text-[#9f7131]" size={18} />
                {values.customerSignatureLabel}
              </span>
              <span className="rounded-2xl border border-dashed border-[#c7a15a]/55 bg-white/50 px-3 py-5">
                <Signature className="mx-auto mb-2 text-[#9f7131]" size={18} />
                {values.managerSignatureLabel}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      <div className="sticky bottom-3 z-30 flex flex-col gap-3 rounded-[1.5rem] border border-[#d8c08b]/70 bg-[#fff9ee]/96 p-3 shadow-[0_22px_70px_rgba(17,24,39,0.16)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div>
          <p className="text-sm font-black text-[#111827]">ذخیره تنظیمات قرارداد</p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
            تغییرات پس از ذخیره برای قراردادهای جدید و قالب چاپ استفاده می‌شوند.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href="/dashboard/base" className="btn-luxury-secondary justify-center px-5 py-3">
            <ArrowRight size={17} />
            بازگشت به تعاریف پایه
          </Link>
          <button
            type="submit"
            disabled={!canEdit || isPending}
            className="btn-luxury-dark justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : "ذخیره تنظیمات قرارداد"}
          </button>
        </div>
      </div>
    </form>
  );
}

function percentOf(amount: number, percent: string) {
  const value = Number(String(percent).replace(/[،,]/g, "."));
  return Number.isFinite(value) ? Math.round((amount * value) / 100) : 0;
}

function FormSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[1.65rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_58px_rgba(17,24,39,0.06)] sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={18} />
        </span>
        <div>
          <h2 className="text-lg font-black leading-7 text-[#111827]">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  disabled,
  dir,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl" | "auto";
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        dir={dir}
        inputMode={inputMode}
        className="input-luxury h-12 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function PercentField({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <span className="relative block">
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder="۰ تا ۱۰۰"
          disabled={disabled}
          dir="ltr"
          inputMode="decimal"
          className="input-luxury h-12 pl-10 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#9f7131]">
          ٪
        </span>
      </span>
    </label>
  );
}

function ToggleField({
  name,
  label,
  description,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  description: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer items-center justify-between gap-4 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4 text-[#111827] transition hover:border-[#c7a15a]/75">
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-1 block text-xs font-bold leading-6 text-[#7d6841]">
          {description}
        </span>
      </span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="relative h-7 w-12 shrink-0 rounded-full border border-[#d8c08b] bg-[#e9dcc0] transition after:absolute after:right-1 after:top-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:border-[#17483f]/40 peer-checked:bg-[#17483f] peer-checked:after:right-6 peer-disabled:opacity-50" />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  suggestedValue,
  disabled,
  maxLength,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  suggestedValue: string;
  disabled?: boolean;
  maxLength: number;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className={`grid gap-2 text-sm font-black text-[#172033] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={name}>{label}</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setValue(suggestedValue)}
          className="rounded-full border border-[#d8c08b]/65 bg-[#fff8ea] px-3 py-1 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          بازگردانی متن پیشنهادی
        </button>
      </div>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
        className="input-luxury min-h-36 resize-y leading-7 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="text-left text-xs font-bold text-[#9f7131]" dir="ltr">
        {formatPersianNumber(value.length)} / {formatPersianNumber(maxLength)}
      </span>
    </div>
  );
}

function PreviewAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/55 bg-white/50 p-3">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#111827] sm:text-base">
        {formatIRR(value)}
      </p>
    </div>
  );
}

function Alert({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#126141]"
      : tone === "warning"
        ? "border-[#c7a15a]/28 bg-[#fff8ea] text-[#7d6841]"
        : "border-[#b45353]/25 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${className}`}
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-1 shrink-0" size={18} />
      ) : (
        <AlertCircle className="mt-1 shrink-0" size={18} />
      )}
      <span>{children}</span>
    </div>
  );
}
