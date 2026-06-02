"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  FileText,
  Landmark,
  Percent,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useActionState } from "react";
import { JalaliDatePicker } from "@/components/ui/jalali-date-picker";
import { saveHallOperationAgreementAction } from "@/lib/actions/hall-operation-agreement-actions";
import { initialHallOperationAgreementActionState } from "@/lib/actions/hall-operation-agreement-state";
import {
  agreementStatusLabels,
  agreementStatusValues,
  buildOperationAgreementSummary,
  offInvoicePolicyLabels,
  offInvoicePolicyValues,
  operationModelHelp,
  operationModelLabels,
  operationModelValues,
  settlementCycleLabels,
  settlementCycleValues,
  type HallOperationAgreementStatusValue,
  type HallOperationModelValue,
  type HallOperationOffInvoicePolicyValue,
  type HallOperationSettlementCycleValue,
} from "@/lib/hall-operation-agreement/options";

export type HallOperationAgreementHallOption = {
  id: string;
  name: string;
};

export type HallOperationAgreementFormValues = {
  id: string;
  hallId: string;
  operationModel: HallOperationModelValue;
  ownerName: string;
  operatorName: string;
  agreementTitle: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: HallOperationAgreementStatusValue;
  ownerEventSharePercent: string;
  ownerCancellationSharePercent: string;
  ownerExtraServiceSharePercent: string;
  includeExtraServicesInOwnerShare: boolean;
  monthlyMinimumGuaranteeAmount: string;
  monthlyFixedRentAmount: string;
  settlementCycle: HallOperationSettlementCycleValue;
  settlementDayOfMonth: string;
  offInvoiceIncomePolicy: HallOperationOffInvoicePolicyValue;
  notes: string;
};

type HallOperationAgreementFormProps = {
  values: HallOperationAgreementFormValues;
  halls: HallOperationAgreementHallOption[];
  canEdit: boolean;
};

export const HALL_OPERATION_AGREEMENT_FORM_ID = "hall-operation-agreement-form";

