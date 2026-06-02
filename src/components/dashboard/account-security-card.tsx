import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/dashboard/logout-button";

export function AccountSecurityCard() {
  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9]">
          <ShieldCheck size={21} />
        </span>
        <div>
          <p className="text-xs font-black text-[#f0dba9]">امنیت حساب</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">
            دسترسی امن به فضای اختصاصی
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
            تغییر رمز عبور مستقیم هنوز به این مرکز حساب متصل نشده است. در صورت
            نیاز، مسیر بازیابی رمز را دنبال کنید و پس از تکمیل سرویس ایمیل،
            لینک بازیابی برای حساب ثبت‌شده ارسال می‌شود.
          </p>
        </div>
      </div>

      <div className="gold-divider my-5" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/forgot-password"
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-[#e8c478]/24 bg-[#e8c478]/10 px-4 py-3 text-sm font-black text-[#f0dba9] transition hover:border-[#e8c478]/50"
        >
          <KeyRound size={17} />
          بازیابی رمز عبور
        </Link>
        <div className="flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.055] px-4 py-3">
          <LogOut size={17} className="ml-2 text-[#f0dba9]" />
          <LogoutButton />
        </div>
      </div>
    </section>
  );
}
