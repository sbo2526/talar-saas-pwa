"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import {
  removeHallLogoAction,
  uploadHallLogoAction,
} from "@/lib/actions/contract-setting-actions";

type LogoState = { ok: boolean; message: string } | null;

async function uploadAction(
  previousState: LogoState,
  formData: FormData,
): Promise<LogoState> {
  void previousState;
  return uploadHallLogoAction(formData);
}

async function removeAction(previousState: LogoState): Promise<LogoState> {
  void previousState;
  return removeHallLogoAction();
}

export function HallLogoUploadPanel({
  logoUrl,
  canEdit,
}: {
  logoUrl?: string | null;
  canEdit: boolean;
}) {
  const uploadInputId = useId();
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(
    null,
  );
  const previewObjectUrlRef = useRef<string | null>(null);
  const activeLogoUrl = selectedPreviewUrl || logoUrl || null;
  const [logoPreviewFailed, setLogoPreviewFailed] = useState(false);

  useEffect(() => {
    setLogoPreviewFailed(false);
  }, [activeLogoUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const handleLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }

    if (!file) {
      setSelectedPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setSelectedPreviewUrl(objectUrl);
  };

  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadAction,
    null,
  );
  const [removeState, removeFormAction, removePending] = useActionState(
    removeAction,
    null,
  );
  const state = uploadState ?? removeState;
  const isPending = uploadPending || removePending;

  return (
    <section className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_14px_46px_rgba(17,24,39,0.06)] sm:rounded-[1.9rem] sm:p-5">
      <div className="grid gap-4">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-right">
          <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border-4 border-[#d8c08b]/70 bg-[#111827] p-2 shadow-[0_18px_48px_rgba(17,24,39,0.16)]">
            {activeLogoUrl && !logoPreviewFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeLogoUrl}
                alt={
                  selectedPreviewUrl
                    ? "پیش‌نمایش لوگوی انتخاب‌شده"
                    : "لوگوی تالار"
                }
                className="size-full rounded-[1.05rem] object-contain"
                draggable={false}
                onError={() => setLogoPreviewFailed(true)}
              />
            ) : (
              <div className="flex size-full items-center justify-center rounded-[1.05rem] bg-[#172033]">
                <ImagePlus size={34} className="text-[#f0dba9]" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-[#9f7131]">لوگوی چاپ قرارداد</p>
          <h2 className="mt-1 text-lg font-black">
            لوگوی تالار برای قرارداد و پیش‌فاکتور
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            لوگوی تالار در سربرگ چاپ قرارداد و پیش‌فاکتور نمایش داده می‌شود.
            فایل‌های JPG، PNG یا WebP تا ۵ مگابایت پذیرفته می‌شوند.
          </p>
          {selectedPreviewUrl ? (
            <p className="mt-2 rounded-2xl border border-[#25a46d]/20 bg-[#25a46d]/8 px-3 py-2 text-xs font-black leading-6 text-[#17483f]">
              پیش‌نمایش لوگوی انتخاب‌شده نمایش داده شد. برای ثبت نهایی، دکمه
              بارگذاری لوگوی تالار را بزنید.
            </p>
          ) : !logoUrl ? (
            <p className="mt-2 text-xs font-black text-[#7d6841]">
پس از بارگذاری، لوگو در همین صفحه و در چاپ قرارداد نمایش داده می‌شود.
            </p>
          ) : null}
          {logoPreviewFailed && activeLogoUrl ? (
            <p className="mt-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-3 py-2 text-xs font-black leading-6 text-[#8f2c2c]">
              فایل لوگوی ذخیره‌شده پیدا نشد. لوگو را دوباره انتخاب و بارگذاری کنید.
            </p>
          ) : null}
          {state?.message ? (
            <p
              className={`mt-2 rounded-2xl border px-3 py-2 text-xs font-black ${
                state.ok
                  ? "border-[#25a46d]/22 bg-[#25a46d]/8 text-[#17483f]"
                  : "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
              }`}
            >
              {state.message}
            </p>
          ) : null}
        </div>
        </div>

        {canEdit ? (
          <div className="grid gap-2 rounded-[1.25rem] border border-[#d8c08b]/45 bg-white/55 p-3">
            <form
              action={uploadFormAction}
              className="grid gap-2"
              encType="multipart/form-data"
            >
              <label
                htmlFor={uploadInputId}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/42 bg-[#fff8ea] px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]"
              >
                <UploadCloud size={17} />
                انتخاب فایل لوگو
              </label>
              <input
                id={uploadInputId}
                name="hallLogo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                required
                onChange={handleLogoFileChange}
              />
              <button
                type="submit"
                disabled={isPending}
                className="btn-luxury-dark justify-center px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ImagePlus size={16} />
                )}
                {uploadPending ? "در حال بارگذاری…" : "بارگذاری لوگوی تالار"}
              </button>
            </form>
            {logoUrl ? (
              <form action={removeFormAction}>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-4 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/40 hover:bg-[#ffe7e7] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {removePending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  حذف لوگو
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
