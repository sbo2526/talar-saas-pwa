import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Crown,
  Headset,
  MessageSquareText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { createPlanPurchaseTicketAction } from "@/lib/actions/plan-purchase-actions";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import {
  getPlanLabel,
  getSubscriptionStatusLabel,
  isPurchasedSubscription,
  resolveWorkspaceDisplayName,
} from "@/lib/subscriptions/display";
import {
  isPurchasablePlanDowngrade,
  isPurchasablePlanUpgrade,
  isSamePurchasablePlan,
  planCatalog,
} from "@/lib/subscriptions/plans";

type AccountPlansPageProps = {
  searchParams?: Promise<{ purchaseError?: string }>;
};

type SubscriptionPeriodInput = {
  currentPeriodStart?: Date | string | number | null;
  currentPeriodEnd?: Date | string | number | null;
};

function normalizeDate(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = value instanceof Date ? value : new Date(value);
  return Number.isNaN(normalized.getTime()) ? null : normalized;
}

function getSubscriptionPeriodSummary(
  subscription: SubscriptionPeriodInput | null | undefined,
  now = new Date(),
) {
  const start = normalizeDate(subscription?.currentPeriodStart);
  const end = normalizeDate(subscription?.currentPeriodEnd);
  const dayMs = 1000 * 60 * 60 * 24;
  const totalDays =
    start && end
      ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / dayMs))
      : null;
  const elapsedDays = start
    ? Math.max(0, Math.floor((now.getTime() - start.getTime()) / dayMs))
    : null;
  const remainingDays = end
    ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / dayMs))
    : null;

  return { start, end, totalDays, elapsedDays, remainingDays };
}

function formatDayCount(value: number | null) {
  return value === null ? "ثبت نشده" : `${toPersianDigits(value)} روز`;
}

function getPurchaseErrorMessage(error?: string) {
  if (error === "downgrade") {
    return "شما در حال حاضر پلن بالاتری دارید و امکان خرید پلن پایین‌تر در زمان فعال بودن اشتراک وجود ندارد.";
  }

  if (error === "current-plan") {
    return "این پلن هم‌اکنون برای شما فعال است. برای تمدید یا مدیریت اشتراک، از مسیر مدیریت حساب اقدام کنید.";
  }

  if (error === "invalid-plan") {
    return "پلن انتخاب‌شده معتبر نیست. لطفاً یکی از پلن‌های همین صفحه را انتخاب کنید.";
  }

  return null;
}

function getPlanButtonLabel(input: {
  planTitle: string;
  purchased: boolean;
  isCurrentPlan: boolean;
  isDowngrade: boolean;
  isUpgrade: boolean;
}) {
  if (input.isCurrentPlan) return "پلن فعال شما";
  if (input.isDowngrade) return "پایین‌تر از پلن فعلی";
  if (input.isUpgrade) return `ارتقا به ${input.planTitle}`;
  if (input.purchased) return `درخواست تغییر به ${input.planTitle}`;
  return `انتخاب ${input.planTitle} و ثبت تیکت خرید`;
}

