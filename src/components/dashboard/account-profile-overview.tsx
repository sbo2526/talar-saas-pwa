import { CalendarDays, Gem, ShieldCheck } from "lucide-react";

type AccountProfileOverviewProps = {
  name: string;
  email: string;
  statusLabel: string;
  roleLabel: string;
  subscriptionLabel: string;
  demoLabel: string;
  today: string;
};

export function AccountProfileOverview({
  name,
  email,
  statusLabel,
  roleLabel,
  subscriptionLabel,
  demoLabel,
  today,
}: AccountProfileOverviewProps) {
  const initials = getInitials(name || email);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
            <Gem size={15} />
            مرکز مدیریت حساب
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
            مدیریت حساب کاربری
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
            اطلاعات شخصی، وضعیت حساب، دوره بررسی، اشتراک و دسترسی‌های خود را از این
            بخش مدیریت کنید.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs font-black text-[#7d6841]">
            <CalendarDays size={16} className="text-[#9f7131]" />
            <span>امروز: {today}</span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:min-w-96 sm:p-5">
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-[1.35rem] border border-[#e8c478]/35 bg-[#e8c478]/10 text-2xl font-black text-[#f0dba9]">
              {initials}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black text-[#fff9ed]">
                {name || "کاربر تالار منیجر"}
              </h2>
              <p className="mt-1 truncate text-sm font-bold text-[#d9caa9]">
                {email}
              </p>
            </div>
          </div>

          <div className="gold-divider my-4" />

          <div className="grid grid-cols-2 gap-2.5">
            <StatusBadge label="وضعیت حساب" value={statusLabel} />
            <StatusBadge label="نقش کاربری" value={roleLabel} />
            <StatusBadge label="وضعیت اشتراک" value={subscriptionLabel} />
            <StatusBadge label="وضعیت دوره بررسی" value={demoLabel} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck size={14} className="text-[#a9f2cf]" />
        <p className="text-[11px] font-black text-[#cfc0a0]">{label}</p>
      </div>
      <p className="mt-1 truncate text-sm font-black text-[#fff9ed]">{value}</p>
    </div>
  );
}

function getInitials(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return "ت‌م";
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${Array.from(parts[0] ?? "ت")[0] ?? "ت"}${
      Array.from(parts[1] ?? "م")[0] ?? "م"
    }`;
  }

  return Array.from(normalized).slice(0, 2).join("");
}
