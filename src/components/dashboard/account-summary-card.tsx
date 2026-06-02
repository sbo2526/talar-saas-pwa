import type { LucideIcon } from "lucide-react";

export type AccountSummaryItem = {
  label: string;
  value: string;
  helper?: string;
  icon: LucideIcon;
};

type AccountSummaryCardProps = {
  title: string;
  eyebrow?: string;
  items: AccountSummaryItem[];
  dark?: boolean;
};

export function AccountSummaryCard({
  title,
  eyebrow,
  items,
  dark = false,
}: AccountSummaryCardProps) {
  return (
    <section
      className={
        dark
          ? "rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6"
          : "rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6"
      }
    >
      {eyebrow ? (
        <p
          className={
            dark
              ? "text-xs font-black text-[#f0dba9]"
              : "text-xs font-black text-[#17483f]"
          }
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={`${item.label}-${item.value}`}
              className={
                dark
                  ? "rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3.5"
                  : "rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 p-3.5"
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    dark
                      ? "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#e8c478]/10 text-[#f0dba9]"
                      : "flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"
                  }
                >
                  <Icon size={17} />
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      dark
                        ? "text-xs font-black text-[#d9caa9]"
                        : "text-xs font-black text-[#7d6841]"
                    }
                  >
                    {item.label}
                  </p>
                  <p className="mt-1 break-words text-sm font-black leading-6">
                    {item.value}
                  </p>
                  {item.helper ? (
                    <p
                      className={
                        dark
                          ? "mt-1 text-xs font-bold leading-6 text-[#cfc0a0]"
                          : "mt-1 text-xs font-bold leading-6 text-[#6d5f49]"
                      }
                    >
                      {item.helper}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
