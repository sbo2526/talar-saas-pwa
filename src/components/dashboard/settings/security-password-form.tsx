"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { changePasswordAction } from "@/lib/actions/security-actions";
import { initialSecurityActionState } from "@/lib/actions/security-state";
import { toPersianDigits } from "@/lib/date/jalali";

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  if (!password) {
    return { score: 0, label: "وارد نشده", tone: "neutral" as const };
  }

  if (score <= 2) {
    return { score, label: "ضعیف", tone: "danger" as const };
  }

  if (score <= 4) {
    return { score, label: "قابل قبول", tone: "warning" as const };
  }

  return { score, label: "قوی", tone: "success" as const };
}

function strengthClass(tone: "neutral" | "danger" | "warning" | "success") {
  if (tone === "success") {
    return "bg-[#25a46d]";
  }

  if (tone === "warning") {
    return "bg-[#c7a15a]";
  }

  if (tone === "danger") {
    return "bg-[#b45353]";
  }

  return "bg-[#d8c08b]";
}

export function SecurityPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialSecurityActionState,
  );
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [newPassword, setNewPassword] = useState("");
  const strength = useMemo(() => getPasswordStrength(newPassword), [newPassword]);
  const strengthPercent = Math.max(8, Math.min(100, strength.score * 20));

  function toggleVisibility(name: string) {
    setVisibleFields((current) => ({ ...current, [name]: !current[name] }));
  }

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <PasswordField
          name="currentPassword"
          label="رمز عبور فعلی"
          visible={Boolean(visibleFields.currentPassword)}
          onToggle={() => toggleVisibility("currentPassword")}
          autoComplete="current-password"
        />
        <PasswordField
          name="newPassword"
          label="رمز عبور جدید"
          value={newPassword}
          visible={Boolean(visibleFields.newPassword)}
          onChange={setNewPassword}
          onToggle={() => toggleVisibility("newPassword")}
          autoComplete="new-password"
        />
        <PasswordField
          name="confirmPassword"
          label="تکرار رمز عبور جدید"
          visible={Boolean(visibleFields.confirmPassword)}
          onToggle={() => toggleVisibility("confirmPassword")}
          autoComplete="new-password"
        />
      </div>

      <div className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff8ea]/78 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-black text-[#111827]">
            <ShieldCheck size={17} className="text-[#17483f]" />
            قدرت رمز عبور جدید
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-black ${
              strength.tone === "success"
                ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
                : strength.tone === "warning"
                  ? "border-[#c7a15a]/36 bg-[#c7a15a]/12 text-[#7d6841]"
                  : strength.tone === "danger"
                    ? "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"
                    : "border-[#d8c08b]/62 bg-white/60 text-[#7d6841]"
            }`}
          >
            {strength.label}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8c08b]/45">
          <div
            className={`h-full rounded-full ${strengthClass(strength.tone)}`}
            style={{ width: `${strengthPercent}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold leading-6 text-[#6d5f49]">
          حداقل {toPersianDigits(8)} کاراکتر استفاده کنید و ترکیبی از حروف، عدد
          و نماد را انتخاب کنید.
        </p>
      </div>

      {state.message ? (
        <div
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${
            state.ok
              ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]"
              : "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
          }`}
        >
          {state.ok ? (
            <CheckCircle2 size={18} className="mt-1 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-1 shrink-0" />
          )}
          <span>{state.message}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn-luxury-dark justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
      >
        <KeyRound size={17} />
        {isPending ? "در حال تغییر رمز عبور..." : "تغییر رمز عبور"}
      </button>
    </form>
  );
}

function PasswordField({
  name,
  label,
  value,
  visible,
  onToggle,
  onChange,
  autoComplete,
}: {
  name: string;
  label: string;
  value?: string;
  visible: boolean;
  onToggle: () => void;
  onChange?: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-[#172033]">
      <span>{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange ? (event) => onChange(event.target.value) : undefined}
          autoComplete={autoComplete}
          className="input-luxury h-12 pl-12"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute left-2 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#7d6841] hover:bg-[#c7a15a]/10"
          aria-label={visible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
