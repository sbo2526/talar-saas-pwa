"use client";

import { AlertCircle, CheckCircle2, Save, UserRound } from "lucide-react";
import { useActionState } from "react";
import { updateAccountProfileAction } from "@/lib/actions/account-actions";
import { initialAccountActionState } from "@/lib/actions/account-state";

type AccountPersonalInfoCardProps = {
  name: string;
  phone: string;
  nationalCode: string;
  address: string;
  postalCode: string;
};

export function AccountPersonalInfoCard({
  name,
  phone,
  nationalCode,
  address,
  postalCode,
}: AccountPersonalInfoCardProps) {
  const [state, formAction, isPending] = useActionState(
    updateAccountProfileAction,
    initialAccountActionState,
  );

  return (
    <section
      id="personal-info"
      className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black text-[#17483f]">اطلاعات شخصی</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            ویرایش اطلاعات قابل ثبت
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            فقط اطلاعاتی که کاربر می‌تواند به‌صورت امن ویرایش کند در این فرم
            قرار دارد.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#c7a15a]/30 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          <UserRound size={15} />
          پروفایل کاربری
        </span>
      </div>

      {state.message ? (
        <div
          className={
            state.ok
              ? "mt-4 flex items-start gap-3 rounded-2xl border border-[#25a46d]/22 bg-[#ecfff5] px-4 py-3 text-sm font-bold leading-7 text-[#126141]"
              : "mt-4 flex items-start gap-3 rounded-2xl border border-[#b45353]/25 bg-[#fff1f1] px-4 py-3 text-sm font-bold leading-7 text-[#8f2c2c]"
          }
        >
          {state.ok ? (
            <CheckCircle2 className="mt-1 shrink-0" size={18} />
          ) : (
            <AlertCircle className="mt-1 shrink-0" size={18} />
          )}
          <span>{state.message}</span>
        </div>
      ) : null}

      <form action={formAction} className="mt-5 grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>نام و نام خانوادگی</span>
            <input
              name="name"
              defaultValue={name}
              className="input-luxury"
              placeholder="نام مالک یا مدیر تالار"
              autoComplete="name"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>شماره موبایل</span>
            <input
              name="phone"
              defaultValue={phone}
              className="input-luxury"
              placeholder="شماره موبایل"
              autoComplete="tel"
              dir="ltr"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>کد ملی</span>
            <input
              name="nationalCode"
              defaultValue={nationalCode}
              className="input-luxury"
              placeholder="کد ملی ۱۰ رقمی"
              inputMode="numeric"
              dir="ltr"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>کد پستی</span>
            <input
              name="postalCode"
              defaultValue={postalCode}
              className="input-luxury"
              placeholder="کد پستی ۱۰ رقمی"
              inputMode="numeric"
              dir="ltr"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#172033] md:col-span-2">
            <span>آدرس کاربر</span>
            <textarea
              name="address"
              defaultValue={address}
              className="input-luxury min-h-28 resize-y"
              placeholder="آدرس محل سکونت یا نشانی ارتباطی"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-4 py-3 text-sm font-bold leading-7 text-[#6d5f49]">
          کد ملی فقط برای تکمیل اطلاعات حساب و مدیریت داخلی سامانه استفاده
          می‌شود و در صفحات عمومی نمایش داده نخواهد شد.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold leading-6 text-[#7d6841]">
            ایمیل، نقش، وضعیت حساب و شناسه کاربری از این فرم قابل تغییر نیستند.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="btn-luxury-dark px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
        </div>
      </form>
    </section>
  );
}