export function HallOperationAgreementForm({
  values,
  halls,
  canEdit,
}: HallOperationAgreementFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveHallOperationAgreementAction,
    initialHallOperationAgreementActionState,
  );
  const [preview, setPreview] = useState(values);

  const summary = useMemo(
    () => buildOperationAgreementSummary(preview),
    [preview],
  );
  const activeHelp = operationModelHelp[preview.operationModel];
  const requiresOperator = preview.operationModel !== "OWNER_DIRECT";
  const showFixedRent =
    preview.operationModel === "FIXED_RENT" ||
    preview.operationModel === "FIXED_RENT_PLUS_PERCENTAGE";
  const showEventPercent =
    preview.operationModel === "PERCENTAGE_MANAGEMENT" ||
    preview.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT" ||
    preview.operationModel === "FIXED_RENT_PLUS_PERCENTAGE";
  const showCancellationPercent =
    preview.operationModel === "PERCENTAGE_MANAGEMENT" ||
    preview.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT";
  const showMinimumGuarantee =
    preview.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT";

  return (
    <form id={HALL_OPERATION_AGREEMENT_FORM_ID} action={formAction} className="grid gap-5">
      {values.id ? <input type="hidden" name="agreementId" value={values.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند مدل بهره‌برداری و سهم مالک را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <FormSection
        eyebrow="A"
        title="مشخصات توافق بهره‌برداری"
        description="مشخص کنید این توافق برای کل فضای کاری است یا یک تالار مشخص، و مالک و بهره‌بردار چه کسانی هستند."
        icon={FileText}
      >
        <Field label="عنوان توافق">
          <input
            name="agreementTitle"
            defaultValue={values.agreementTitle}
            onChange={(event) => setPreviewValue(setPreview, "agreementTitle", event.target.value)}
            className="input-luxury"
            placeholder="مثلاً قرارداد مدیریت پیمانی سال ۱۴۰۵"
            disabled={!canEdit}
          />
        </Field>
        <Field label="تالار مرتبط">
          <select
            name="hallId"
            defaultValue={values.hallId}
            onChange={(event) => setPreviewValue(setPreview, "hallId", event.target.value)}
            className="input-luxury"
            disabled={!canEdit}
          >
            <option value="">کل فضای کاری / بدون تالار اختصاصی</option>
            {halls.map((hall) => (
              <option key={hall.id} value={hall.id}>
                {hall.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="نام مالک" required>
          <input
            name="ownerName"
            defaultValue={values.ownerName}
            onChange={(event) => setPreviewValue(setPreview, "ownerName", event.target.value)}
            className="input-luxury"
            placeholder="نام مالک یا مالکین"
            disabled={!canEdit}
            required
          />
        </Field>
        <Field label="نام بهره‌بردار / مدیر پیمان" required={requiresOperator}>
          <input
            name="operatorName"
            defaultValue={values.operatorName}
            onChange={(event) => setPreviewValue(setPreview, "operatorName", event.target.value)}
            className="input-luxury"
            placeholder={requiresOperator ? "نام بهره‌بردار الزامی است" : "برای بهره‌برداری مستقیم اختیاری است"}
            disabled={!canEdit}
            required={requiresOperator}
          />
        </Field>
      </FormSection>

      <FormSection
        eyebrow="B"
        title="مدل اقتصادی تالار"
        description="مدل مالی را با برچسب فارسی انتخاب کنید. مقدار فنی آن در صفحه به کاربر نمایش داده نمی‌شود."
        icon={Landmark}
      >
        <Field label="مدل بهره‌برداری" required className="md:col-span-2">
          <select
            name="operationModel"
            value={preview.operationModel}
            onChange={(event) =>
              setPreviewValue(
                setPreview,
                "operationModel",
                event.target.value as HallOperationModelValue,
              )
            }
            className="input-luxury"
            disabled={!canEdit}
            required
          >
            {operationModelValues.map((model) => (
              <option key={model} value={model}>
                {operationModelLabels[model]}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2 rounded-2xl border border-[#c7a15a]/26 bg-[#c7a15a]/10 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
          {activeHelp}
        </div>
        <Field label="وضعیت توافق">
          <select
            name="status"
            value={preview.status}
            onChange={(event) =>
              setPreviewValue(
                setPreview,
                "status",
                event.target.value as HallOperationAgreementStatusValue,
              )
            }
            className="input-luxury"
            disabled={!canEdit}
          >
            {agreementStatusValues.map((status) => (
              <option key={status} value={status}>
                {agreementStatusLabels[status]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="دوره تسویه">
          <select
            name="settlementCycle"
            value={preview.settlementCycle}
            onChange={(event) =>
              setPreviewValue(
                setPreview,
                "settlementCycle",
                event.target.value as HallOperationSettlementCycleValue,
              )
            }
            className="input-luxury"
            disabled={!canEdit}
          >
            {settlementCycleValues.map((cycle) => (
              <option key={cycle} value={cycle}>
                {settlementCycleLabels[cycle]}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection
        eyebrow="C"
        title="درصدها و مبالغ"
        description="مبالغ و درصدها فقط برای تنظیم قرارداد بهره‌برداری ذخیره می‌شوند و هنوز تسویه واقعی ماهانه تولید نمی‌کنند."
        icon={Banknote}
      >
        {showEventPercent ? (
          <Field label="سهم مالک از مراسم‌های برگزارشده" required>
            <input
              name="ownerEventSharePercent"
              value={preview.ownerEventSharePercent}
              onChange={(event) => setPreviewValue(setPreview, "ownerEventSharePercent", event.target.value)}
              className="input-luxury"
              placeholder="مثلاً ۲۵"
              disabled={!canEdit}
              inputMode="decimal"
              dir="ltr"
              required
            />
          </Field>
        ) : (
          <input type="hidden" name="ownerEventSharePercent" value={preview.ownerEventSharePercent} />
        )}
        {showCancellationPercent ? (
          <Field label="سهم مالک از کنسلی‌ها" required>
            <input
              name="ownerCancellationSharePercent"
              value={preview.ownerCancellationSharePercent}
              onChange={(event) => setPreviewValue(setPreview, "ownerCancellationSharePercent", event.target.value)}
              className="input-luxury"
              placeholder="مثلاً ۵۰"
              disabled={!canEdit}
              inputMode="decimal"
              dir="ltr"
              required
            />
          </Field>
        ) : (
          <input type="hidden" name="ownerCancellationSharePercent" value={preview.ownerCancellationSharePercent} />
        )}
        {showFixedRent ? (
          <Field label="اجاره ثابت ماهانه (تومان)" required>
            <input
              name="monthlyFixedRentAmount"
              value={preview.monthlyFixedRentAmount}
              onChange={(event) => setPreviewValue(setPreview, "monthlyFixedRentAmount", event.target.value)}
              className="input-luxury"
              placeholder="مثلاً ۱۵۰۰۰۰۰۰۰"
              disabled={!canEdit}
              inputMode="numeric"
              dir="ltr"
              required
            />
          </Field>
        ) : (
          <input type="hidden" name="monthlyFixedRentAmount" value={preview.monthlyFixedRentAmount} />
        )}
        {showMinimumGuarantee ? (
          <Field label="حداقل تضمین ماهانه (تومان)" required>
            <input
              name="monthlyMinimumGuaranteeAmount"
              value={preview.monthlyMinimumGuaranteeAmount}
              onChange={(event) => setPreviewValue(setPreview, "monthlyMinimumGuaranteeAmount", event.target.value)}
              className="input-luxury"
              placeholder="مثلاً ۱۵۰۰۰۰۰۰۰"
              disabled={!canEdit}
              inputMode="numeric"
              dir="ltr"
              required
            />
          </Field>
        ) : (
          <input type="hidden" name="monthlyMinimumGuaranteeAmount" value={preview.monthlyMinimumGuaranteeAmount} />
        )}
        {!showEventPercent && !showCancellationPercent && !showFixedRent && !showMinimumGuarantee ? (
          <div className="md:col-span-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
            در مدل بهره‌برداری مستقیم، درصد یا مبلغ تسویه مالک لازم نیست.
          </div>
        ) : null}
      </FormSection>

      <FormSection
        eyebrow="D"
        title="سیاست خدمات اضافه و درآمد خارج از فاکتور"
        description="این بخش فقط سیاست مدیریتی را ذخیره می‌کند؛ پرسشنامه مشتری یا محاسبه تسویه هنوز در این فاز ساخته نشده است."
        icon={Percent}
      >
        <div className="md:col-span-2 grid gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4">
          <label className="flex items-start gap-3 text-sm font-black leading-7 text-[#172033]">
            <input
              type="checkbox"
              name="includeExtraServicesInOwnerShare"
              checked={preview.includeExtraServicesInOwnerShare}
              onChange={(event) =>
                setPreviewValue(
                  setPreview,
                  "includeExtraServicesInOwnerShare",
                  event.target.checked,
                )
              }
              disabled={!canEdit}
              className="mt-1 size-4 accent-[#17483f]"
            />
            خدمات اضافه در سهم مالک لحاظ شود
          </label>
          <p className="text-xs font-bold leading-6 text-[#7d6841]">
            اگر فعال شود، درصد سهم مالک از خدمات اضافه الزامی می‌شود.
          </p>
        </div>
        {preview.includeExtraServicesInOwnerShare ? (
          <Field label="سهم مالک از خدمات اضافه" required>
            <input
              name="ownerExtraServiceSharePercent"
              value={preview.ownerExtraServiceSharePercent}
              onChange={(event) => setPreviewValue(setPreview, "ownerExtraServiceSharePercent", event.target.value)}
              className="input-luxury"
              placeholder="مثلاً ۲۵"
              disabled={!canEdit}
              inputMode="decimal"
              dir="ltr"
              required
            />
          </Field>
        ) : (
          <input type="hidden" name="ownerExtraServiceSharePercent" value={preview.ownerExtraServiceSharePercent} />
        )}
        <Field label="سیاست درآمد خارج از فاکتور" className={preview.includeExtraServicesInOwnerShare ? "" : "md:col-span-2"}>
          <select
            name="offInvoiceIncomePolicy"
            value={preview.offInvoiceIncomePolicy}
            onChange={(event) =>
              setPreviewValue(
                setPreview,
                "offInvoiceIncomePolicy",
                event.target.value as HallOperationOffInvoicePolicyValue,
              )
            }
            className="input-luxury"
            disabled={!canEdit}
          >
            {offInvoicePolicyValues.map((policy) => (
              <option key={policy} value={policy}>
                {offInvoicePolicyLabels[policy]}
              </option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection
        eyebrow="E"
        title="دوره تسویه"
        description="فعلاً فقط تنظیمات چرخه و روز تسویه ذخیره می‌شود؛ گزارش تسویه ماهانه در فاز بعدی نیست."
        icon={CalendarDays}
      >
        <JalaliDatePicker
          label="تاریخ شروع اعتبار"
          name="effectiveFrom"
          defaultValue={values.effectiveFrom}
          onChange={(value) => setPreviewValue(setPreview, "effectiveFrom", value ?? "")}
          disabled={!canEdit}
          required
        />
        <JalaliDatePicker
          label="تاریخ پایان اعتبار"
          name="effectiveTo"
          defaultValue={values.effectiveTo}
          onChange={(value) => setPreviewValue(setPreview, "effectiveTo", value ?? "")}
          disabled={!canEdit}
          helperText="اختیاری"
        />
        <Field label="روز تسویه در ماه">
          <input
            name="settlementDayOfMonth"
            defaultValue={values.settlementDayOfMonth}
            onChange={(event) => setPreviewValue(setPreview, "settlementDayOfMonth", event.target.value)}
            className="input-luxury"
            placeholder="مثلاً ۱ یا ۳۰"
            disabled={!canEdit}
            inputMode="numeric"
            dir="ltr"
          />
        </Field>
        <Field label="یادداشت داخلی">
          <textarea
            name="notes"
            defaultValue={values.notes}
            onChange={(event) => setPreviewValue(setPreview, "notes", event.target.value)}
            className="input-luxury min-h-24"
            placeholder="توضیحات داخلی درباره قرارداد بهره‌برداری"
            disabled={!canEdit}
          />
        </Field>
      </FormSection>

      <FormSection
        eyebrow="F"
        title="خلاصه قابل بررسی"
        description="این متن برای کنترل نهایی تنظیمات است و هنوز سند مالی یا فاکتور مالک تولید نمی‌کند."
        icon={CheckCircle2}
      >
        <div className="md:col-span-2 rounded-[1.35rem] border border-[#17483f]/18 bg-[#17483f]/8 p-4 text-sm font-black leading-8 text-[#17483f]">
          {summary}
        </div>
      </FormSection>

      <div className="sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/92 p-3 shadow-[0_18px_70px_rgba(17,24,39,0.16)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-[#7d6841]">
            این تنظیمات فقط زیرساخت مدل بهره‌برداری است و تسویه، پرداخت مالک یا فاکتور حسابداری ایجاد نمی‌کند.
          </p>
          <button
            type="submit"
            disabled={!canEdit || isPending}
            className="btn-luxury-dark px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : "ذخیره مدل بهره‌برداری"}
          </button>
        </div>
      </div>
    </form>
  );
}

function setPreviewValue<K extends keyof HallOperationAgreementFormValues>(
  setPreview: Dispatch<SetStateAction<HallOperationAgreementFormValues>>,
  key: K,
  value: HallOperationAgreementFormValues[K],
) {
  setPreview((current) => ({ ...current, [key]: value }));
}

function FormSection({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_12px_28px_rgba(17,24,39,0.16)]">
          <Icon size={19} />
        </span>
        <div>
          <p className="text-xs font-black text-[#17483f]">بخش {eyebrow}</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-xs font-black text-[#172033] ${className}`}>
      <span>
        {label}
        {required ? <span className="mr-1 text-[#9f7131]">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "success" | "error" | "warning";
  children: ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/28 bg-[#c7a15a]/10 text-[#7d6841]"
        : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${className}`}>
      {tone === "success" ? (
        <CheckCircle2 className="mt-1 shrink-0" size={18} />
      ) : tone === "warning" ? (
        <ShieldCheck className="mt-1 shrink-0" size={18} />
      ) : (
        <AlertCircle className="mt-1 shrink-0" size={18} />
      )}
      <span>{children}</span>
    </div>
  );
}
