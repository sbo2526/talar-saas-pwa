"use client";

import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { retryTelegramNotificationLogAction } from "@/lib/actions/notification-log-actions";
import { initialNotificationLogActionState } from "@/lib/actions/notification-log-state";

export function NotificationLogRetryForm({ logId }: { logId: string }) {
  const [state, action, isPending] = useActionState(
    retryTelegramNotificationLogAction,
    initialNotificationLogActionState,
  );

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="logId" value={logId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#8f2c2c]/25 bg-[#fff0ef] px-4 py-3 text-sm font-black text-[#8f2c2c] transition hover:bg-[#ffe4e1] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <RefreshCw size={17} className={isPending ? "animate-spin" : ""} />
        {isPending ? "در حال ارسال..." : "ارسال مجدد"}
      </button>
      {state.message ? (
        <p
          className={`flex items-start gap-2 rounded-2xl border p-3 text-xs font-black leading-6 ${
            state.ok
              ? "border-[#2f8f68]/25 bg-[#eefaf3] text-[#176246]"
              : "border-[#d85c5c]/30 bg-[#fff0ef] text-[#9b2c2c]"
          }`}
        >
          {state.ok ? <CheckCircle2 size={16} className="mt-1 shrink-0" /> : <AlertCircle size={16} className="mt-1 shrink-0" />}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
