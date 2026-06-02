import type { ReactNode } from "react";

const toneClasses = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  navy: "border-[#d8c08b]/45 bg-[#172033]/[0.06] text-[#172033]",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
} as const;

export type AdminChipTone = keyof typeof toneClasses;

export function StatusChip({ children, tone = "slate" }: { children: ReactNode; tone?: AdminChipTone }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
