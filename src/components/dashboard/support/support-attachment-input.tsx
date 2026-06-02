"use client";

import { useId, useState } from "react";
import { Paperclip } from "lucide-react";
import { toPersianDigits } from "@/lib/date/jalali";

const supportAttachmentAccept =
  "image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "۰ بایت";
  }

  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 1) {
    return `${toPersianDigits(megabytes.toFixed(1))} مگابایت`;
  }

  return `${toPersianDigits(Math.ceil(bytes / 1024))} کیلوبایت`;
}

export function SupportAttachmentInput({
  disabled,
  compact = false,
}: {
  disabled?: boolean;
  compact?: boolean;
}) {
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);

  return (
    <div className={compact ? "grid gap-1.5" : "grid gap-2 md:col-span-2"}>
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer items-center gap-3 border border-dashed border-[#c7a15a]/55 bg-white/55 font-black text-[#7d6841] transition hover:bg-[#fff4d8]/70 ${
          compact
            ? "rounded-2xl px-4 py-3 text-xs"
            : "justify-between rounded-3xl px-4 py-4 text-sm"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <span className="flex items-center gap-2">
          <Paperclip size={compact ? 16 : 18} />
          پیوست اختیاری
        </span>
        {!compact ? (
          <span className="text-xs text-[#9f7131]">
            JPG، PNG، WebP، PDF، DOC، DOCX، XLSX تا ۱۰ مگابایت
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        name="attachment"
        type="file"
        className="sr-only"
        accept={supportAttachmentAccept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          setSelectedFile(file ? { name: file.name, size: file.size } : null);
        }}
      />
      <p className="min-h-5 text-xs font-bold leading-5 text-[#7d6841]">
        {selectedFile
          ? `فایل انتخاب‌شده: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
          : "فایل‌های مجاز: JPG، PNG، WebP، PDF، DOC، DOCX و XLSX تا ۱۰ مگابایت"}
      </p>
    </div>
  );
}
