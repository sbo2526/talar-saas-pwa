"use client";

import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { TextField } from "@/components/auth/text-field";
import { registerAction } from "@/lib/actions/auth-actions";
import { initialAuthActionState } from "@/lib/actions/auth-state";

export function RegisterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const attemptedEmailRef = useRef<string>("");
  const [state, formAction, isPending] = useActionState(
    registerAction,
    initialAuthActionState,
  );
  const [autoLoginMessage, setAutoLoginMessage] = useState("");
  const [isAutoSigningIn, setIsAutoSigningIn] = useState(false);

  useEffect(() => {
    if (!state.ok || !state.autoLoginEmail) return;
    if (attemptedEmailRef.current === state.autoLoginEmail) return;

    attemptedEmailRef.current = state.autoLoginEmail;
    const form = formRef.current;
    const password = form?.querySelector<HTMLInputElement>('input[name="password"]')?.value ?? "";

    if (!password) {
      setAutoLoginMessage(
        "حساب ساخته شد، اما رمز عبور برای ورود خودکار در فرم پیدا نشد. از صفحه ورود وارد شوید.",
      );
      return;
    }

    setIsAutoSigningIn(true);
    setAutoLoginMessage("در حال ورود مستقیم به داشبورد...");

    signIn("credentials", {
      email: state.autoLoginEmail,
      password,
      redirect: false,
      callbackUrl: state.redirectTo ?? "/dashboard",
    })
      .then((result) => {
        if (result?.ok) {
          router.replace(state.redirectTo ?? "/dashboard");
          router.refresh();
          return;
        }

        setAutoLoginMessage(
          "حساب ساخته شد، اما ورود خودکار انجام نشد. از صفحه ورود با همین ایمیل و رمز وارد شوید.",
        );
      })
      .catch(() => {
        setAutoLoginMessage(
          "حساب ساخته شد، اما ورود خودکار با خطا روبه‌رو شد. از صفحه ورود با همین ایمیل و رمز وارد شوید.",
        );
      })
      .finally(() => setIsAutoSigningIn(false));
  }, [router, state.autoLoginEmail, state.ok, state.redirectTo]);

  const showSuccess = state.ok && state.message;
  const showError = !state.ok && state.message;

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      {showError ? <AuthNotice tone="error" message={state.message} /> : null}
      {showSuccess ? <AuthNotice tone="success" message={state.message} /> : null}
      {autoLoginMessage ? (
        <AuthNotice
          tone={isAutoSigningIn ? "success" : autoLoginMessage.includes("انجام نشد") || autoLoginMessage.includes("خطا") ? "error" : "success"}
          message={autoLoginMessage}
        />
      ) : null}

      <TextField
        label="نام و نام خانوادگی"
        name="name"
        placeholder="نام مالک یا مدیر تالار"
        autoComplete="name"
      />
      <TextField
        label="ایمیل"
        name="email"
        type="email"
        placeholder="ایمیل حساب کاربری"
        autoComplete="email"
      />
      <TextField
        label="شماره موبایل (اختیاری)"
        name="phone"
        type="tel"
        placeholder="شماره موبایل"
        autoComplete="tel"
      />
      <TextField
        label="رمز عبور"
        name="password"
        type="password"
        placeholder="حداقل ۸ کاراکتر"
        helper="برای امنیت حساب، رمز عبور قبل از ذخیره هش می‌شود. پس از ساخت حساب، مستقیم وارد داشبورد می‌شوید."
        autoComplete="new-password"
      />

      <div className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/72 px-4 py-3 text-sm font-bold leading-7 text-[#6d5f49]">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 shrink-0 text-[#17483f]" size={18} />
          <p>
            هر حساب فقط یک‌بار امکان فعال‌سازی دوره بررسی دارد. پس از ثبت‌نام،
            مستقیم وارد داشبورد می‌شوید و می‌توانید دوره بررسی یا پلن خرید را انتخاب کنید.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || isAutoSigningIn}
        className="btn-luxury-primary mt-1 w-full px-5 py-3 text-base disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending || isAutoSigningIn ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
        {isPending
          ? "در حال ایجاد حساب..."
          : isAutoSigningIn
            ? "در حال ورود مستقیم..."
            : "ساخت حساب و ورود به داشبورد"}
      </button>
    </form>
  );
}

function AuthNotice({
  message,
  tone,
}: {
  message: string;
  tone: "success" | "error";
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 shadow-[0_14px_34px_rgba(17,24,39,0.08)] ${
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
