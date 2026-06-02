"use client";

import { ChevronDown, LogOut, Settings, UserRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type DashboardUserMenuProps = {
  displayName: string;
  roleLabel: string;
  tenantName: string;
  planLabel: string | null;
};

export function DashboardUserMenu({
  displayName,
  roleLabel,
  tenantName,
  planLabel,
}: DashboardUserMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const subtitle = planLabel
    ? `${roleLabel} · پلن ${planLabel}`
    : `${roleLabel} · ${tenantName}`;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex max-w-64 items-center gap-3 rounded-2xl border border-[#d8c08b]/70 bg-[#111827] px-3.5 py-2 text-right text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:border-[#c7a15a]/85 hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
        aria-label="منوی حساب کاربری"
        aria-expanded={open}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/12 text-[#f0dba9]">
          <UserRound size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">{displayName}</span>
          <span className="mt-0.5 block truncate text-[11px] font-bold text-[#d9caa9]">
            {subtitle}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-[#f0dba9] transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div className="absolute end-0 top-[calc(100%+0.55rem)] z-50 w-72 overflow-hidden rounded-[1.5rem] border border-[#d8c08b]/76 bg-[#fff9ee] text-[#111827] shadow-[0_28px_90px_rgba(17,24,39,0.20)]">
          <div className="border-b border-[#d8c08b]/55 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_14rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4">
            <p className="truncate text-base font-black text-[#111827]">{displayName}</p>
            <p className="mt-1 truncate text-xs font-bold text-[#7d6841]">{tenantName}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-2.5 py-1 text-[11px] font-black text-[#17483f]">
                {roleLabel}
              </span>
              {planLabel ? (
                <span className="rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">
                  پلن {planLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-1 p-2">
            <Link
              href="/dashboard/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-[#111827] transition hover:bg-[#fff4dc]"
            >
              <UserRound size={17} className="text-[#9f7131]" />
              پروفایل و مدیریت حساب
            </Link>
            <Link
              href="/dashboard/account/plans"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-[#111827] transition hover:bg-[#fff4dc]"
            >
              <WalletCards size={17} className="text-[#9f7131]" />
              مدیریت اشتراک و پلن
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-black text-[#111827] transition hover:bg-[#fff4dc]"
            >
              <Settings size={17} className="text-[#9f7131]" />
              تنظیمات سامانه
            </Link>
          </div>

          <div className="border-t border-[#d8c08b]/55 p-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-3 py-2.5 text-sm font-black text-[#8f2c2c] transition hover:border-[#b45353]/34 hover:bg-[#ffe4e4]"
            >
              <LogOut size={16} />
              خروج از حساب
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
