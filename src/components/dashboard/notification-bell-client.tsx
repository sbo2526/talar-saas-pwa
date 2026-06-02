"use client";

import { Bell, CheckCheck, ExternalLink, Inbox, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  dismissInAppNotificationAction,
  markAllInAppNotificationsReadAction,
  markInAppNotificationReadAction,
} from "@/lib/actions/in-app-notification-actions";
import { toPersianDigits } from "@/lib/date/jalali";

export type HeaderNotificationView = {
  id: string;
  type: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  href: string | null;
  isRead: boolean;
  createdAtLabel: string;
  dueAtLabel: string | null;
};

type NotificationBellClientProps = {
  unreadCount: number;
  criticalCount: number;
  items: HeaderNotificationView[];
};

const severityLabels: Record<HeaderNotificationView["severity"], string> = {
  INFO: "اطلاع‌رسانی",
  SUCCESS: "انجام‌شده",
  WARNING: "نیازمند توجه",
  CRITICAL: "فوری",
};

function severityClass(severity: HeaderNotificationView["severity"]) {
  if (severity === "CRITICAL") {
    return "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]";
  }

  if (severity === "WARNING") {
    return "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]";
  }

  if (severity === "SUCCESS") {
    return "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]";
  }

  return "border-[#111827]/12 bg-[#111827]/6 text-[#172033]";
}

export function NotificationBellClient({
  unreadCount,
  criticalCount,
  items,
}: NotificationBellClientProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const hasUnread = unreadCount > 0;
  const badgeTone = criticalCount > 0 ? "bg-[#b45353]" : "bg-[#c4912f]";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea]/92 text-[#111827] shadow-[0_12px_30px_rgba(17,24,39,0.06)] transition hover:border-[#c7a15a] hover:bg-[#fff4dc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a] sm:size-11"
        aria-label="اعلان‌ها و یادآوری‌ها"
        aria-expanded={open}
      >
        <Bell size={18} />
        {hasUnread ? (
          <span
            className={`absolute -left-1 -top-1 flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none text-white ring-2 ring-[#fff9ee] ${badgeTone}`}
          >
            {toPersianDigits(unreadCount > 99 ? "۹۹+" : unreadCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute end-0 top-12 z-50 w-[min(calc(100vw-1rem),26rem)] overflow-hidden rounded-[1.6rem] border border-[#d8c08b]/72 bg-[#fff9ee] text-[#111827] shadow-[0_28px_90px_rgba(17,24,39,0.20)]">
          <div className="border-b border-[#d8c08b]/50 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_14rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-[#111827]">
                  اعلان‌ها و یادآوری‌ها
                </p>
                <p className="mt-1 text-xs font-bold text-[#7d6841]">
                  {hasUnread
                    ? `${toPersianDigits(unreadCount)} مورد خوانده‌نشده`
                    : "همه موارد مهم تحت کنترل است"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex size-9 items-center justify-center rounded-2xl border border-[#d8c08b]/70 bg-white/60 text-[#4a3514] transition hover:bg-[#fff7e6]"
                aria-label="بستن اعلان‌ها"
              >
                <X size={17} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <form action={markAllInAppNotificationsReadAction}>
                <button
                  type="submit"
                  disabled={!hasUnread}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#111827] bg-[#111827] px-3 py-2 text-xs font-black text-[#fff8ea] transition hover:bg-[#0f172a] disabled:cursor-not-allowed disabled:border-[#d8c08b] disabled:bg-[#f4ead5] disabled:text-[#7d6841] sm:w-auto"
                >
                  <CheckCheck size={15} />
                  علامت‌گذاری همه
                </button>
              </form>
              <Link
                href="/dashboard/settings/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-3 py-2 text-xs font-black text-[#4a3514] transition hover:bg-[#f4dfaa]"
              >
                تنظیمات اعلان‌ها
              </Link>
            </div>
          </div>

          <div className="max-h-[min(32rem,70vh)] overflow-y-auto p-3">
            {items.length ? (
              <div className="grid gap-2.5">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-[1.25rem] border p-3 shadow-[0_10px_30px_rgba(17,24,39,0.05)] ${
                      item.isRead
                        ? "border-[#d8c08b]/45 bg-white/50"
                        : "border-[#c7a15a]/48 bg-white/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${severityClass(item.severity)}`}
                          >
                            {severityLabels[item.severity]}
                          </span>
                          {!item.isRead ? (
                            <span className="size-2 rounded-full bg-[#b45353]" />
                          ) : null}
                        </div>
                        <h3 className="mt-2 text-sm font-black leading-6 text-[#111827]">
                          {item.title}
                        </h3>
                      </div>

                      <form action={dismissInAppNotificationAction}>
                        <input type="hidden" name="notificationId" value={item.id} />
                        <button
                          type="submit"
                          className="inline-flex size-8 items-center justify-center rounded-xl border border-[#d8c08b]/60 bg-[#fff7e6] text-[#7d6841] transition hover:bg-[#f4dfaa]"
                          aria-label="حذف یادآوری"
                        >
                          <X size={15} />
                        </button>
                      </form>
                    </div>

                    <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                      {item.message}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black text-[#7d6841]">
                      <span>{item.dueAtLabel ?? item.createdAtLabel}</span>
                      <div className="flex items-center gap-2">
                        {!item.isRead ? (
                          <form action={markInAppNotificationReadAction}>
                            <input type="hidden" name="notificationId" value={item.id} />
                            <button
                              type="submit"
                              className="rounded-xl px-2 py-1 text-[#17483f] transition hover:bg-[#25a46d]/10"
                            >
                              خواندم
                            </button>
                          </form>
                        ) : null}
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => {
                              setOpen(false);
                              if (!item.isRead) {
                                const data = new FormData();
                                data.set("notificationId", item.id);
                                startTransition(() => {
                                  void markInAppNotificationReadAction(data);
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[#111827] transition hover:bg-[#111827]/7"
                          >
                            مشاهده
                            <ExternalLink size={13} />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.35rem] border border-dashed border-[#d8c08b]/80 bg-white/55 p-6 text-center">
                <Inbox size={30} className="mx-auto text-[#9f7131]" />
                <p className="mt-3 text-sm font-black text-[#111827]">
                  فعلاً یادآوری فعالی وجود ندارد.
                </p>
                <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
                  همه موارد مهم تحت کنترل است.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
