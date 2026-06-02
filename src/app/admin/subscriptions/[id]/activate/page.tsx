import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Crown, Headphones, ShieldCheck, WalletCards } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { StatusChip } from "@/components/admin/status-chip";
import { activateTenantSubscriptionAction } from "@/lib/actions/admin-subscription-actions";
import { getSubscriptionPlanLabel, getSubscriptionStatusLabel, getSubscriptionStatusTone, getTenantStatusLabel, getTenantStatusTone, getTicketPriorityLabel, getTicketPriorityTone, getTicketStatusLabel, getTicketStatusTone } from "@/lib/admin/admin-labels";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { formatJalaliAuditDateTime, formatJalaliDateTime } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import { planCatalog } from "@/lib/subscriptions/plans";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ activated?: string; activationError?: string }>;
};

const durationOptions = [
  { value: "1", label: "۱ ماه" },
  { value: "3", label: "۳ ماه" },
  { value: "6", label: "۶ ماه" },
  { value: "12", label: "۱۲ ماه" },
];

const activationErrorLabels: Record<string, string> = {
  "tenant-missing": "شناسه فضای کاری برای فعال‌سازی ارسال نشده است.",
  "tenant-not-found": "فضای کاری انتخاب‌شده پیدا نشد.",
  "plan-invalid": "پلن انتخاب‌شده معتبر نیست.",
  "duration-invalid": "مدت اشتراک انتخاب‌شده معتبر نیست.",
};

