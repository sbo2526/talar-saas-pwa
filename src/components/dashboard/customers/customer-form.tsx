"use client";

import { useActionState } from "react";
import { AlertCircle, Save, UserRound } from "lucide-react";
import { createCustomerAction, updateCustomerAction } from "@/lib/actions/customer-actions";
import { initialCustomerActionState } from "@/lib/actions/customer-state";
import { customerSalutations } from "@/lib/validation/customer";

export type CustomerFormValues = {
  id?: string;
  salutation?: string | null;
  fullName?: string;
  phone?: string;
  nationalCode?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

type CustomerFormProps = {
  mode: "create" | "edit";
  values?: CustomerFormValues;
  backHref?: string;
};

export function CustomerForm({
  mode,
  values,
  backHref = "/dashboard/customers",
}: CustomerFormProps) {
  const action = mode === "create" ? createCustomerAction : updateCustomerAction;
  const [state, formAction, isPending] = useActionState(action, initialCustomerActionState);

  return (
    <form action={formAction} className="grid gap-4">
      {values?.id ? <input type="hidden" name="customerId" value={values.id} /> : null}
      {state.message ? (
        <div className={`flex items-start gap-2 rounded-3xl border px-4 py-3 text-sm font-black leading-7 ${state.ok ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>
          <AlertCircle size={18} className="mt-1 shrink-0" />
          <span>{state.message}</span>
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
            <UserRound size={18} />
          </span>
          <h2 className="text-lg font-black">اطلاعات مشتری</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-black text-[#172033]">
            <span>عنوان</span>
            <select name="salutation" defaultValue={values?.salutation ?? "آقا"} className="input-luxury min-h-12 py-2 text-sm">
              {customerSalutations.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <Field label="نام و نام خانوادگی" name="fullName" defaultValue={values?.fullName ?? ""} required />
          <Field label="شماره همراه" name="phone" defaultValue={values?.phone ?? ""} inputMode="tel" required dir="ltr" />
          <Field label="کد ملی" name="nationalCode" defaultValue={values?.nationalCode ?? ""} inputMode="numeric" dir="ltr" />
          <label className="grid gap-1.5 text-sm font-black text-[#172033] md:col-span-2">
            <span>آدرس منزل</span>
            <textarea name="address" defaultValue={values?.address ?? ""} className="input-luxury min-h-24 resize-y py-3 text-sm leading-7" />
          </label>
          <label className="grid gap-1.5 text-sm font-black text-[#172033] md:col-span-2">
            <span>توضیحات</span>
            <textarea name="notes" defaultValue={values?.notes ?? ""} className="input-luxury min-h-24 resize-y py-3 text-sm leading-7" />
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/72 px-4 py-3 text-sm font-black text-[#172033] md:col-span-2">
            <span>مشتری فعال باشد</span>
            <input name="isActive" type="checkbox" defaultChecked={values?.isActive ?? true} className="size-5 accent-[#17483f]" />
          </label>
        </div>
      </section>

      <div className="flex flex-col gap-2 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3 shadow-[0_14px_42px_rgba(17,24,39,0.08)] sm:flex-row sm:justify-end">
        <a href={backHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-5 py-3 text-sm font-black text-[#7d6841]">
          انصراف
        </a>
        <button type="submit" disabled={isPending} className="btn-luxury-dark min-h-12 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60">
          <Save size={17} />
          {isPending ? "در حال ذخیره..." : mode === "create" ? "ثبت مشتری" : "ذخیره تغییرات"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  inputMode,
  required,
  dir,
}: {
  label: string;
  name: string;
  defaultValue: string;
  inputMode?: "tel" | "numeric";
  required?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <label className="grid gap-1.5 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        className="input-luxury min-h-12 py-2 text-sm"
        inputMode={inputMode}
        required={required}
        dir={dir}
      />
    </label>
  );
}
