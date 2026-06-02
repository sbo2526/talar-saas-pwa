"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, Power, Save, Zap } from "lucide-react";
import { useActionState, useMemo } from "react";
import {
  createServiceAction,
  quickUpdateServicePriceAction,
  toggleServiceStatusAction,
  updateServiceAction,
} from "@/lib/actions/service-actions";
import { initialServiceActionState } from "@/lib/actions/service-state";
import { formatIRR } from "@/lib/formatters";

export type ServicePricingTypeValue =
  | "FIXED"
  | "PER_GUEST"
  | "PER_HOUR"
  | "PER_ITEM"
  | "CUSTOM";

export type ServiceFormValues = {
  id?: string;
  title: string;
  code: string;
  category: string;
  pricingType: ServicePricingTypeValue;
  unit: string;
  price: string;
  basePrice: string;
  sortOrder: string;
  description: string;
  notes: string;
  isRequired: boolean;
  allowPriceOverride: boolean;
  isActive: boolean;
};

type ServiceFormProps = {
  mode: "create" | "edit";
  values?: ServiceFormValues;
  canEdit: boolean;
};

type PricingType = ServiceFormValues["pricingType"];

const pricingTypeOptions: Array<{
  value: ServicePricingTypeValue;
  label: string;
}> = [
  { value: "FIXED", label: "مبلغ ثابت" },
  { value: "PER_GUEST", label: "به ازای هر مهمان" },
  { value: "PER_HOUR", label: "به ازای هر ساعت" },
  { value: "PER_ITEM", label: "به ازای تعداد" },
  { value: "CUSTOM", label: "توافقی" },
];

const serviceCategoryOptions = [
  "خدمات تصویری و اجرایی",
  "عکاسی و فیلم‌برداری",
  "خدمات موسیقی و هنری",
  "خدمات تشریفاتی عقد",
  "خدمات نیروی انسانی عمومی",
  "افکت‌ها و جلوه‌های ویژه",
];

const defaultFormValues: ServiceFormValues = {
  title: "",
  code: "",
  category: "خدمات تصویری و اجرایی",
  pricingType: "FIXED",
  unit: "مورد",
  price: "",
  basePrice: "",
  sortOrder: "",
  description: "",
  notes: "",
  isRequired: false,
  allowPriceOverride: true,
  isActive: true,
};

