"use client";

import { AlertCircle, CheckCircle2, Eye, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useMemo, useState, useActionState } from "react";
import { retryNotificationLogAction } from "@/lib/actions/notification-log-actions";
import { initialNotificationLogActionState } from "@/lib/actions/notification-log-state";
import {
  getNotificationChannelLabel,
  getNotificationEventLabel,
  getNotificationStatusLabel,
} from "@/lib/notifications/constants";

type MessageLogRetryDialogProps = {
  logId: string;
  channel: string;
  eventType: string;
  status: string;
  recipient: string;
  title: string;
  message: string;
};

function previewText(value: string, max = 220) {
  const normalized = value.trim();
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

export function MessageLogRetryDialog({
  logId,
  channel,
  eventType,
  status,
  recipient,
  title,
  message,
}: MessageLogRetryDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(
    retryNotificationLogAction,
    initialNotificationLogActionState,
  );

  const canRetry = status === "FAILED" || status === "QUEUED";
  const messagePreview = useMemo(() => previewText(message), [message]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!canRetry) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#8f2c2c]/25 bg-[#fff0ef] px-4 py-2.5 text-xs font-black text-[#8f2c2c] transition hover:bg-[#ffe4e1] hover:text-[#111827]"
      >
        <RefreshCw size={15} />
        ارسال مجدد
      </button>

      {open ? (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-[#06101f]/65 p-3 backdrop-blur-sm" dir="rtl">
          <button
            type="button"
            aria-label="بستن پنجره ارسال مجدد"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#e8c478]/35 bg-[#fff9ee] text-right shadow-[0_30px_120px_rgba(0,0,0,0.32)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#ead6a6] bg-[linear-gradient(135deg,#111827,#172033)] px-5 py-4 text-[#fff8ea] sm:px-6">
              <div>
                <p className="text-xs font-black text-[#f0dba9]">تأیید ارسال مجدد</p>
                <h2 className="mt-1 text-xl font-black">ارسال دوباره پیام ثبت‌شده</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-[#f7e8be]/86">
                  متن زیر دقیقاً برای همان گیرنده دوباره ارسال می‌شود. در صورت خطا، نتیجه همین‌جا و در سوابق پیام‌ها ثبت می‌شود.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-[#f7e8be] transition hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-4 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/70 p-3">
                  <p className="text-[11px] font-black text-[#7d6841]">کانال و رویداد</p>
                  <p className="mt-1 text-sm font-black text-[#111827]">
                    {getNotificationChannelLabel(channel)} · {getNotificationEventLabel(eventType)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/70 p-3">
                  <p className="text-[11px] font-black text-[#7d6841]">گیرنده</p>
                  <p className="mt-1 text-sm font-black text-[#111827]">{recipient || "—"}</p>
                </div>
                <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/70 p-3">
                  <p className="text-[11px] font-black text-[#7d6841]">وضعیت فعلی</p>
                  <p className="mt-1 text-sm font-black text-[#111827]">{getNotificationStatusLabel(status)}</p>
                </div>
                <div className="rounded-2xl border border-[#d8c08b]/62 bg-white/70 p-3">
                  <p className="text-[11px] font-black text-[#7d6841]">عنوان پیام</p>
                  <p className="mt-1 text-sm font-black text-[#111827]">{title || getNotificationEventLabel(eventType)}</p>
                </div>
              </div>

              <details className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-white/70 p-4" open>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-[#17483f] marker:hidden">
                  <Eye size={17} />
                  پیش‌نمایش متن پیام
                </summary>
                <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-[#ead6a6] bg-[#fffaf0] p-4 text-sm font-bold leading-8 text-[#4f4638]">
                  {messagePreview}
                </pre>
              </details>

              {state.message ? (
                <div
                  className={`flex items-start gap-2 rounded-2xl border p-3 text-sm font-black leading-7 ${
                    state.ok
                      ? "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]"
                      : "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"
                  }`}
                >
                  {state.ok ? <CheckCircle2 size={18} className="mt-1 shrink-0" /> : <AlertCircle size={18} className="mt-1 shrink-0" />}
                  {state.message}
                </div>
              ) : null}

              <form action={action} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="logId" value={logId} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_40px_rgba(17,24,39,0.18)] transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isPending ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                  {isPending ? "در حال ارسال مجدد..." : "تأیید و ارسال مجدد"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-5 py-3 text-sm font-black text-[#4a3514] transition hover:bg-[#f4dfaa]"
                >
                  بستن
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
