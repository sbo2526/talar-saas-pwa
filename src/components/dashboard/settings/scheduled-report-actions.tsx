"use client";

import { AlertCircle, Send } from "lucide-react";
import { useActionState } from "react";
import {
  sendDailyReportNowAction,
  sendMonthlyReportNowAction,
  sendOutstandingBalanceReminderNowAction,
  sendTomorrowReminderNowAction,
  sendWeeklyReportNowAction,
} from "@/lib/actions/scheduled-notification-actions";
import { initialScheduledNotificationActionState } from "@/lib/actions/scheduled-notification-state";

const actions = {
  daily: sendDailyReportNowAction,
  weekly: sendWeeklyReportNowAction,
  monthly: sendMonthlyReportNowAction,
  tomorrow: sendTomorrowReminderNowAction,
  outstanding: sendOutstandingBalanceReminderNowAction,
} as const;

type Props = {
  type: keyof typeof actions;
  label: string;
};

export function ScheduledReportActionButton({ type, label }: Props) {
  const [state, formAction, pending] = useActionState(actions[type], initialScheduledNotificationActionState);

  return (
    <form action={formAction} className="grid gap-2">
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#17483f] bg-[#17483f] px-4 py-2 text-xs font-black text-[#fff8ea] shadow-[0_14px_34px_rgba(23,72,63,0.14)] transition hover:-translate-y-0.5 hover:bg-[#0f3a33] disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Send size={16} />
        {pending ? "در حال ارسال..." : label}
      </button>
      {state.message ? (
        <p className={`flex items-start gap-1.5 text-xs font-black leading-6 ${state.ok ? "text-[#176246]" : "text-[#9b2c2c]"}`}>
          <AlertCircle size={14} className="mt-1 shrink-0" />
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