export function ServiceForm({ mode, values, canEdit }: ServiceFormProps) {
  const action = mode === "create" ? createServiceAction : updateServiceAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialServiceActionState,
  );
  const defaults = values ?? defaultFormValues;
  const categoryOptions = useMemo(() => {
    if (!defaults.category || serviceCategoryOptions.includes(defaults.category)) {
      return serviceCategoryOptions;
    }

    return [...serviceCategoryOptions, defaults.category];
  }, [defaults.category]);

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? <input type="hidden" name="serviceId" value={values.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند خدمات مراسم را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="نام خدمت"
          name="title"
          defaultValue={defaults.title}
          placeholder="مثلاً برف مصنوعی"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً FX-SNOW"
          disabled={!canEdit}
          dir="ltr"
        />
        <Select
          label="دسته‌بندی"
          name="category"
          defaultValue={defaults.category || defaultFormValues.category}
          disabled={!canEdit}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        <Select
          label="نوع قیمت‌گذاری"
          name="pricingType"
          defaultValue={defaults.pricingType}
          disabled={!canEdit}
        >
          {pricingTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Field
          label="عنوان واحد"
          name="unit"
          defaultValue={defaults.unit}
          placeholder="مورد، ساعت، نفر یا عدد"
          disabled={!canEdit}
        />
        <Field
          label="قیمت واحد (ریال)"
          name="price"
          defaultValue={defaults.price}
          placeholder="مثلاً ۱۲۵۰۰۰۰۰"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="مبلغ پایه (ریال)"
          name="basePrice"
          defaultValue={defaults.basePrice}
          placeholder="برای مبلغ ثابت یا هزینه شروع"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ToggleField
          name="isActive"
          label="فعال در قراردادهای جدید"
          defaultChecked={defaults.isActive}
          disabled={!canEdit}
        />
        <ToggleField
          name="allowPriceOverride"
          label="اجازه تغییر قیمت هنگام ثبت قرارداد"
          defaultChecked={defaults.allowPriceOverride}
          disabled={!canEdit}
        />
        <ToggleField
          name="isRequired"
          label="این خدمت الزامی است"
          defaultChecked={defaults.isRequired}
          disabled={!canEdit}
        />
      </div>

      <details className="rounded-3xl border border-[#d8c08b]/58 bg-[#fff8ea]/64 p-3">
        <summary className="cursor-pointer list-none text-sm font-black text-[#17483f]">
          توضیحات و تنظیمات تکمیلی
        </summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="ترتیب نمایش"
            name="sortOrder"
            defaultValue={defaults.sortOrder}
            placeholder="اختیاری"
            disabled={!canEdit}
            dir="ltr"
            inputMode="numeric"
          />
          <div className="hidden md:block" aria-hidden="true" />
          <Textarea
            label="توضیحات"
            name="description"
            defaultValue={defaults.description}
            placeholder="شرایط ارائه یا توضیح کوتاه برای انتخاب خدمت"
            disabled={!canEdit}
          />
          <Textarea
            label="یادداشت داخلی"
            name="notes"
            defaultValue={defaults.notes}
            placeholder="نکات اجرایی یا فروش داخلی"
            disabled={!canEdit}
          />
        </div>
      </details>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          خدمات غیرفعال در قراردادهای جدید نمایش داده نمی‌شوند.
        </p>
        <button
          type="submit"
          disabled={!canEdit || isPending}
          className="btn-luxury-dark px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mode === "create" ? <Save size={17} /> : <Edit3 size={17} />}
          {isPending
            ? "در حال ذخیره..."
            : mode === "create"
              ? "ذخیره خدمت"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function QuickServicePriceForm({
  serviceId,
  unitPrice,
  basePrice,
  pricingType,
  canEdit,
}: {
  serviceId: string;
  unitPrice: string;
  basePrice: string;
  pricingType: PricingType;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    quickUpdateServicePriceAction,
    initialServiceActionState,
  );
  const isFixed = pricingType === "FIXED";
  const isCustom = pricingType === "CUSTOM";

  return (
    <details className="group rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/80">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-3 py-2 text-xs font-black text-[#172033] sm:text-sm">
        <Zap size={15} className="text-[#9f7131]" />
        قیمت سریع
      </summary>
      <form action={formAction} className="grid gap-3 border-t border-[#d8c08b]/50 p-3">
        <input type="hidden" name="serviceId" value={serviceId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <Field
            label={isFixed ? "قیمت واحد پشتیبان" : isCustom ? "قیمت پیشنهادی" : "قیمت واحد"}
            name="price"
            defaultValue={unitPrice}
            placeholder="ریال"
            disabled={!canEdit}
            dir="ltr"
            inputMode="numeric"
          />
          <Field
            label={isFixed ? "مبلغ ثابت" : "مبلغ پایه"}
            name="basePrice"
            defaultValue={basePrice}
            placeholder="اختیاری"
            disabled={!canEdit}
            dir="ltr"
            inputMode="numeric"
          />
        </div>
        <button
          type="submit"
          disabled={!canEdit || isPending}
          className="btn-luxury-dark min-h-10 rounded-2xl px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "در حال ذخیره..." : "ذخیره قیمت"}
        </button>
        {state.message ? (
          <p
            className={`text-xs font-bold leading-6 ${
              state.ok ? "text-[#126141]" : "text-[#8f2c2c]"
            }`}
          >
            {state.message}
          </p>
        ) : null}
        <p className="text-[0.7rem] font-bold leading-5 text-[#7d6841]">
          قیمت کاتالوگ: {isCustom ? "توافقی" : formatIRR(isFixed ? basePrice || unitPrice : unitPrice)}
        </p>
      </form>
    </details>
  );
}

export function ToggleServiceStatusForm({
  serviceId,
  isActive,
  canEdit,
}: {
  serviceId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleServiceStatusAction,
    initialServiceActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="nextStatus" value={isActive ? "inactive" : "active"} />
      <button
        type="submit"
        disabled={!canEdit || isPending}
        className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isActive
            ? "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c] hover:border-[#b45353]/45"
            : "border-[#25a46d]/24 bg-[#ecfff5] text-[#126141] hover:border-[#25a46d]/45"
        }`}
      >
        <Power size={16} />
        {isPending
          ? "در حال تغییر..."
          : isActive
            ? "غیرفعال‌سازی"
            : "فعال‌سازی"}
      </button>
      {state.message ? (
        <p
          className={`text-xs font-bold leading-6 ${
            state.ok ? "text-[#126141]" : "text-[#8f2c2c]"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
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
        className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  disabled,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
      >
        {children}
      </select>
    </label>
  );
}

function ToggleField({
  name,
  label,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-3 text-sm font-black text-[#111827]">
      <span>{label}</span>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-5 accent-[#9f7131] disabled:cursor-not-allowed"
      />
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="input-luxury min-h-28 resize-y py-3 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
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
