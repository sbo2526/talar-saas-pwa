"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Edit3, Power, Save } from "lucide-react";
import { useActionState } from "react";
import {
  createSalonAction,
  toggleSalonStatusAction,
  updateSalonAction,
} from "@/lib/actions/salon-actions";
import { initialSalonActionState } from "@/lib/actions/salon-state";

export type SalonFormHall = {
  id: string;
  name: string;
};

export type SalonFormValues = {
  id?: string;
  hallId: string;
  name: string;
  code: string;
  floor: string;
  locationNote: string;
  capacity: string;
  minCapacity: string;
  maxCapacity: string;
  basePrice: string;
  hasStage: boolean;
  hasDanceFloor: boolean;
  hasSeparateEntrance: boolean;
  hasVipRoom: boolean;
  hasSoundSystem: boolean;
  hasProjector: boolean;
  description: string;
  isActive: boolean;
};

type SalonFormProps = {
  mode: "create" | "edit";
  halls: SalonFormHall[];
  values?: SalonFormValues;
  canEdit: boolean;
};

const featureOptions = [
  { name: "hasStage", label: "سن دارد" },
  { name: "hasDanceFloor", label: "جایگاه رقص دارد" },
  { name: "hasSeparateEntrance", label: "ورودی مجزا دارد" },
  { name: "hasVipRoom", label: "اتاق VIP دارد" },
  { name: "hasSoundSystem", label: "سیستم صوت دارد" },
  { name: "hasProjector", label: "ویدئو پروژکتور دارد" },
] as const;

export function SalonForm({
  mode,
  halls,
  values,
  canEdit,
}: SalonFormProps) {
  const action = mode === "create" ? createSalonAction : updateSalonAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialSalonActionState,
  );
  const defaults = values ?? {
    hallId: halls[0]?.id ?? "",
    name: "",
    code: "",
    floor: "",
    locationNote: "",
    capacity: "",
    minCapacity: "",
    maxCapacity: "",
    basePrice: "",
    hasStage: false,
    hasDanceFloor: false,
    hasSeparateEntrance: false,
    hasVipRoom: false,
    hasSoundSystem: false,
    hasProjector: false,
    description: "",
    isActive: true,
  };

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? (
        <input type="hidden" name="salonId" value={values.id} />
      ) : null}

      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند اطلاعات سالن‌ها را تغییر دهد.
        </Alert>
      ) : null}

      {state.message ? (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="تالار مرتبط"
          name="hallId"
          defaultValue={defaults.hallId}
          disabled={!canEdit}
        >
          {halls.map((hall) => (
            <option key={hall.id} value={hall.id}>
              {hall.name}
            </option>
          ))}
        </Select>
        <Field
          label="نام سالن"
          name="name"
          defaultValue={defaults.name}
          placeholder="مثلاً سالن زمرد"
          disabled={!canEdit}
        />
        <Field
          label="کد داخلی سالن"
          name="code"
          defaultValue={defaults.code}
          placeholder="مثلاً ZMRD-01"
          disabled={!canEdit}
          dir="ltr"
        />
        <Field
          label="طبقه / موقعیت"
          name="floor"
          defaultValue={defaults.floor}
          placeholder="مثلاً طبقه همکف"
          disabled={!canEdit}
        />
        <Field
          label="ظرفیت کل"
          name="capacity"
          defaultValue={defaults.capacity}
          placeholder="تعداد نفرات"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="حداقل ظرفیت"
          name="minCapacity"
          defaultValue={defaults.minCapacity}
          placeholder="حداقل نفرات"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="حداکثر ظرفیت"
          name="maxCapacity"
          defaultValue={defaults.maxCapacity}
          placeholder="حداکثر نفرات"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Field
          label="قیمت پایه"
          name="basePrice"
          defaultValue={defaults.basePrice}
          placeholder="مبلغ به ریال"
          disabled={!canEdit}
          dir="ltr"
          inputMode="numeric"
        />
        <Textarea
          label="توضیح موقعیت"
          name="locationNote"
          defaultValue={defaults.locationNote}
          placeholder="مثلاً نزدیک ورودی اصلی یا مناسب مراسم عقد"
          disabled={!canEdit}
          className="md:col-span-2"
        />
      </div>

      <section className="rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4">
        <p className="text-sm font-black text-[#172033]">امکانات سالن</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {featureOptions.map((feature) => (
            <label
              key={feature.name}
              className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/55 bg-[#fffdf7]/72 px-4 py-2.5 text-sm font-black text-[#111827]"
            >
              <span>{feature.label}</span>
              <input
                name={feature.name}
                type="checkbox"
                defaultChecked={Boolean(defaults[feature.name])}
                disabled={!canEdit}
                className="size-5 accent-[#9f7131] disabled:cursor-not-allowed"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-3 text-sm font-black text-[#111827]">
          <span>سالن فعال است؟</span>
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={defaults.isActive}
            disabled={!canEdit}
            className="size-5 accent-[#9f7131] disabled:cursor-not-allowed"
          />
        </label>
        <Textarea
          label="توضیحات"
          name="description"
          defaultValue={defaults.description}
          placeholder="ویژگی‌ها، محدودیت‌ها یا نکات داخلی سالن"
          disabled={!canEdit}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold leading-6 text-[#7d6841]">
          سالن غیرفعال در ثبت قراردادهای جدید پیشنهاد نمی‌شود، اما سوابق آن
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
              ? "ذخیره سالن"
              : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

export function ToggleSalonStatusForm({
  salonId,
  isActive,
  canEdit,
}: {
  salonId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleSalonStatusAction,
    initialSalonActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="salonId" value={salonId} />
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
            ? "غیرفعال‌سازی سالن"
            : "فعال‌سازی سالن"}
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