export default async function AccountPlansPage({
  searchParams,
}: AccountPlansPageProps) {
  const query = (await searchParams) ?? {};
  const purchaseErrorMessage = getPurchaseErrorMessage(query.purchaseError);
  const user = await requireUser();
  const membership = await getCurrentTenantMember(user.id);
  const subscription = membership?.tenant.subscription;
  const currentPlan = subscription?.plan ?? "DEMO";
  const currentPlanLabel = getPlanLabel(currentPlan);
  const currentStatusLabel = getSubscriptionStatusLabel(subscription?.status);
  const purchased = isPurchasedSubscription(subscription);
  const hasSelectedPaidPlan = Boolean(currentPlan && currentPlan !== "DEMO");
  const subscriptionStateLabel = purchased
    ? "فعال"
    : hasSelectedPaidPlan
      ? currentStatusLabel
      : "نیازمند انتخاب و فعال‌سازی";
  const pageTitle = purchased
    ? `اشتراک ${currentPlanLabel} شما فعال است`
    : "پلن مورد نظر را انتخاب کنید؛ فقط ارتقا یا انتخاب مجاز فعال است";
  const pageDescription = purchased
    ? `پلن ${currentPlanLabel} برای این فضای کاری فعال است. پلن‌های پایین‌تر برای جلوگیری از خرید اشتباه قفل شده‌اند و فقط مدیریت، تمدید یا ارتقای مجاز قابل پیگیری است.`
    : "اگر اشتراک فعال ندارید، پلن مناسب را انتخاب کنید. اگر پلنی در حال پیگیری دارید، وضعیت آن تا زمان فعال‌سازی رسمی مالک پلتفرم در همین صفحه نمایش داده می‌شود.";
  const workspaceName = resolveWorkspaceDisplayName({
    tenantName: membership?.tenant.name,
    hallProfile: membership?.tenant.hallProfile,
    ownerName: user.name ?? user.email,
    subscription,
    tenantStatus: membership?.tenant?.status,
    fallback: "فضای کاری هنوز ساخته نشده",
  });
  const now = new Date();
  const today = formatJalaliDate(now);
  const period = getSubscriptionPeriodSummary(subscription, now);

  return (
    <section className="space-y-6">
      <header className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7 lg:p-8">
        <Link
          href="/dashboard/account"
          className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/72 bg-[#fff8ea]/72 px-3 py-1.5 text-xs font-black text-[#6d5f49] transition hover:border-[#c7a15a]"
        >
          <ArrowRight size={15} /> بازگشت به حساب کاربری
        </Link>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_25rem] xl:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Crown size={15} /> انتخاب پلن از داخل حساب کاربری
            </p>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              {pageTitle}
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              {pageDescription}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">
              وضعیت فعلی اشتراک
            </p>
            <h2 className="mt-2 text-xl font-black">{workspaceName}</h2>
            <div className="gold-divider my-4" />
            <div className="grid gap-2 text-sm font-bold leading-7 text-[#d9caa9]">
              <span>امروز: {today}</span>
              <span>پلن فعلی: {currentPlanLabel}</span>
              <span>وضعیت اشتراک: {subscriptionStateLabel}</span>
              {purchased ? (
                <span>
                  اشتراک {currentPlanLabel} فعال است؛{" "}
                  {formatDayCount(period.remainingDays)} از{" "}
                  {formatDayCount(period.totalDays)} باقی مانده است.
                </span>
              ) : hasSelectedPaidPlan ? (
                <span>وضعیت پیگیری: پلن انتخاب شده اما هنوز فعال نشده است</span>
              ) : (
                <span>روش خرید: تیکت و هماهنگی مستقیم</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {purchaseErrorMessage ? (
        <div className="flex items-start gap-3 rounded-[1.35rem] border border-[#b42318]/20 bg-[#fff1f0] p-4 text-sm font-black leading-7 text-[#8a1f16] shadow-[0_14px_44px_rgba(180,35,24,0.08)]">
          <ShieldAlert className="mt-1 shrink-0" size={19} />
          <span>{purchaseErrorMessage}</span>
        </div>
      ) : null}

      {!membership ? (
        <div className="rounded-[1.6rem] border border-[#c7a15a]/36 bg-[#fff7e6] p-4 text-sm font-bold leading-7 text-[#7a4a12] shadow-[0_14px_44px_rgba(17,24,39,0.055)]">
          هنوز فضای کاری فعال ندارید. با ثبت درخواست خرید، یک فضای پیگیری
          تعلیق‌شده برای حساب شما ساخته می‌شود تا تیکت خرید داخل سامانه قابل
          پیگیری باشد؛ این فضا تا زمان تأیید مالک پلتفرم برای بهره‌برداری
          عملیاتی باز نمی‌شود.
        </div>
      ) : null}

      {purchased ? (
        <section className="grid gap-4 rounded-[1.6rem] border border-[#25a46d]/18 bg-[#f1fbf6] p-4 text-[#12372f] shadow-[0_16px_52px_rgba(23,72,63,0.07)] md:grid-cols-2 xl:grid-cols-6">
          <Info label="پلن فعال" value={currentPlanLabel} />
          <Info label="وضعیت" value={subscriptionStateLabel} />
          <Info label="شروع اشتراک" value={formatJalaliDate(period.start)} />
          <Info label="پایان اشتراک" value={formatJalaliDate(period.end)} />
          <Info label="گذشته" value={formatDayCount(period.elapsedDays)} />
          <Info
            label="باقی‌مانده"
            value={`${formatDayCount(period.remainingDays)} از ${formatDayCount(period.totalDays)}`}
          />
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        {planCatalog.map((plan) => {
          const isCurrentPlan =
            purchased &&
            isSamePurchasablePlan({
              currentPlan,
              requestedPlan: plan.plan,
            });
          const isDowngrade =
            purchased &&
            isPurchasablePlanDowngrade({
              currentPlan,
              requestedPlan: plan.plan,
            });
          const isUpgrade =
            purchased &&
            isPurchasablePlanUpgrade({
              currentPlan,
              requestedPlan: plan.plan,
            });
          const isDisabled = isCurrentPlan || isDowngrade;
          const buttonLabel = getPlanButtonLabel({
            planTitle: plan.title,
            purchased,
            isCurrentPlan,
            isDowngrade,
            isUpgrade,
          });

          return (
            <article
              key={plan.plan}
              className={[
                "relative flex min-h-full flex-col rounded-[1.8rem] border bg-[#fff9ee]/94 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)]",
                isCurrentPlan
                  ? "border-[#25a46d]/34 ring-2 ring-[#25a46d]/14"
                  : isDowngrade
                    ? "border-[#cbd5e1]/70 opacity-82"
                    : "border-[#d8c08b]/62",
              ].join(" ")}
            >
              {isCurrentPlan ? (
                <span className="absolute left-5 top-5 rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
                  پلن فعال شما
                </span>
              ) : plan.badge ? (
                <span className="absolute left-5 top-5 rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1 text-xs font-black text-[#17483f]">
                  {plan.badge}
                </span>
              ) : null}
              <div className="flex items-start gap-3 pl-24">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]">
                  <Sparkles size={20} />
                </span>
                <div>
                  <p className="text-xs font-black text-[#17483f]">
                    {plan.priceLabel}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">{plan.title}</h2>
                </div>
              </div>

              <p className="mt-4 text-sm font-bold leading-7 text-[#6d5f49]">
                {plan.description}
              </p>
              <p className="mt-3 rounded-2xl border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-2 text-xs font-black leading-6 text-[#7d6841]">
                مناسب برای: {plan.bestFor}
              </p>

              {isCurrentPlan ? (
                <div className="mt-4 rounded-2xl border border-[#25a46d]/18 bg-[#25a46d]/8 p-3 text-xs font-black leading-6 text-[#17483f]">
                  <p>این پلن برای شما فعال است.</p>
                  <p className="mt-1">
                    {formatDayCount(period.remainingDays)} باقی‌مانده از{" "}
                    {formatDayCount(period.totalDays)}
                  </p>
                  <p className="mt-1">
                    شروع: {formatJalaliDate(period.start)} · پایان:{" "}
                    {formatJalaliDate(period.end)}
                  </p>
                  <p className="mt-1">
                    گذشته: {formatDayCount(period.elapsedDays)}
                  </p>
                </div>
              ) : null}

              {isDowngrade ? (
                <div className="mt-4 rounded-2xl border border-[#b8c0cc]/55 bg-[#f8fafc] p-3 text-xs font-black leading-6 text-[#64748b]">
                  این پلن پایین‌تر از پلن فعلی شماست و تا زمان فعال بودن اشتراک
                  فعلی قابل خرید نیست.
                </div>
              ) : null}

              <ul className="mt-4 grid gap-2 text-sm font-bold leading-7 text-[#172033]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-1 shrink-0 text-[#17483f]"
                      size={17}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <form
                action={createPlanPurchaseTicketAction}
                className="mt-auto pt-5"
              >
                <input type="hidden" name="plan" value={plan.plan} />
                <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                  <span>توضیح اختیاری برای مالک پلتفرم</span>
                  <textarea
                    name="note"
                    rows={3}
                    disabled={isDisabled}
                    className="input-luxury min-h-24 resize-none py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder={
                      isDisabled
                        ? "برای این پلن نیازی به درخواست جدید نیست"
                        : "مثلاً تعداد تالار، نیاز به آموزش، زمان تماس یا توضیح خاص خرید"
                    }
                  />
                </label>
                <button
                  type="submit"
                  disabled={isDisabled}
                  className={
                    isDisabled
                      ? "mt-4 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] px-5 py-3 text-sm font-black text-[#64748b]"
                      : "btn-luxury-dark mt-4 w-full justify-center px-5 py-3"
                  }
                >
                  <MessageSquareText size={18} />
                  {buttonLabel}
                </button>
              </form>
            </article>
          );
        })}
      </div>

      <section className="grid gap-4 rounded-[1.8rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-5 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <span className="flex size-12 items-center justify-center rounded-2xl border border-[#e8c478]/30 bg-[#e8c478]/10 text-[#f0dba9]">
          <Headset size={22} />
        </span>
        <div>
          <h2 className="text-xl font-black">
            همه مکاتبات خرید در تیکت ذخیره می‌شود
          </h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#d9caa9]">
            بعد از انتخاب یا ارتقای پلن، تیکت در پنل کاربر و پنل مالک پلتفرم
            قابل مشاهده است. فعال‌سازی نهایی اشتراک بعد از هماهنگی انجام می‌شود.
          </p>
        </div>
        <Link
          href="/dashboard/support"
          className="btn-luxury-secondary justify-center border-white/10 bg-white/8 px-5 py-3 text-[#fff8ea] hover:bg-white/12"
        >
          <ShieldCheck size={17} /> مشاهده تیکت‌ها
        </Link>
      </section>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#25a46d]/16 bg-white/65 p-3 shadow-[0_10px_28px_rgba(23,72,63,0.045)]">
      <p className="flex items-center gap-1.5 text-[0.68rem] font-black text-[#5f756d]">
        <CalendarDays size={13} /> {label}
      </p>
      <p className="mt-1 text-sm font-black text-[#12372f]">{value}</p>
    </div>
  );
}
