"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState, useTransition } from "react";
import { TextField } from "@/components/auth/text-field";

type LoginFormProps = {
  registered?: boolean;
  suspended?: boolean;
  staleSession?: boolean;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ registered, suspended, staleSession }: LoginFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email) {
      setMessage("لطفاً ایمیل حساب کاربری را وارد کنید.");
      return;
    }

    if (!emailPattern.test(email)) {
      setMessage("فرمت ایمیل صحیح نیست.");
      return;
    }

    if (!password) {
      setMessage("لطفاً رمز عبور را وارد کنید.");
      return;
    }

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.ok) {
        const session = await getSession();
        const targetPath = session?.user?.isPlatformAdmin ? "/admin" : "/dashboard";

        router.replace(targetPath);
        router.refresh();
        return;
      }

      const passwordInput = formRef.current?.querySelector<HTMLInputElement>('input[name="password"]');
      if (passwordInput) {
        passwordInput.value = "";
      }

      setMessage("ایمیل یا رمز عبور واردشده صحیح نیست.");
    });
  }

  return (
    <form ref={formRef} className="grid gap-4" noValidate onSubmit={onSubmit}>
      {registered ? (
        <AuthAlert
          tone="success"
          message="حساب شما ساخته شد. اکنون وارد پنل مدیریت شوید."
        />
      ) : null}
      {suspended ? (
        <AuthAlert
          tone="error"
          message="حساب شما معلق شده است. برای ادامه با پشتیبانی تماس بگیرید."
        />
      ) : null}
      {staleSession ? (
        <AuthAlert
          tone="error"
          message="نشست قبلی مرورگر با کاربر موجود در دیتابیس هماهنگ نبود و پاک شد. حالا دوباره وارد شوید."
        />
      ) : null}
      <TextField
        label="ایمیل"
        name="email"
        type="email"
        placeholder="ایمیل حساب کاربری"
        autoComplete="email"
      />

      <div className="grid gap-2">
        <label
          htmlFor="password"
          className="grid gap-2 text-sm font-black text-[#172033]"
        >
          <span>رمز عبور</span>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="رمز عبور"
              autoComplete="current-password"
              dir="ltr"
              className="min-h-[3.6rem] w-full rounded-2xl border border-[#d8c08b]/75 bg-[#fff8ea]/95 py-3.5 pl-16 pr-4 text-left text-[0.97rem] font-bold text-[#101722] shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_12px_32px_rgba(17,24,39,0.06)] outline-none transition placeholder:text-right placeholder:text-[#8a7a5e]/65 focus:border-[#c7a15a] focus:bg-white focus:ring-4 focus:ring-[#c7a15a]/25"
            />
            <button
              type="button"
              aria-label={showPassword ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
              aria-pressed={showPassword}
              className="absolute left-3 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-xl border border-[#d8c08b]/60 bg-white/70 text-[#6d5f49] transition hover:border-[#c7a15a] hover:text-[#17483f]"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <span className="text-xs font-bold leading-6 text-[#7d6841]">
            اطلاعات ورود شما به‌صورت امن بررسی می‌شود.
          </span>
        </label>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <p className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/70 px-3 py-2 text-xs font-bold leading-6 text-[#665334] shadow-[0_10px_24px_rgba(17,24,39,0.04)]">
            <Info size={15} />
            نکته امنیتی: روی دستگاه عمومی، پس از پایان کار از حساب خارج شوید.
          </p>
          <Link
            href="/forgot-password"
            className="justify-self-start rounded-lg px-1 py-1 text-xs font-black text-[#17483f] underline-offset-4 transition hover:text-[#9f7131] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a15a]/55 sm:justify-self-end"
          >
            فراموشی رمز عبور
          </Link>
        </div>
      </div>

      <div className="flex min-h-[2.15rem] items-start" aria-live="polite">
        {message ? <AuthAlert tone="error" message={message} compact /> : null}
      </div>

      <button
        type="submit"
        disabled={isPending}
        aria-busy={isPending}
        className="btn-luxury-primary mt-0 min-h-[3.45rem] w-full px-5 py-3 text-base shadow-[0_18px_48px_rgba(199,161,90,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <LockKeyhole size={18} />
        )}
        {isPending ? "در حال ورود..." : "ورود به پنل مدیریت"}
      </button>

      <p className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-4 py-3 text-center text-sm font-bold leading-7 text-[#6d5f49]">
        پس از ورود، مستقیماً به پنل مناسب حساب خود هدایت می‌شوید.
      </p>
    </form>
  );
}

function AuthAlert({
  tone,
  message,
  compact = false,
}: {
  tone: "success" | "error";
  message: string;
  compact?: boolean;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      aria-live="polite"
      className={`flex items-start gap-3 rounded-2xl border px-4 ${
        compact ? "py-2.5 text-xs leading-6" : "py-3 text-sm leading-7"
      } font-bold shadow-[0_14px_34px_rgba(17,24,39,0.08)] ${
        tone === "success"
          ? "border-[#2f7d58]/25 bg-[#e9f8ef] text-[#17483f]"
          : "border-[#b45353]/25 bg-[#fff1f1] text-[#8f2c2c]"
      }`}
    >
      <Icon className="mt-1 shrink-0" size={18} />
      <span>{message}</span>
    </div>
  );
}
