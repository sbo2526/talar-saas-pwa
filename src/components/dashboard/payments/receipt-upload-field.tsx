"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { FileText, ImageIcon, Trash2, UploadCloud } from "lucide-react";
import { formatPersianNumber } from "@/lib/formatters";

type ReceiptUploadFieldProps = {
  name?: string;
  disabled?: boolean;
  currentReceiptUrl?: string | null;
};

const acceptedReceiptTypes = "image/jpeg,image/png,image/webp,application/pdf";

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${formatPersianNumber(Number((bytes / (1024 * 1024)).toFixed(1)))} مگابایت`;
  }

  return `${formatPersianNumber(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
}

export function ReceiptUploadField({
  name = "receiptFile",
  disabled,
  currentReceiptUrl,
}: ReceiptUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const isImage = file?.type.startsWith("image/");
  const isPdf = file?.type === "application/pdf";
  const previewUrl = useMemo(() => {
    if (!file || !isImage) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file, isImage]);

  useEffect(() => {
    if (!previewUrl) {
      return;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function openPicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
  }

  function clearFile() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setFile(null);
  }

  return (
    <div className="grid gap-1.5 text-xs font-black text-[#172033]">
      <span>تصویر رسید</span>
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={acceptedReceiptTypes}
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />
      <div
        className={`rounded-[1.35rem] border border-dashed p-3 transition ${
          disabled
            ? "border-[#d8c08b]/42 bg-[#f5ead3]/55 opacity-70"
            : "cursor-pointer border-[#c7a15a]/58 bg-[linear-gradient(145deg,rgba(255,248,234,0.94),rgba(255,255,255,0.55))] hover:border-[#9f7131]/70 hover:bg-[#fff8ea]"
        }`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
      >
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-[1.05rem] border border-[#d8c08b]/38 bg-white/[0.46] px-4 py-5 text-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="پیش‌نمایش رسید" className="h-24 w-24 rounded-2xl border border-[#d8c08b]/52 object-cover shadow-sm" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_12px_28px_rgba(17,24,39,0.18)]">
              {isPdf ? <FileText size={25} /> : file ? <ImageIcon size={25} /> : <UploadCloud size={26} />}
            </span>
          )}

          <div>
            <p className="text-sm font-black text-[#172033]">
              {file ? file.name : "رسید دریافت را بارگذاری کنید"}
            </p>
            <p className="mt-1 text-[11px] font-bold leading-5 text-[#7d6841]">
              {file ? `${isPdf ? "فایل PDF" : "فایل تصویر"} · ${formatFileSize(file.size)}` : "JPG، PNG، WebP یا PDF تا ۵ مگابایت"}
            </p>
          </div>

          <button
            type="button"
            disabled={disabled}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#111827]/12 bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/55 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
          >
            {file ? "تغییر فایل" : "انتخاب فایل رسید"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {file ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#8f2c2c] underline underline-offset-4"
            onClick={clearFile}
            disabled={disabled}
          >
            <Trash2 size={14} />
            حذف فایل
          </button>
        ) : null}
        {currentReceiptUrl ? (
          <a href={currentReceiptUrl} target="_blank" rel="noreferrer" className="text-xs font-black text-[#17483f] underline underline-offset-4">
            مشاهده رسید فعلی
          </a>
        ) : null}
      </div>
    </div>
  );
}
