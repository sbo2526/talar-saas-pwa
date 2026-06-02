"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Paperclip, Send } from "lucide-react";
import { createSupportTicketAction } from "@/lib/actions/support-ticket-actions";
import { initialSupportTicketActionState } from "@/lib/actions/support-ticket-state";
import {
  supportTicketCategoryLabels,
  supportTicketCategoryValues,
  supportTicketPriorityLabels,
  supportTicketPriorityValues,
} from "@/lib/support/tickets";

export function SupportTicketForm() {
  const [state, formAction, isPending] = useActionState(createSupportTicketAction, initialSupportTicketActionState);

  return (
    <form action={formAction} encType="multipart/form-data" className="grid gap-5">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <section className="rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-black text-[#172033] md:col-span-2">
            <span>عنوان تیکت</span>
            <input name="title" className="input-luxury min-h-12 py-2 text-sm" placeholder="مثلاً مشکل در چاپ قرارداد" required />
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>موضوع</span>
            <select name="category" className="input-luxury min-h-12 py-2 text-sm" defaultValue="TECHNICAL" required>
              {supportTicketCategoryValues.map((category) => <option key={category} value={category}>{supportTicketCategoryLabels[category]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033]">
            <span>اولویت</span>
            <select name="priority" className="input-luxury min-h-12 py-2 text-sm" defaultValue="NORMAL" required>
              {supportTicketPriorityValues.map((priority) => <option key={priority} value={priority}>{supportTicketPriorityLabels[priority]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black text-[#172033] md:col-span-2">
            <span>شرح درخواست</span>
            <textarea name="body" className="input-luxury min-h-44 resize-y py-3 text-sm leading-7" placeholder="لطفاً مشکل، مسیر صفحه، زمان رخداد و نتیجه مورد انتظار را دقیق بنویسید." required />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-3xl border border-dashed border-[#c7a15a]/55 bg-white/55 px-4 py-4 text-sm font-black text-[#7d6841] md:col-span-2">
            <span className="flex items-center gap-2"><Paperclip size={18} /> پیوست اختیاری</span>
            <span className="text-xs text-[#9f7131]">JPG، PNG، WebP، PDF، DOC، DOCX، XLSX تا ۱۰ مگابایت</span>
            <input name="attachment" type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
          </label>
        </div>
      </section>
      <div className="sticky bottom-3 z-10 grid gap-3 rounded-[1.4rem] border border-[#c7a15a]/30 bg-[linear-gradient(135deg,rgba(23,31,43,0.98),rgba(12,20,31,0.98))] p-3 text-[#fff8ea] shadow-[0_18px_70px_rgba(17,24,39,0.22)] sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <p className="text-xs font-bold leading-6 text-[#f0dba9]/80">پس از ثبت، مکاتبات این درخواست در همان تیکت نگهداری می‌شود.</p>
        <Link href="/dashboard/support" className="btn-luxury-secondary justify-center border-white/10 bg-white/8 px-5 py-3 text-[#fff8ea] hover:bg-white/12">انصراف</Link>
        <button type="submit" disabled={isPending} className="btn-luxury-primary justify-center px-5 py-3 disabled:opacity-60">
          <Send size={17} />
          {isPending ? "در حال ثبت..." : "ثبت تیکت"}
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
