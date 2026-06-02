import {
  ArrowLeft,
  CheckCircle2,
  Info,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { TextField } from "@/components/auth/text-field";

const securityNotes = [
  "لینک بازیابی فقط برای ایمیل ثبت‌شده ارسال می‌شود.",
  "برای امنیت بیشتر، رمز عبور جدید باید متفاوت و قوی باشد.",
  "در صورت نداشتن حساب، ابتدا ثبت‌نام کنید.",
];

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="بازیابی دسترسی به حساب"
      description="ایمیل حساب کاربری خود را وارد کنید تا راهنمای بازیابی رمز عبور برای شما آماده شود."
      footerText="رمز عبور را به یاد آوردید؟"
      footerHref="/login"
      footerLink="بازگشت به ورود"
    >
      <form className="grid gap-5">
        <div className="rounded-2xl border border-[#2f7d58]/25 bg-[#e9f8ef] px-4 py-3 text-sm font-bold leading-7 text-[#17483f] shadow-[0_14px_34px_rgba(17,24,39,0.08)]">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 shrink-0" size={18} />
            <p>
              اطلاعات قراردادها و فضای اختصاصی تالار شما با دسترسی امن محافظت
              می‌شود.
            </p>
          </div>
        </div>

        <TextField
          label="ایمیل حساب کاربری"
          name="email"
          type="email"
          placeholder="example@domain.com"
          helper="ایمیلی را وارد کنید که با آن حساب تالار منیجر را ساخته‌اید."
          autoComplete="email"
        />

        <button
          type="button"
          className="btn-luxury-primary mt-1 w-full px-5 py-3 text-base"
        >
          <KeyRound size={18} />
          ارسال راهنمای بازیابی
        </button>

        <div className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-4 py-3 text-sm font-bold leading-7 text-[#6d5f49]">
          <div className="flex items-start gap-3">
            <Info className="mt-1 shrink-0 text-[#9f7131]" size={18} />
            <p>
در صورت نیاز فوری به بازیابی دسترسی، با مدیر سامانه یا پشتیبانی مجموعه تماس بگیرید.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/login"
            className="btn-luxury-dark px-5 py-3 text-sm"
          >
            <LockKeyhole size={17} />
            بازگشت به ورود
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#17483f]/10 px-5 py-3 text-sm font-black text-[#17483f] hover:border-[#c7a15a]/45 hover:bg-[#c7a15a]/12"
          >
            ساخت حساب جدید
            <ArrowLeft size={17} />
          </Link>
        </div>

        <section className="rounded-[1.5rem] border border-[#d8c08b]/55 bg-[linear-gradient(145deg,rgba(255,248,234,0.86),rgba(247,236,211,0.72))] p-4 shadow-[0_14px_34px_rgba(17,24,39,0.07)]">
          <div className="flex items-center gap-2 text-sm font-black text-[#17483f]">
            <ShieldCheck size={18} />
            امنیت بازیابی حساب
          </div>
          <div className="gold-divider my-4" />
          <div className="grid gap-3">
            {securityNotes.map((note) => (
              <div
                key={note}
                className="flex items-start gap-3 text-sm font-bold leading-7 text-[#6d5f49]"
              >
                <CheckCircle2
                  className="mt-1 shrink-0 text-[#c7a15a]"
                  size={17}
                />
                <span>{note}</span>
              </div>
            ))}
          </div>
        </section>
      </form>
    </AuthShell>
  );
}
