import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";

type ContextualHelpCardProps = {
  articleSlug: string;
  title?: string;
  description: string;
  className?: string;
};

export function ContextualHelpCard({
  articleSlug,
  title = "راهنمای این صفحه",
  description,
  className = "",
}: ContextualHelpCardProps) {
  return (
    <aside
      className={`rounded-[1.35rem] border border-[#d8c08b]/58 bg-[#fff9ee]/82 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-[#c7a15a]/30 bg-[#fff4d8] text-[#9f7131]">
            <BookOpen size={18} />
          </span>
          <div>
            <h2 className="text-sm font-black text-[#172033]">{title}</h2>
            <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
              {description}
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/help/${articleSlug}`}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/70 bg-white/75 px-4 py-2 text-xs font-black text-[#172033] transition hover:border-[#c7a15a]/70 hover:bg-[#fff4d8]"
        >
          مشاهده آموزش
          <ArrowLeft size={15} />
        </Link>
      </div>
    </aside>
  );
}
