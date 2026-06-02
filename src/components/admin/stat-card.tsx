import type { ReactNode } from "react";

function toneBorder(tone: "navy" | "emerald" | "amber" | "rose") {
  if (tone === "emerald") return "border-[#25a46d]/22 hover:border-[#25a46d]/42";
  if (tone === "amber") return "border-[#d8b76a]/46 hover:border-[#c7a15a]/70";
  if (tone === "rose") return "border-[#b45353]/16 hover:border-[#b45353]/34";
  return "border-[#d8c08b]/54 hover:border-[#c7a15a]/70";
}

function toneIcon(tone: "navy" | "emerald" | "amber" | "rose") {
  if (tone === "emerald") return "bg-[#25a46d]/10 text-[#17483f] ring-1 ring-[#25a46d]/22";
  if (tone === "amber") return "bg-[#fff7e6] text-[#7a4a12] ring-1 ring-[#d8b76a]/58";
  if (tone === "rose") return "bg-[#fff1f1] text-[#8f2c2c] ring-1 ring-[#b45353]/18";
  return "bg-[#fff7e6] text-[#17483f] ring-1 ring-[#d8c08b]/62";
}

export function AdminStatCard({
  title,
  value,
  description,
  icon,
  tone = "navy",
}: {
  title: string;
  value: string;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: "navy" | "emerald" | "amber" | "rose";
}) {
  return (
    <div
      className={`admin-stat-card group grid min-h-[6.25rem] grid-cols-[minmax(0,1fr)_2.35rem] items-center gap-3 rounded-[1.15rem] border bg-[#fff9ee]/92 p-3 text-right text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.045)] transition hover:-translate-y-0.5 ${toneBorder(tone)}`}
    >
      <div className="admin-stat-card__body min-w-0">
        <p className="truncate text-[11px] font-black leading-5 text-[#7d6841]">
          {title}
        </p>
        <p className="mt-1.5 truncate text-base font-black leading-tight text-[#111827] sm:text-lg">
          {value}
        </p>
        {description ? (
          <p className="mt-1 truncate text-[11px] font-black leading-5 text-[#17483f]">
            {description}
          </p>
        ) : null}
      </div>
      {icon ? (
        <span
          className={`admin-stat-card__icon flex size-9 shrink-0 items-center justify-center rounded-2xl ${toneIcon(tone)}`}
        >
          {icon}
        </span>
      ) : null}
    </div>
  );
}
