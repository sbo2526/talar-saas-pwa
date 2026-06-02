"use client";

import { AlertCircle, CheckCircle2, Edit3, Power, Save } from "lucide-react";
import { useActionState } from "react";
import {
  createHallAction,
  toggleHallStatusAction,
  updateHallAction,
} from "@/lib/actions/hall-actions";
import { initialHallActionState } from "@/lib/actions/hall-state";

export type HallFormValues = {
  id?: string;
  name: string;
  code: string;
  province: string;
  city: string;
  address: string;
  phone: string;
  managerName: string;
  totalCapacity: string;
  description: string;
  isActive: boolean;
};

type HallFormProps = {
  mode: "create" | "edit";
  values?: HallFormValues;
  canEdit: boolean;
};

export function HallForm({ mode, values, canEdit }: HallFormProps) {
  const action = mode === "create" ? createHallAction : updateHallAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialHallActionState,
  );
  const defaults = values ?? {
    name: "",
    code: "",
    province: "",
    city: "",
    address: "",
    phone: "",
    managerName: "",
    totalCapacity: "",
    description: "",
    isActive: true,
  };

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? <input type="hidden" name="hallId" value={values.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند اطلاعات تالارها را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="نام تالار / شعبه"
          name="name"
          defaultValue={defaults.name}
          placeholder="مثلاً تالار اصلی"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی تالار"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً MAIN"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="استان"
          name="province"
          defaultValue={defaults.province}
          placeholder="استان"
          disabled={!canEdit}
        />
        <Field
          label="شهر"
          name="city"
          defaultValue={defaults.city}
          placeholder="شهر"
          disabled={!canEdit}
        />
        <Field
          label="تلفن تماس"
          name="phone"
          defaultValue={defaults.phone}
          placeholder="تلفن تالار"
          disabled={!canEdit}
          dir="ltr"
          inputMode="tel"
        />
        <Field
          label="نام مدیر یا مسئول"
          name="managerName"
          defaultValue={defaults.managerName}
          placeholder="نام مسئول تالار"
          disabled={!canEdit}
        />
        <Field
          label="ظرفیت کل"
          name="totalCapacity"
          defaultValue={defaults.totalCapacity}
          placeholder="تعداد نفرات"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-3 text-sm font-black text-[#111827]">
          <span>تالار فعال است؟</span>
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={defaults.isActive}
            disabled={!canEdit}
            className="size-5 accent-[#9f7131] disabled:cursor-not-allowed"
          />
        </label>
        <Textarea
          label="آدرس کامل"
          name="address"
          defaultValue={defaults.address}
          placeholder="نشانی تالار یا شعبه"
          disabled={!canEdit}
          className="md:col-span-2"
        />
        <Textarea
          label="توضیحات"
          name="description"
          defaultValue={defaults.description}
          placeholder="توضیح کوتاه درباره این تالار، شعبه یا ویژگی‌های مهم آن"
          disabled={!canEdit}
          className="md:col-span-2"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          تالار غیرفعال در ثبت قراردادهای جدید پیشنهاد نمی‌شود، اما سابقه آن
          حفظ خواهد شد.
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
              ? "ذخیره تالار"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function ToggleHallStatusForm({
  hallId,
  isActive,
  canEdit,
}: {
  hallId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleHallStatusAction,
    initialHallActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="hallId" value={hallId} />
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
            ? "غیرفعال‌سازی تالار"
            : "فعال‌سازی تالار"}
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
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
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
  children: React.ReactNode;
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
