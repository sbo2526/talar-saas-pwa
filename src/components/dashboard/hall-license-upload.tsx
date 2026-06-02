"use client";

import { ImagePlus, ShieldCheck } from "lucide-react";
import Image from "next/image";

type HallLicenseUploadProps = {
  previewUrl?: string | null;
  disabled?: boolean;
};

export function HallLicenseUpload({
  previewUrl,
  disabled = false,
}: HallLicenseUploadProps) {
  return (
    <div className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <ImagePlus size={19} />
        </span>
        <div>
          <h3 className="font-black text-[#111827]">تصویر مجوز تالار</h3>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
            فایل‌های jpg، jpeg، png و webp تا حجم ۵ مگابایت مجاز هستند. می‌توانید
            تصویر مجوز را از گالری یا دوربین موبایل انتخاب کنید.
          </p>
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-[#d8c08b]/62 bg-white">
          <Image
            src={previewUrl}
            alt="تصویر مجوز تالار"
            width={900}
            height={620}
            className="max-h-72 w-full object-contain"
            unoptimized
          />
        </div>
      ) : (
        <div className="mt-4 rounded-[1.25rem] border border-dashed border-[#c7a15a]/55 bg-[#fffdf6]/80 p-5 text-center text-sm font-bold leading-7 text-[#7d6841]">
          هنوز تصویری برای مجوز تالار بارگذاری نشده است.
        </div>
      )}

      <label className="mt-4 grid gap-2 text-sm font-black text-[#172033]">
        <span>بارگذاری یا جایگزینی تصویر مجوز</span>
        <input
          name="licenseImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          className="block w-full rounded-2xl border border-[#d8c08b]/75 bg-[#fff8ea]/95 px-4 py-3 text-sm font-bold text-[#101722] file:ml-4 file:rounded-xl file:border-0 file:bg-[#111827] file:px-4 file:py-2 file:text-sm file:font-black file:text-[#f0dba9] disabled:cursor-not-allowed disabled:opacity-60"
        />
      </label>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#25a46d]/22 bg-[#ecfff5] px-4 py-3 text-sm font-bold leading-7 text-[#126141]">
        <ShieldCheck className="mt-1 shrink-0" size={17} />
        <span>
          تصویر مجوز فقط برای بررسی و تکمیل اطلاعات تالار استفاده می‌شود و در
          صفحات عمومی نمایش داده نخواهد شد.
        </span>
      </div>
    </div>
  );
}
