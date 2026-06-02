import Link from "next/link";
import { CalendarClock, Crown, Hourglass, WalletCards } from "lucide-react";
import { AccountEmptyState } from "@/components/dashboard/account-empty-state";
import { AccountSummaryCard } from "@/components/dashboard/account-summary-card";

type AccountSubscriptionCardProps = {
  hasSubscription: boolean;
  planLabel: string;
  statusLabel: string;
  startDate: string;
  endDate: string;
  totalDuration: string;
  remainingDuration: string;
  workspaceName: string;
};

export function AccountSubscriptionCard({
  hasSubscription,
  planLabel,
  statusLabel,
  startDate,
  endDate,
  totalDuration,
  remainingDuration,
  workspaceName,
}: AccountSubscriptionCardProps) {
  if (!hasSubscription) {
    return (
      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <p className="text-xs font-black text-[#17483f]">وضعیت اشتراک</p>
        <h2 className="mt-1 text-xl font-black sm:text-2xl">
          هنوز اشتراکی فعال نیست
        </h2>
        <div className="mt-4">
          <AccountEmptyState
            icon={Crown}
            title="برای شروع بهره‌برداری واقعی، اشتراک فعال کنید"
            text="پس از خرید، فضای اختصاصی تالار شما با دسترسی عملیاتی فعال می‌شود."
            primaryHref="/purchase"
            primaryLabel="مشاهده پلن خرید"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <AccountSummaryCard
        title="وضعیت اشتراک"
        eyebrow="پلن و مدت اشتراک"
        dark
        items={[
          {
            label: "نوع پلن",
            value: planLabel,
            helper: workspaceName,
            icon: Crown,
          },
          {
            label: "وضعیت اشتراک",
            value: statusLabel,
            icon: WalletCards,
          },
          {
            label: "تاریخ شروع",
            value: startDate,
            icon: CalendarClock,
          },
          {
            label: "تاریخ پایان",
            value: endDate,
            helper: remainingDuration,
            icon: Hourglass,
          },
        ]}
      />
      <div className="rounded-[1.5rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-sm font-bold leading-7 text-[#6d5f49] shadow-[0_14px_44px_rgba(17,24,39,0.06)]">
        مدت کل اشتراک: <span className="font-black text-[#111827]">{totalDuration}</span>
        <Link href="/dashboard/account/plans" className="mr-3 font-black text-[#9f7131]">
          مشاهده پلن‌ها
        </Link>
      </div>
    </section>
  );
}
