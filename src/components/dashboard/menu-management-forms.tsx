"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, Power, Save, Zap } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import {
  createMenuAction,
  quickUpdateMenuPriceAction,
  toggleMenuStatusAction,
  updateMenuAction,
} from "@/lib/actions/menu-actions";
import { initialMenuActionState } from "@/lib/actions/menu-state";
import { formatIRR } from "@/lib/formatters";

export type MenuFormValues = {
  id?: string;
  title: string;
  code: string;
  category: string;
  pricingType: "FIXED" | "PER_GUEST" | "PER_HOUR" | "PER_ITEM" | "CUSTOM";
  unit: string;
  pricePerGuest: string;
  basePrice: string;
  minGuests: string;
  maxGuests: string;
  sortOrder: string;
  includedItems: string;
  description: string;
  notes: string;
  isRecommended: boolean;
  isTaxable: boolean;
  allowPriceOverride: boolean;
  isActive: boolean;
};

type MenuFormProps = {
  mode: "create" | "edit";
  values?: MenuFormValues;
  canEdit: boolean;
};

type PricingType = MenuFormValues["pricingType"];

const menuCategoryOptions = [
  "غذاهای اصلی",
  "نوشیدنی‌ها",
  "دسرها و مخلفات",
  "پکیج‌ها",
];

const defaultFormValues: MenuFormValues = {
  title: "",
  code: "",
  category: "غذاهای اصلی",
  pricingType: "PER_GUEST",
  unit: "نفر",
  pricePerGuest: "",
  basePrice: "",
  minGuests: "",
  maxGuests: "",
  sortOrder: "",
  includedItems: "",
  description: "",
  notes: "",
  isRecommended: false,
  isTaxable: true,
  allowPriceOverride: true,
  isActive: true,
};

const pricingTypeLabels: Record<PricingType, string> = {
  FIXED: "مبلغ ثابت",
  PER_GUEST: "به ازای هر مهمان",
  PER_ITEM: "به ازای تعداد",
  PER_HOUR: "به ازای هر ساعت",
  CUSTOM: "توافقی",
};

export function MenuForm({ mode, values, canEdit }: MenuFormProps) {
  const action = mode === "create" ? createMenuAction : updateMenuAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialMenuActionState,
  );
  const defaults = values ?? defaultFormValues;
  const initialCategory = defaults.category || defaultFormValues.category;
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const showPackageItems = selectedCategory === "پکیج‌ها";
  const categoryOptions = useMemo(() => {
    if (!initialCategory || menuCategoryOptions.includes(initialCategory)) {
      return menuCategoryOptions;
    }

    return [...menuCategoryOptions, initialCategory];
  }, [initialCategory]);

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? <input type="hidden" name="menuId" value={values.id} /> : null}
      {!showPackageItems ? (
        <input type="hidden" name="includedItems" value={defaults.includedItems} />
      ) : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند آیتم‌های پذیرایی را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="نام آیتم"
          name="title"
          defaultValue={defaults.title}
          placeholder="مثلاً زرشک‌پلو با مرغ ۱۰۰٪"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً FOOD-CHICKEN-100"
          disabled={!canEdit}
          dir="ltr"
        />
        <label className="grid gap-2 text-sm font-black text-[#172033]">
          <span>دسته‌بندی</span>
          <select
            name="category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            disabled={!canEdit}
            className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <Select
          label="نوع قیمت‌گذاری"
          name="pricingType"
          defaultValue={defaults.pricingType}
          disabled={!canEdit}
        >
          {Object.entries(pricingTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Field
          label="عنوان واحد"
          name="unit"
          defaultValue={defaults.unit}
          placeholder="نفر، عدد، ساعت یا مورد"
          disabled={!canEdit}
        />
        <Field
          label="قیمت واحد (ریال)"
          name="pricePerGuest"
          defaultValue={defaults.pricePerGuest}
          placeholder="مثلاً ۸۵۰۰۰۰۰"
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
        <Field
          label="ترتیب نمایش"
          name="sortOrder"
          defaultValue={defaults.sortOrder}
          placeholder="اختیاری"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="حداقل مهمان"
          name="minGuests"
          defaultValue={defaults.minGuests}
          placeholder="اختیاری"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="حداکثر مهمان"
          name="maxGuests"
          defaultValue={defaults.maxGuests}
          placeholder="اختیاری"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      {showPackageItems ? (
        <Textarea
          label="اقلام داخل پکیج"
          name="includedItems"
          defaultValue={defaults.includedItems}
          placeholder="اقلام پکیج را خط‌به‌خط بنویسید؛ برای آیتم‌های ساده این بخش نمایش داده نمی‌شود."
          disabled={!canEdit}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Textarea
          label="توضیحات"
          name="description"
          defaultValue={defaults.description}
          placeholder="توضیح کوتاه برای تیم فروش و هنگام انتخاب در قرارداد"
          disabled={!canEdit}
        />
        <Textarea
          label="یادداشت داخلی"
          name="notes"
          defaultValue={defaults.notes}
          placeholder="نکات آماده‌سازی، خرید یا سیاست فروش"
          disabled={!canEdit}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField
          name="isRecommended"
          label="نمایش به‌عنوان پیشنهادی"
          defaultChecked={defaults.isRecommended}
          disabled={!canEdit}
        />
        <ToggleField
          name="isTaxable"
          label="مشمول مالیات"
          defaultChecked={defaults.isTaxable}
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          تغییر قیمت این آیتم فقط روی قراردادهای جدید اثر می‌گذارد؛ قراردادهای قبلی snapshot ذخیره‌شده خود را نگه می‌دارند.
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
              ? "ذخیره آیتم"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function QuickMenuPriceForm({
  menuId,
  unitPrice,
  basePrice,
  pricingType,
  canEdit,
}: {
  menuId: string;
  unitPrice: string;
  basePrice: string;
  pricingType: PricingType;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    quickUpdateMenuPriceAction,
    initialMenuActionState,
  );
  const isFixed = pricingType === "FIXED";

  return (
    <details className="group rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/80">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 px-3 py-2 text-xs font-black text-[#172033] sm:text-sm">
        <Zap size={15} className="text-[#9f7131]" />
        قیمت سریع
      </summary>
      <form action={formAction} className="grid gap-3 border-t border-[#d8c08b]/50 p-3">
        <input type="hidden" name="menuId" value={menuId} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <Field
            label={isFixed ? "قیمت واحد پشتیبان" : "قیمت واحد"}
            name="pricePerGuest"
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
          قیمت فعلی قراردادهای قبلی تغییر نمی‌کند. قیمت کاتالوگ: {formatIRR(isFixed ? basePrice || unitPrice : unitPrice)}
        </p>
      </form>
    </details>
  );
}

export function ToggleMenuStatusForm({
  menuId,
  isActive,
  canEdit,
}: {
  menuId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleMenuStatusAction,
    initialMenuActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="menuId" value={menuId} />
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
