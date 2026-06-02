import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type SettingsPageShellProps = {
  title: string;
  subtitle: string;
  badge: string;
  tenantName?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  showMeta?: boolean;
};

export function SettingsPageShell({
  title,
  subtitle,
  badge,
  tenantName,
  children,
  actions,
  showMeta = true,
}: SettingsPageShellProps) {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="overflow-hidden rounded-[1.5rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.09)] sm:rounded-[1.9rem] sm:p-5 lg:p-6">
        <div className={actions ? "grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center" : "grid gap-4"}>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <CheckCircle2 size={15} />
              {badge}
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              {subtitle}
            </p>
            {showMeta && tenantName ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-[#7d6841]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#c7a15a]" />
                <span className="truncate">{tenantName}</span>
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-col gap-2 sm:min-w-64 sm:flex-row lg:flex-col">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function BackToSettingsLink() {
  return (
    <Link
      href="/dashboard/settings"
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-2.5 text-sm font-black text-[#4a3514] shadow-sm transition hover:bg-[#f4dfaa] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
    >
      <ArrowRight size={17} />
      بازگشت به تنظیمات
    </Link>
  );
}

export function SettingsPrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_18px_44px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
    >
      {children}
    </Link>
  );
}

export function SettingsSecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-4 py-3 text-sm font-black text-[#4a3514] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f4dfaa] hover:text-[#111827] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
    >
      {children}
    </Link>
  );
}

export function SettingsCard({
  title,
  description,
  href,
  cta,
  status,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  status: string;
  icon: LucideIcon;
}) {
  return (
    <article className="flex h-full flex-col items-center text-center rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/70 hover:shadow-[0_24px_72px_rgba(17,24,39,0.10)] sm:p-5">
      <div className="flex w-full flex-col items-center justify-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
          <Icon size={22} />
        </span>
        <span className="rounded-full border border-[#25a46d]/22 bg-[#25a46d]/9 px-3 py-1 text-[11px] font-black text-[#17483f]">
          {status}
        </span>
      </div>
      <h2 className="mt-4 text-center text-xl font-black leading-8">{title}</h2>
      <p className="mt-2 min-h-16 text-center text-sm font-bold leading-7 text-[#6d5f49]">
        {description}
      </p>
      <div className="mt-auto pt-5">
        <Link
          href={href}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-[#111827] bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.16)] transition hover:border-[#c7a15a] hover:bg-[#0f172a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c7a15a]"
        >
          {cta}
        </Link>
      </div>
    </article>
  );
}

export function OverviewCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-center shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 text-[#17483f]">
          <Icon size={20} />
        </span>
        <div>
          <h3 className="text-base font-black text-[#111827]">{title}</h3>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

export function LuxuryPanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
      {eyebrow ? <p className="text-xs font-black text-[#17483f]">{eyebrow}</p> : null}
      <h2 className="mt-1 text-xl font-black sm:text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
