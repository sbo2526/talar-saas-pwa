import { CalendarClock, CheckCircle2, Hourglass, Sparkles } from "lucide-react";
import { AccountEmptyState } from "@/components/dashboard/account-empty-state";
import { AccountSummaryCard } from "@/components/dashboard/account-summary-card";

type AccountDemoCardProps = {
  hasDemoRecord: boolean;
  statusLabel: string;
  startedAt: string;
  endsAt: string;
  usageDuration: string;
  consumedLabel: string;
};

export function AccountDemoCard({
  hasDemoRecord,
  statusLabel,
  startedAt,
  endsAt,
  usageDuration,
  consumedLabel,
}: AccountDemoCardProps) {
  if (!hasDemoRecord) {
    return (
      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <p className="text-xs font-black text-[#17483f]">وضعیت دوره بررسی</p>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">
          دوره بررسی یک‌باره هنوز فعال نشده است
        </h2>
        <div className="mt-4">
          <AccountEmptyState
            icon={Sparkles}
            title="امکان فعال‌سازی دوره بررسی برای این حساب باقی است"
            text="با فعال‌سازی دوره بررسی، یک فضای بررسی برای آشنایی با مدیریت قرارداد، رزرو و امور مالی ساخته می‌شود."
            primaryHref="/demo"
            primaryLabel="شروع دوره بررسی یک‌باره"
            secondaryHref="/purchase"
            secondaryLabel="مشاهده پلن خرید"
          />
        </div>
      </section>
    );
  }

  return (
    <AccountSummaryCard
      title="وضعیت دوره بررسی"
      eyebrow="دوره بررسی یک‌باره حساب"
      items={[
        {
          label: "وضعیت فعال‌سازی",
          value: statusLabel,
          helper: consumedLabel,
          icon: CheckCircle2,
        },
        {
          label: "تاریخ شروع",
          value: startedAt,
          icon: CalendarClock,
        },
        {
          label: "تاریخ پایان",
          value: endsAt,
          icon: Hourglass,
        },
        {
          label: "مدت استفاده از دوره بررسی",
          value: usageDuration,
          helper: "برای ادامه استفاده واقعی، اشتراک فعال شود",
          icon: Sparkles,
        },
      ]}
    />
  );
}
