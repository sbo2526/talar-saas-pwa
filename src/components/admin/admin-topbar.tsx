import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { User } from "@prisma/client";

export function AdminTopbar({ user }: { user: Pick<User, "name" | "email"> }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d8c08b]/38 bg-[#fbf6ea]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#172033] text-[#f0dba9] shadow-[0_14px_34px_rgba(23,32,51,0.14)]">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-[#172033]">پنل مالک پلتفرم</p>
            <p className="text-xs font-bold text-[#7b6a4b]">
              {user.name || user.email}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-2xl border border-[#d8b76a]/70 bg-[#fff7e6] px-4 py-2 text-xs font-black text-[#4a3514] transition hover:border-[#c7a15a] hover:bg-[#fff0c7]"
        >
          <ArrowRight size={16} />
          بازگشت به داشبورد تالار
        </Link>
      </div>
    </header>
  );
}
