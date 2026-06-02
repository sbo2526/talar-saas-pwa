"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { AlertCircle, Paperclip, Send } from "lucide-react";
import { replySupportTicketAction } from "@/lib/actions/support-ticket-actions";
import { initialSupportTicketActionState } from "@/lib/actions/support-ticket-state";

export function SupportReplyForm({ ticketId, disabled }: { ticketId: string; disabled?: boolean }) {
  const [state, formAction, isPending] = useActionState(replySupportTicketAction, initialSupportTicketActionState);

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-3 rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 shadow-[0_16px_48px_rgba(17,24,39,0.07)]">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-[#172033]">ارسال پاسخ</p>
          <p className="mt-1 text-xs font-bold text-[#7d6841]">پاسخ شما به انتهای مکالمه اضافه می‌شود.</p>
        </div>
        {disabled ? <span className="rounded-full border border-[#c7a15a]/35 bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#7d6841]">تیکت بسته است</span> : null}
      </div>
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <label className="grid gap-1.5 text-xs font-black text-[#172033]">
        <span>متن پاسخ</span>
        <textarea name="body" className="input-luxury min-h-28 resize-y rounded-[1.4rem] py-3 text-sm leading-7" placeholder="پاسخ خود را مثل یک گفت‌وگوی واضح بنویسید؛ نه مثل نامه اداری قرن گذشته." disabled={disabled} required />
      </label>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[#c7a15a]/50 bg-white/65 px-4 py-3 text-xs font-black text-[#7d6841] transition hover:border-[#9f7131]/60 hover:bg-white/85">
          <Paperclip size={16} /> پیوست اختیاری
          <input name="attachment" type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={disabled} />
        </label>
        <button type="submit" disabled={disabled || isPending} className="btn-luxury-primary min-h-12 justify-center px-5 py-3 disabled:opacity-60">
          <Send size={17} />
          {isPending ? "در حال ارسال..." : "ارسال پاسخ"}
        </button>
      </div>
    </form>
  );
}

function Alert({ children, tone }: { children: ReactNode; tone: "success" | "error" }) {
  return (
    <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${tone === "success" ? "border-[#25a46d]/22 bg-[#25a46d]/10 text-[#17483f]" : "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      <AlertCircle className="mt-1 shrink-0" size={17} />
      <span>{children}</span>
    </div>
  );
}