export default async function AdminSubscriptionActivatePage({ params, searchParams }: PageProps) {
  await requirePlatformAdmin();
  const { id } = await params;
  const flags = (await searchParams) ?? {};
  const db = await getPrisma();

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          lastLoginAt: true,
        },
      },
      subscription: true,
      hallProfile: true,
      supportTickets: {
        where: {
          category: "SUBSCRIPTION",
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, senderType: true, createdAt: true },
          },
        },
      },
      _count: {
        select: {
          contracts: true,
          customers: true,
          supportTickets: true,
        },
      },
    },
  });

  if (!tenant) notFound();

  const displayName = tenant.hallProfile?.brandName || tenant.name;
  const activePurchaseTickets = tenant.supportTickets.filter((ticket: { status: string }) => ticket.status !== "CLOSED");
  const currentPlan = tenant.subscription?.plan ?? "DEMO";
  const currentStatus = tenant.subscription?.status ?? null;

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[1.85rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.23),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/subscriptions" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/72 bg-[#fff8ea]/72 px-3 py-1.5 text-xs font-black text-[#6d5f49] transition hover:border-[#c7a15a]">
            <ArrowRight size={15} /> بازگشت به اشتراک و دوره‌های بررسی
          </Link>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={getTenantStatusTone(tenant.status)}>{getTenantStatusLabel(tenant.status)}</StatusChip>
            <StatusChip tone={getSubscriptionStatusTone(currentStatus)}>{getSubscriptionStatusLabel(currentStatus)}</StatusChip>
            <StatusChip tone="navy">پلن {getSubscriptionPlanLabel(currentPlan)}</StatusChip>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_24rem] xl:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f] sm:px-4 sm:py-2 sm:text-sm">
              <Crown size={15} /> فعال‌سازی اشتراک بعد از پرداخت و تکمیل اطلاعات
            </p>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:mt-5 sm:text-4xl">
              ارتقای پلن برای {displayName}
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:mt-4 sm:text-base sm:leading-8">
              این صفحه برای همان سناریوی خرید از طریق تیکت است: بعد از صحبت با کاربر، دریافت پرداخت و تکمیل اطلاعات، پلن را از اینجا فعال می‌کنی و فضای کاری از حالت دوره بررسی/تعلیق به استفاده واقعی می‌رود.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#e8c478]/28 bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(8,13,20,0.98))] p-4 text-[#fff8ea] shadow-[0_24px_80px_rgba(17,24,39,0.22)] sm:p-5">
            <p className="text-xs font-black text-[#f0dba9]">مالک حساب</p>
            <h2 className="mt-2 text-xl font-black">{tenant.owner.name || tenant.owner.email}</h2>
            <div className="gold-divider my-4" />
            <div className="grid gap-2 text-sm font-bold leading-7 text-[#d9caa9]">
              <span>ایمیل: {tenant.owner.email}</span>
              <span>موبایل: {tenant.owner.phone || "ثبت نشده"}</span>
              <span>آخرین ورود: {formatJalaliDateTime(tenant.owner.lastLoginAt)}</span>
            </div>
          </div>
        </div>
      </header>

      {flags.activated === "1" ? (
        <AdminCard className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <div className="flex flex-wrap items-center gap-3 text-sm font-black leading-7">
            <CheckCircle2 size={20} /> اشتراک با موفقیت فعال شد. کاربر حالا می‌تواند از سامانه عملیاتی استفاده کند.
          </div>
        </AdminCard>
      ) : null}

      {flags.activationError ? (
        <AdminCard className="border-rose-200 bg-rose-50 text-rose-800">
          <p className="text-sm font-black leading-7">
            {activationErrorLabels[flags.activationError] ?? "فعال‌سازی اشتراک انجام نشد. اطلاعات فرم را بررسی کنید."}
          </p>
        </AdminCard>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <AdminCard>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#172033]">فرم فعال‌سازی پلن</h2>
              <p className="mt-1 text-xs font-bold leading-6 text-[#7b6a4b]">
                این فرم فقط پلن و وضعیت اشتراک را فعال می‌کند؛ پرداخت واقعی همچنان بیرون از سامانه و از مسیر تیکت پیگیری شده است.
              </p>
            </div>
            <WalletCards className="text-[#9a6a15]" size={26} />
          </div>

          <form action={activateTenantSubscriptionAction} className="grid gap-4">
            <input type="hidden" name="tenantId" value={tenant.id} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                <span>پلن قابل فعال‌سازی</span>
                <select name="plan" defaultValue={currentPlan !== "DEMO" ? currentPlan : "PROFESSIONAL"} className="input-luxury h-12 text-sm font-bold">
                  {planCatalog.map((plan) => (
                    <option key={plan.plan} value={plan.plan}>{plan.title}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                <span>مدت اشتراک</span>
                <select name="durationMonths" defaultValue="1" className="input-luxury h-12 text-sm font-bold">
                  {durationOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                <span>مبلغ پرداخت‌شده، اختیاری، ریال</span>
                <input name="paidAmount" inputMode="numeric" className="input-luxury h-12 text-sm font-bold" placeholder="مثلاً ۱۵۰۰۰۰۰۰" />
              </label>

              <label className="grid gap-1.5 text-xs font-black text-[#172033]">
                <span>شناسه پرداخت / توضیح ارجاع، اختیاری</span>
                <input name="paymentReference" className="input-luxury h-12 text-sm font-bold" placeholder="مثلاً شماره کارت، رسید، شماره پیگیری" />
              </label>
            </div>

            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>یادداشت داخلی فعال‌سازی</span>
              <textarea name="note" rows={4} className="input-luxury min-h-28 resize-none py-3 text-sm font-bold" placeholder="مثلاً پرداخت کارت‌به‌کارت تأیید شد، اطلاعات تالار کامل شد، آموزش اولیه هماهنگ شد." />
            </label>

            <label className="flex items-start gap-2 rounded-2xl border border-[#e8c478]/30 bg-[#fffaf0] p-3 text-xs font-bold leading-6 text-[#6d5f49]">
              <input name="closePurchaseTickets" type="checkbox" className="mt-1" defaultChecked />
              <span>
                تیکت‌های بازِ دسته اشتراک این فضای کاری بعد از فعال‌سازی بسته شوند. اگر می‌خواهی مکالمه ادامه داشته باشد، این گزینه را بردار.
              </span>
            </label>

            <button type="submit" className="btn-luxury-dark justify-center px-5 py-3">
              <ShieldCheck size={18} /> فعال‌سازی و ارتقای اشتراک
            </button>
          </form>
        </AdminCard>

        <div className="space-y-4">
          <AdminCard>
            <h2 className="mb-4 text-lg font-black text-[#172033]">وضعیت فعلی</h2>
            <div className="grid gap-3 text-sm font-bold leading-7 text-[#6d5f49]">
              <Info label="نام فضای کاری" value={tenant.name} />
              <Info label="برند تالار" value={tenant.hallProfile?.brandName} />
              <Info label="پلن فعلی" value={getSubscriptionPlanLabel(currentPlan)} />
              <Info label="وضعیت اشتراک" value={getSubscriptionStatusLabel(currentStatus)} />
              <Info label="شروع دوره" value={formatJalaliDateTime(tenant.subscription?.currentPeriodStart)} />
              <Info label="پایان دوره" value={formatJalaliDateTime(tenant.subscription?.currentPeriodEnd)} />
              <Info label="ارجاع خرید" value={tenant.subscription?.purchaseReference} />
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-4 text-lg font-black text-[#172033]">مصرف و سابقه</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniMetric label="قرارداد" value={formatPersianNumber(tenant._count.contracts)} />
              <MiniMetric label="مشتری" value={formatPersianNumber(tenant._count.customers)} />
              <MiniMetric label="تیکت" value={formatPersianNumber(tenant._count.supportTickets)} />
            </div>
          </AdminCard>
        </div>
      </section>

      <AdminCard>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#172033]">تیکت‌های خرید و اشتراک</h2>
            <p className="mt-1 text-xs font-bold text-[#7b6a4b]">برای اینکه بعداً معلوم باشد چه کسی چه چیزی خریده و چرا، مکالمات خرید همین‌جا دیده می‌شود.</p>
          </div>
          <StatusChip tone={activePurchaseTickets.length > 0 ? "rose" : "emerald"}>
            {activePurchaseTickets.length > 0 ? `${formatPersianNumber(activePurchaseTickets.length)} تیکت باز` : "بدون تیکت باز"}
          </StatusChip>
        </div>

        <div className="grid gap-3">
          {tenant.supportTickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/admin/support/${ticket.id}`} className="block rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 transition hover:border-[#c7a15a] hover:bg-[#fff7e6]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Headphones size={16} className="text-[#9a6a15]" />
                  <p className="font-black text-[#172033]">{ticket.ticketNumber}</p>
                  <p className="truncate text-sm font-bold text-[#6d5f49]">{ticket.title}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StatusChip tone={getTicketStatusTone(ticket.status)}>{getTicketStatusLabel(ticket.status)}</StatusChip>
                  <StatusChip tone={getTicketPriorityTone(ticket.priority)}>{getTicketPriorityLabel(ticket.priority)}</StatusChip>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-bold leading-6 text-[#7b6a4b]">
                {ticket.messages[0]?.body ?? "پیامی برای این تیکت ثبت نشده است."}
              </p>
              <p className="mt-2 text-[11px] font-bold text-[#8a795a]">آخرین پیام: {formatJalaliAuditDateTime(ticket.lastMessageAt)}</p>
            </Link>
          ))}
          {tenant.supportTickets.length === 0 ? (
            <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-4 text-center text-sm font-bold text-[#7b6a4b]">
              هنوز تیکت خرید/اشتراک برای این فضای کاری ثبت نشده است، ولی ادمین همچنان می‌تواند پلن را دستی فعال کند.
            </div>
          ) : null}
        </div>
      </AdminCard>
    </div>
  );
}

function Info({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3">
      <p className="text-[11px] font-black text-[#7b6a4b]">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-[#172033]">{String(value || "—")}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e8c478]/28 bg-[#fffaf0] p-3 text-center text-[#172033]">
      <p className="break-words text-sm font-black leading-6">{value}</p>
      <p className="mt-1 text-[11px] font-bold opacity-75">{label}</p>
    </div>
  );
}
