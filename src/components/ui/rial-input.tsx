"use client";

import type { InputHTMLAttributes } from "react";
import { useMemo } from "react";

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function normalizeMoneyInput(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .replace(/[٬،,\s]/g, "")
    .replace(/[^0-9]/g, "");
}

export function formatMoneyInput(value: string | number | null | undefined) {
  const raw = normalizeMoneyInput(String(value ?? ""));
  if (!raw) return "";

  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(raw),
  );
}

type RialInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string | number | null | undefined;
  onValueChange: (rawValue: string) => void;
  label?: string;
  inputClassName?: string;
  wrapperClassName?: string;
};

export function RialInput({
  value,
  onValueChange,
  label,
  className,
  inputClassName,
  wrapperClassName,
  ...props
}: RialInputProps) {
  const displayValue = useMemo(() => formatMoneyInput(value), [value]);
  const input = (
    <div className={`relative ${wrapperClassName ?? ""}`}>
      <input
        {...props}
        value={displayValue}
        onChange={(event) => onValueChange(normalizeMoneyInput(event.target.value))}
        inputMode={props.inputMode ?? "numeric"}
        dir="ltr"
        className={`${
          inputClassName ?? "input-luxury min-h-12 py-2 text-sm"
        } !pl-16 !pr-4 text-right tabular-nums`}
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#9f7131]">
        ریال
      </span>
    </div>
  );

  if (!label) {
    return input;
  }

  return (
    <label className={`grid gap-2 ${className ?? ""}`}>
      <span>{label}</span>
      {input}
    </label>
  );
}
