import { BadgeCheck, Building2, CheckCircle2, CircleDashed } from "lucide-react";
import { formatPersianNumber } from "@/lib/formatters";

type CompletionItem = {
  label: string;
  complete: boolean;
};

type HallInfoSummaryCardProps = {
  tenantName: string;
  completionPercent: number;
  items: CompletionItem[];
  updatedAt: string;
};

export function HallInfoSummaryCard({
  tenantName,
  completionPercent,
  items,
  updatedAt,
}: HallInfoSummaryCardProps) {
  return (
    <section className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9]">
          <Building2 size={21} />
        </span>
        <div>
          <p className="text-xs font-black text-[#f0dba9]">پروفایل تالار</p>
          <h2 className="mt-1 text-xl font-black sm:text-2xl">{tenantName}</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
            آخرین به‌روزرسانی: {updatedAt}
          </p>
        </div>
      </div>

      <div className="gold-divider my-5" />

      <div className="rounded-3xl border border-[#e8c478]/20 bg-[#e8c478]/[0.08] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-[#f0dba9]">میزان تکمیل</p>
          <p className="text-2xl font-black text-[#fff9ed]">
            {formatPersianNumber(completionPercent)}٪
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#25a46d,#e8c478)]"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3"
          >
            {item.complete ? (
              <CheckCircle2 className="shrink-0 text-[#a9f2cf]" size={18} />
            ) : (
              <CircleDashed className="shrink-0 text-[#d9caa9]" size={18} />
            )}
            <span className="text-sm font-black">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#e8c478]/20 bg-[#e8c478]/10 p-3 text-sm font-bold leading-7 text-[#d9caa9]">
        <BadgeCheck className="mt-1 shrink-0 text-[#f0dba9]" size={17} />
        <span>
          اطلاعات حساس مانند کد ملی مدیر و تصویر مجوز در صفحات عمومی نمایش
          داده نمی‌شود.
        </span>
      </div>
    </section>
  );
}
