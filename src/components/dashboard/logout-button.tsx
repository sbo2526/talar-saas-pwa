"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/70 bg-[#fff8ea]/92 px-3 text-sm font-black text-[#111827] shadow-[0_14px_34px_rgba(17,24,39,0.06)] hover:border-[#c7a15a] hover:bg-[#fff0c7]/65"
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">خروج</span>
    </button>
  );
}
