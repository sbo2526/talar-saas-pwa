"use client";

import { Gem, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";

export function MobileMenu({
  currentRole,
  currentStatus,
  permissionsOverride,
}: {
  currentRole?: string | null;
  currentStatus?: string | null;
  permissionsOverride?: unknown;
}) {
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/70 bg-[#fff9ee] text-[#111827] shadow-[0_12px_30px_rgba(17,24,39,0.08)] sm:size-11 lg:hidden"
        aria-label="باز کردن منو"
      >
        <Menu size={20} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] h-dvh w-screen overflow-hidden lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="منوی موبایل داشبورد"
        >
          <button
            type="button"
            className="fixed inset-0 h-dvh w-screen bg-[#050810]/78 backdrop-blur-[5px]"
            aria-label="بستن منو"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-[91] flex h-dvh w-[min(20.5rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-l-[1.75rem] border-l border-[#e8c478]/30 bg-[radial-gradient(circle_at_22%_0%,rgba(232,196,120,0.22),transparent_17rem),linear-gradient(145deg,rgba(18,28,42,0.99),rgba(7,11,18,0.995))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.85rem+env(safe-area-inset-top))] text-[#fff8ea] shadow-[-26px_0_90px_rgba(0,0,0,0.48)] sm:w-[22rem] sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/35 bg-[#e8c478]/10 text-[#f0dba9]">
                  <Gem size={21} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xl font-black text-[#fff4d5]">
                    تالار منیجر
                  </span>
                  <span className="block truncate text-xs font-bold text-[#d9caa9]">
                    داشبورد مدیریتی
                  </span>
                </span>
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/26 bg-white/[0.075] text-[#f0dba9] shadow-[0_12px_34px_rgba(0,0,0,0.18)] transition hover:border-[#e8c478]/45 hover:bg-white/[0.11] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8c478]"
                onClick={() => setOpen(false)}
                aria-label="بستن منو"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-[#e8c478]/16 bg-white/[0.055] p-3">
              <p className="text-xs font-black text-[#f0dba9]">دسترسی سریع</p>
              <p className="mt-1 text-sm font-bold leading-6 text-[#d9caa9]">
                ماژول‌های پایه و مدیریتی تالار از این منو در دسترس هستند.
              </p>
            </div>

            <div className="gold-divider my-4" />

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [&_.dashboard-nav_a]:min-h-11 [&_.dashboard-nav_summary]:min-h-11">
              <DashboardNavigation currentRole={currentRole} currentStatus={currentStatus} permissionsOverride={permissionsOverride} onNavigate={() => setOpen(false)} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
