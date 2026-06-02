"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";
import {
  jalaliToDate,
  parseDateLikeToDate,
  toDateOnlyString,
} from "@/lib/date/jalali";

type JalaliDatePickerProps = {
  name: string;
  label?: string;
  defaultValue?: string | Date | null;
  value?: string | null;
  onChange?: (isoDate: string | null) => void;
  required?: boolean;
  minJalaliYear?: number;
  maxJalaliYear?: number;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
};

function toDateObject(value: string | Date | null | undefined) {
  const date = parseDateLikeToDate(value ?? null);

  if (!date) {
    return null;
  }

  return new DateObject({ date, calendar: persian, locale: persianFa });
}

function dateObjectToIsoDate(value: DateObject | null) {
  if (!value) {
    return null;
  }

  const month = typeof value.month === "number" ? value.month : value.month.number;
  const date = jalaliToDate(value.year, month, value.day);
  return toDateOnlyString(date);
}

function yearBoundary(year: number, month: number, day: number) {
  return new DateObject({ calendar: persian, locale: persianFa, year, month, day });
}

export function JalaliDatePicker({
  name,
  label,
  defaultValue,
  value,
  onChange,
  required,
  minJalaliYear,
  maxJalaliYear,
  placeholder = "انتخاب تاریخ",
  helperText,
  error,
  disabled,
  className = "",
}: JalaliDatePickerProps) {
  const controlledValue = value === undefined ? undefined : value;
  const [internalValue, setInternalValue] = useState<string | null>(() => {
    const date = parseDateLikeToDate(defaultValue ?? null);
    return date ? toDateOnlyString(date) : null;
  });
  const selectedIso = controlledValue === undefined ? internalValue : controlledValue;
  const dateObject = useMemo(() => toDateObject(selectedIso), [selectedIso]);

  const minDate = minJalaliYear ? yearBoundary(minJalaliYear, 1, 1) : undefined;
  const maxDate = maxJalaliYear ? yearBoundary(maxJalaliYear, 12, 29) : undefined;
  const describedBy = error || helperText ? `${name}-jalali-helper` : undefined;

  return (
    <label className={`grid gap-1.5 text-xs font-black text-[#172033] ${className}`}>
      {label ? (
        <span>
          {label}
          {required ? <span className="mr-1 text-[#9f7131]">*</span> : null}
        </span>
      ) : null}
      <input type="hidden" name={name} value={selectedIso ?? ""} />
      <div className="relative">
        <DatePicker
          value={dateObject}
          onChange={(nextValue) => {
            const dateValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
            const nextIso = dateValue
              ? dateObjectToIsoDate(dateValue as DateObject)
              : null;

            if (controlledValue === undefined) {
              setInternalValue(nextIso);
            }

            onChange?.(nextIso);
          }}
          calendar={persian}
          locale={persianFa}
          calendarPosition="bottom-right"
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          placeholder={placeholder}
          inputClass={`input-luxury w-full min-h-12 cursor-pointer border-[#d8c08b] bg-[#fff8ea] py-2 pl-11 text-sm font-black text-[#172033] transition hover:border-[#c7a15a] hover:bg-white focus:border-[#c7a15a] ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          containerClassName="w-full"
          format="YYYY/MM/DD"
        />
        <CalendarDays
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9f7131]"
          aria-hidden="true"
        />
      </div>
      {error || helperText ? (
        <span id={describedBy} className={`text-[11px] font-bold leading-5 ${error ? "text-[#8f2c2c]" : "text-[#7d6841]"}`}>
          {error ?? helperText}
        </span>
      ) : null}
    </label>
  );
}
