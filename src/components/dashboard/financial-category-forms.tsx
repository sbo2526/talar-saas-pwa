"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, Power, Save } from "lucide-react";
import { useActionState } from "react";
import {
  createFinancialCategoryAction,
  toggleFinancialCategoryStatusAction,
  updateFinancialCategoryAction,
} from "@/lib/actions/financial-category-actions";
import { initialFinancialCategoryActionState } from "@/lib/actions/financial-category-state";
import {
  categoryTypeOptions,
  type CategoryTypeValue,
} from "@/lib/financial-category-options";

export type FinancialCategoryTypeValue = CategoryTypeValue;

export type FinancialCategoryOption = {
  id: string;
  title: string;
};

export type FinancialCategoryFormValues = {
  id?: string;
  title: string;
  code: string;
  type: FinancialCategoryTypeValue;
  parentId: string;
  color: string;
  icon: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
};

type FinancialCategoryFormProps = {
  mode: "create" | "edit";
  values?: FinancialCategoryFormValues;
  parentOptions: FinancialCategoryOption[];
  canEdit: boolean;
};

export function FinancialCategoryForm({
  mode,
  values,
  parentOptions,
  canEdit,
}: FinancialCategoryFormProps) {
  const action =
    mode === "create"
      ? createFinancialCategoryAction
      : updateFinancialCategoryAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialFinancialCategoryActionState,
  );
  const defaults = values ?? {
    title: "",
    code: "",
    type: "EXPENSE" as const,
    parentId: "",
    color: "#C7A15A",
    icon: "",
    description: "",
    isSystem: false,
    isActive: true,
  };
  const availableParents = parentOptions.filter(
    (option) => option.id !== values?.id,
  );

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? (
        <input
          type="hidden"
          name="financialCategoryId"
          value={values.id}
        />
      ) : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند دسته‌بندی مالی را تغییر دهد.
        </Alert>
      ) : null}

      {defaults.isSystem ? (
        <Alert tone="warning">
          این دسته سیستمی است. در این نسخه امکان ویرایش عنوان و نوع آن محدود
          نشده، اما حذف سخت انجام نمی‌شود.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="نام دسته"
          name="title"
          defaultValue={defaults.title}
          placeholder="مثلاً بیعانه قرارداد"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً ADVANCE"
          disabled={!canEdit}
          dir="ltr"
        />
        <Select
          label="نوع دسته"
          name="type"
          defaultValue={defaults.type}
          disabled={!canEdit}
        >
          {categoryTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          label="دسته مادر"
          name="parentId"
          defaultValue={defaults.parentId}
          disabled={!canEdit}
        >
          <option value="">بدون دسته مادر</option>
          {availableParents.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </Select>
        <Field
          label="رنگ نمایشی"
          name="color"
          defaultValue={defaults.color}
          placeholder="#C7A15A"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="آیکن نمایشی"
          name="icon"
          defaultValue={defaults.icon}
          placeholder="مثلاً wallet"
          disabled={!canEdit}
          dir="ltr"
        />
        <Textarea
          label="توضیحات"
          name="description"
          defaultValue={defaults.description}
          placeholder="کاربرد این دسته در گزارش‌ها و ثبت هزینه‌ها"
          disabled={!canEdit}
          className="md:col-span-2"
        />
      </div>

      <ToggleField
        name="isActive"
        label="دسته مالی فعال است؟"
        defaultChecked={defaults.isActive}
        disabled={!canEdit}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          دسته مالی غیرفعال در ثبت‌های جدید پیشنهاد نمی‌شود، اما برای گزارش
          سوابق باقی می‌ماند.
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
              ? "ذخیره دسته مالی"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function ToggleFinancialCategoryStatusForm({
  financialCategoryId,
  isActive,
  canEdit,
}: {
  financialCategoryId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleFinancialCategoryStatusAction,
    initialFinancialCategoryActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input
        type="hidden"
        name="financialCategoryId"
        value={financialCategoryId}
      />
      <input
        type="hidden"
        name="nextStatus"
        value={isActive ? "inactive" : "active"}
      />
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  dir?: "ltr" | "rtl" | "auto";
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
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-black text-[#172033] ${className}`}>
      <span>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="input-luxury min-h-28 resize-y disabled:cursor-not-allowed disabled:opacity-60"
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
