import { Clock3, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatJalaliAuditDateTime } from "@/lib/date/jalali";

type EntityAuditTimelineItem = {
  id: string;
  title: string;
  message: string;
  actionLabel: string;
  actorName: string;
  createdAt: Date;
  href: string | null;
};

type EntityAuditTimelineProps = {
  title: string;
  items: EntityAuditTimelineItem[];
  allHref: string;
};

export function EntityAuditTimeline({ title, items, allHref }: EntityAuditTimelineProps) {
  return (
    <section className="rounded-[2rem] border border-[#e8c478]/40 bg-[linear-gradient(145deg,rgba(255,248,234,0.94),rgba(255,255,255,0.78))] p-5 shadow-[0_18px_60px_rgba(23,32,51,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#9f7131]">ردیابی عملیات</p>
          <h2 className="mt-1 text-xl font-black text-[#172033]">{title}</h2>
        </div>
        <Link href={allHref} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-[#fff8ea] px-4 py-2 text-xs font-black text-[#7d5d23] transition hover:bg-white">
          مشاهده همه فعالیت‌ها
          <ExternalLink size={15} />
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="relative rounded-[1.5rem] border border-[#d8c08b]/45 bg-white/72 p-4 pr-12">
              <span className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[#172033] text-[#f0dba9] shadow-[0_10px_25px_rgba(23,32,51,0.18)]">
                <Clock3 size={15} />
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-[#172033]">{item.title}</h3>
                <span className="rounded-full border border-[#d8c08b]/55 bg-[#fff8ea] px-2.5 py-1 text-[11px] font-black text-[#7d5d23]">{item.actionLabel}</span>
              </div>
              <p className="mt-2 text-sm font-bold leading-7 text-[#4f4638]">{item.message}</p>
              <p className="mt-2 text-xs font-black text-[#7d6841]">
                در {formatJalaliAuditDateTime(item.createdAt)} توسط {item.actorName}
              </p>
            </article>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[#d8c08b]/65 bg-[#fff8ea]/70 p-5 text-sm font-bold leading-7 text-[#7d6841]">
            هنوز فعالیتی برای این رکورد ثبت نشده است.
          </div>
        )}
      </div>
    </section>
  );
}
