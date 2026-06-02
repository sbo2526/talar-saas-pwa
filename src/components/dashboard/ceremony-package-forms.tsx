"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Power, Save } from "lucide-react";
import { useActionState } from "react";
import {
  createCeremonyPackageAction,
  toggleCeremonyPackageStatusAction,
  updateCeremonyPackageAction,
} from "@/lib/actions/ceremony-package-actions";
import { initialCeremonyPackageActionState } from "@/lib/actions/ceremony-package-state";

export type PackageCatalogOption = {
  id: string;
  title: string;
  category: string | null;
};

export type CeremonyPackageFormValues = {
  id?: string;
  title: string;
  code: string;
  description: string;
  pricePerGuest: string;
  includedItemsNote: string;
  serviceIds: string[];
  menuIds: string[];
  sortOrder: string;
  allowPriceOverride: boolean;
  isActive: boolean;
};

type CeremonyPackageFormProps = {
  mode: "create" | "edit";
  values?: CeremonyPackageFormValues;
  services: PackageCatalogOption[];
  menus: PackageCatalogOption[];
  canEdit: boolean;
};

const defaultValues: CeremonyPackageFormValues = {
  title: "",
  code: "",
  description: "",
  pricePerGuest: "",
  includedItemsNote: "",
  serviceIds: [],
  menuIds: [],
  sortOrder: "",
  allowPriceOverride: true,
  isActive: true,
};

export function CeremonyPackageForm({
  mode,
  values,
  services,
  menus,
  canEdit,
}: CeremonyPackageFormProps) {
  const action = mode === "create" ? createCeremonyPackageAction : updateCeremonyPackageAction;
  const [state, formAction, isPending] = useActionState(
    action,
    initialCeremonyPackageActionState,
  );
  const defaults = values ?? defaultValues;

  return (
    <form action={formAction} className="grid gap-4">
      {defaults.id ? <input type="hidden" name="packageId" value={defaults.id} /> : null}

      {!canEdit ? (
        <Alert tone="warning">فقط مالک یا مدیر فضای کاری می‌تواند پکیج‌های اختصاصی مراسم را تغییر دهد.</Alert>
      ) : null}

      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="نام پکیج">
          <input name="title" defaultValue={defaults.title} className="input-luxury" placeholder="مثلاً پکیج طلایی عروسی" disabled={!canEdit} required />
        </Field>
        <Field label="کد داخلی">
          <input name="code" defaultValue={defaults.code} className="input-luxury" placeholder="مثلاً PKG-GOLD" disabled={!canEdit} dir="ltr" />
        </Field>
        <Field label="قیمت هر نفر پکیج (ریال)">
          <input name="pricePerGuest" defaultValue={defaults.pricePerGuest} className="input-luxury" placeholder="مثلاً ۱۹۰۰۰۰۰۰" disabled={!canEdit} inputMode="numeric" dir="ltr" />
        </Field>
        <Field label="ترتیب نمایش">
          <input name="sortOrder" defaultValue={defaults.sortOrder} className="input-luxury" placeholder="اختیاری" disabled={!canEdit} inputMode="numeric" dir="ltr" />
        </Field>
      </div>

      <Field label="توضیحات پکیج">
        <textarea name="description" defaultValue={defaults.description} className="input-luxury min-h-24" placeholder="توضیح کوتاه برای نمایش در ثبت قرارداد" disabled={!canEdit} />
      </Field>

      <div className="grid gap-4 lg:grid-cols-2">
        <CatalogMultiSelect
          title="خدمات زیرمجموعه پکیج"
          name="serviceIds"
          options={services}
          selectedIds={defaults.serviceIds}
          disabled={!canEdit}
          emptyText="ابتدا خدمات مراسم را در تعاریف پایه ثبت کنید."
        />
        <CatalogMultiSelect
          title="منوها و پذیرایی زیرمجموعه پکیج"
          name="menuIds"
          options={menus}
          selectedIds={defaults.menuIds}
          disabled={!canEdit}
          emptyText="ابتدا منوها را در تعاریف پایه ثبت کنید."
        />
      </div>

      <Field label="متن تکمیلی زیرمجموعه‌ها">
        <textarea name="includedItemsNote" defaultValue={defaults.includedItemsNote} className="input-luxury min-h-24" placeholder="در صورت نیاز اقلامی که در لیست خدمات/منو نیستند را بنویسید؛ هر خط یک مورد" disabled={!canEdit} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleField name="allowPriceOverride" label="اجازه ورود دستی قیمت هنگام انتخاب پکیج" defaultChecked={defaults.allowPriceOverride} disabled={!canEdit} />
        <ToggleField name="isActive" label="فعال در قراردادهای جدید" defaultChecked={defaults.isActive} disabled={!canEdit} />
      </div>

      <button type="submit" disabled={!canEdit || isPending} className="btn-luxury-primary justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60">
        <Save size={18} />
        {isPending ? "در حال ذخیره..." : mode === "create" ? "ثبت پکیج اختصاصی" : "ذخیره تغییرات پکیج"}
      </button>
    </form>
  );
}

function CatalogMultiSelect({
  title,
  name,
  options,
  selectedIds,
  disabled,
  emptyText,
}: {
  title: string;
  name: string;
  options: PackageCatalogOption[];
  selectedIds: string[];
  disabled: boolean;
  emptyText: string;
}) {
  const selected = new Set(selectedIds);

  return (
    <div className="rounded-[1.35rem] border border-[#d8c08b]/56 bg-[#fff8ea]/72 p-3">
      <h3 className="text-sm font-black text-[#17483f]">{title}</h3>
      {options.length > 0 ? (
        <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
          {options.map((option) => (
            <label key={option.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/42 bg-white/55 px-3 py-2 text-sm font-bold text-[#111827]">
              <span>
                <span className="block font-black">{option.title}</span>
                {option.category ? <span className="mt-1 block text-xs text-[#7d6841]">{option.category}</span> : null}
              </span>
              <input type="checkbox" name={name} value={option.id} defaultChecked={selected.has(option.id)} disabled={disabled} className="size-5 accent-[#c7a15a]" />
            </label>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-[#d8c08b]/60 bg-white/45 px-3 py-3 text-sm font-bold leading-7 text-[#7d6841]">{emptyText}</p>
      )}
    </div>
  );
}

export function ToggleCeremonyPackageStatusForm({
  packageId,
  isActive,
  canEdit,
}: {
  packageId: string;
  isActive: boolean;
  canEdit: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    toggleCeremonyPackageStatusAction,
    initialCeremonyPackageActionState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="packageId" value={packageId} />
      <button type="submit" disabled={!canEdit || isPending} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c] hover:bg-[#ffe2e2]" : "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f] hover:bg-[#25a46d]/16"}`}>
        <Power size={15} />
        {isActive ? "غیرفعال کردن" : "فعال کردن"}
      </button>
      {state.message ? <p className={`text-xs font-bold ${state.ok ? "text-[#17483f]" : "text-[#8f2c2c]"}`}>{state.message}</p> : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      {children}
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
  disabled: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/56 bg-[#fff8ea]/72 px-4 py-3 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled} className="size-5 accent-[#c7a15a]" />
    </label>
  );
}

function Alert({ tone, children }: { tone: "success" | "error" | "warning"; children: ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  const className = tone === "success"
    ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
    : tone === "warning"
      ? "border-[#c7a15a]/34 bg-[#fff8ea] text-[#7d6841]"
      : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${className}`}>
      <Icon size={17} className="mt-1 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
