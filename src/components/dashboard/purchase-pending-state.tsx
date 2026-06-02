import { Clock3, Crown, Headset, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getPlanLabel } from "@/lib/subscriptions/display";
import { isPurchaseRequestReference } from "@/lib/subscriptions/plans";

type PurchasePendingStateProps = {
  tenantName?: string | null;
  purchaseReference?: string | null;
};

function getRequestedPlanLabel(purchaseReference?: string | null) {
  if (!isPurchaseRequestReference(purchaseReference)) return "ثبت نشده";
  const parts = purchaseReference.split(":").filter(Boolean);
  const plan = parts.at(-1);
  return getPlanLabel(plan);
}

export function PurchasePendingState({ tenantName, purchaseReference }: PurchasePendingStateProps) {
  const isPurchaseRequest = isPurchaseRequestReference(purchaseReference);
  const requestedPlanLabel = getRequestedPlanLabel(purchaseReference);

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-9">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Crown size={15} /> درخواست خرید در حال پیگیری
            </p>
            <h1 className="mt-4 max-w-3xl text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              درخواست پلن {requestedPlanLabel} ثبت شد و منتظر تأیید پشتیبانی است
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              شما دوره بررسی را فعال نکرده‌اید و یک درخواست خرید برای پلن {requestedPlanLabel} ثبت شده است. تا زمانی که پشتیبانی/مالک پلتفرم این درخواست را تأیید کند، بخش‌های عملیاتی تالار در حالت آماده‌سازی می‌ماند و وضعیت از همین داشبورد قابل پیگیری است.
            </p>
            <div className="mt-5 grid gap-2.5 sm:mt-7 sm:flex sm:flex-wrap">
              <Link href="/dashboard/support" className="btn-luxury-dark w-full px-5 py-3 sm:w-auto sm:px-6">
                <Headset size={18} /> مشاهده تیکت خرید
              </Link>
              <Link href="/dashboard/account/plans" className="btn-luxury-secondary w-full px-5 py-3 !text-[#111827] sm:w-auto sm:px-6">
                تغییر یا ثبت پلن دیگر
              </Link>
              <Link href="/dashboard/account" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/72 bg-[#fff8ea]/72 px-5 py-3 text-sm font-black text-[#6d5f49] hover:border-[#c7a15a] sm:w-auto">
                حساب کاربری
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-[#f0dba9] sm:text-sm">وضعیت فعال‌سازی</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">منتظر تأیید پشتیبانی</h2>
              </div>
              <span className="rounded-2xl border border-[#c7a15a]/35 bg-[#c7a15a]/10 px-3 py-2 text-xs font-black text-[#f0dba9]">
                {isPurchaseRequest ? "تیکت خرید" : "تعلیق‌شده"}
              </span>
            </div>
            <div className="gold-divider my-4 sm:my-5" />
            <div className="grid gap-3">
              <Info icon={ShieldCheck} label="فضای کاری" value={tenantName ?? "درخواست خرید"} />
              <Info icon={Crown} label="پلن درخواستی" value={requestedPlanLabel} />
              <Info icon={Clock3} label="مرحله بعد" value="تأیید پشتیبانی و فعال‌سازی اشتراک" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Info({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.10] bg-white/[0.055] p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#e8c478]/10 text-[#f0dba9]">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-xs font-black text-[#d9caa9]">{label}</p>
          <p className="mt-1 text-sm font-black leading-6 text-[#fff9ed]">{value}</p>
        </div>
      </div>
    </div>
  );
}
