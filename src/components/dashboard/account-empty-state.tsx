import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type AccountEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  text: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function AccountEmptyState({
  icon: Icon,
  title,
  text,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: AccountEmptyStateProps) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[#c7a15a]/48 bg-[#fff8ea]/76 p-4 text-[#111827] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
          <Icon size={19} />
        </span>
        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
            {text}
          </p>
        </div>
      </div>

      {primaryHref || secondaryHref ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {primaryHref && primaryLabel ? (
            <Link href={primaryHref} className="btn-luxury-dark px-4 py-2.5 text-sm">
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="btn-luxury-secondary px-4 py-2.5 text-sm !text-[#111827]"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
