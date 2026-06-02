import type { ReactNode } from "react";

export function AdminPageHeader({ eyebrow, title, subtitle, action }: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[2.25rem] border border-[#e8c478]/35 bg-[radial-gradient(circle_at_top_left,rgba(232,196,120,0.28),transparent_32%),linear-gradient(145deg,rgba(23,32,51,0.98),rgba(9,14,23,0.98))] p-5 text-[#fff8ea] shadow-[0_26px_80px_rgba(15,23,42,0.20)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="inline-flex rounded-full border border-[#e8c478]/28 bg-[#e8c478]/10 px-3 py-1 text-xs font-black text-[#f0dba9]">{eyebrow}</p> : null}
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#d9caa9]">{subtitle}</p>
        </div>
        {action ? <div>{action}</div> : null}
      </div>
    </div>
  );
}
