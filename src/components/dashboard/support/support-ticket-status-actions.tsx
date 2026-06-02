"use client";

import { RotateCcw, XCircle } from "lucide-react";
import { closeSupportTicketAction, reopenSupportTicketAction } from "@/lib/actions/support-actions";

export function SupportTicketStatusActions({
  ticketId,
  isClosed,
}: {
  ticketId: string;
  isClosed: boolean;
}) {
  if (isClosed) {
    return (
      <form action={reopenSupportTicketAction}>
        <input type="hidden" name="ticketId" value={ticketId} />
        <button className="btn-luxury-primary justify-center px-5 py-3" type="submit">
          <RotateCcw size={17} />
          بازگشایی تیکت
        </button>
      </form>
    );
  }

  return (
    <form
      action={closeSupportTicketAction}
      onSubmit={(event) => {
        if (!window.confirm("آیا از بستن این تیکت مطمئن هستید؟ ارسال پاسخ تا زمان بازگشایی غیرفعال می‌شود.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <button
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#b45353]/35 bg-[#fff1f1] px-5 py-3 text-sm font-black text-[#8f2c2c] transition hover:bg-[#ffe4e4]"
        type="submit"
      >
        <XCircle size={17} />
        بستن تیکت
      </button>
    </form>
  );
}
