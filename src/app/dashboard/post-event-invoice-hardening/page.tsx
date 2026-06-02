import {
  ArrowLeft,
  BellRing,
  ClipboardCheck,
  FileWarning,
  HandCoins,
  LockKeyhole,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  getPostEventInvoiceFinalHardeningData,
  getPostEventInvoiceHardeningStatusStyle,
  postEventInvoiceHardeningStatusLabels,
  type PostEventInvoiceHardeningCheck,
  type PostEventInvoiceHardeningStatus,
} from "@/lib/post-event-invoice-hardening/final-hardening-readiness";

export default async function PostEventInvoiceHardeningPage() {
  const membership = await requireTenantPermission("settings.view");
  const data = await getPostEventInvoiceFinalHardeningData({ tenantId: membership.tenantId });

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(23,72,63,0.16),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${getPostEventInvoiceHardeningStatusStyle(data.overallStatus)}`}>
              <ShieldCheck size={15} /> {postEventInvoiceHardeningStatusLabels[data.overallStatus]}
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              سخت‌سازی نهایی مسیر صورتحساب بعد از مراسم
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              این صفحه چک نهایی چرخه بعد از مراسم است: تعیین وضعیت بعد از مراسم، صدور صورتحساب، پاسخ مشتری، کنترل مالی مالک، اصلاح با تأیید مالک، ارسال اعلان، تسویه، چاپ و قفل ماه مالی.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/owner-financial-overview" className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 py-2.5 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/34 sm:text-sm">
              <ReceiptText size={16} /> نمای مالی مالک
            </Link>
            <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              تنظیمات <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ShieldCheck} label="آماده" value={formatPersianNumber(data.summary.ready)} status="READY" />
        <MetricCard icon={ShieldAlert} label="نیازمند بررسی" value={formatPersianNumber(data.summary.reviewRequired)} status={data.summary.reviewRequired > 0 ? "REVIEW_REQUIRED" : "READY"} />
        <MetricCard icon={FileWarning} label="مسدود" value={formatPersianNumber(data.summary.blocked)} status={data.summary.blocked > 0 ? "BLOCKED" : "READY"} />
        <MetricCard icon={LockKeyhole} label="دوره فعلی" value={data.currentJalaliPeriod.label} status={data.overallStatus} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-3">
          {data.checks.map((check) => <CheckCard key={check.id} check={check} />)}
        </div>
        <aside className="space-y-3">
          <Panel icon={HandCoins} title="تنظیمات مالک">
            {data.ownerSetting ? (
              <div className="space-y-2 text-sm font-bold leading-7 text-[#17483f]">
                <p>مدل: {data.ownerSetting.operationModel}</p>
                <p>سهم مراسم: {toPersianDigits(data.ownerSetting.ownerRevenueSharePercent.toString())}٪</p>
                <p>سهم کنسلی: {toPersianDigits(data.ownerSetting.ownerCancellationSharePercent.toString())}٪</p>
                <p>حداقل تضمین: {formatIRR(data.ownerSetting.monthlyMinimumGuarantee.toString())}</p>
              </div>
            ) : (
              <p className="text-sm font-bold leading-7 text-[#8f2c2c]">تنظیمات فعال مالک پیدا نشد. این یکی را واقعاً نمی‌شود با امید حل کرد.</p>
            )}
          </Panel>
          <Panel icon={LockKeyhole} title="آخرین ماه بسته‌شده">
            {data.latestClosedSettlement ? (
              <div className="space-y-2 text-sm font-bold leading-7 text-[#6d5f49]">
                <p>{data.latestClosedSettlement.periodLabel}</p>
                <p>وضعیت: {data.latestClosedSettlement.status}</p>
                <p>مبلغ نهایی مالک: {formatIRR(data.latestClosedSettlement.finalOwnerPayable.toString())}</p>
                <Link href={`/dashboard/owner-settlements/${data.latestClosedSettlement.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#f1fbf5] px-3 py-2 text-xs font-black text-[#17483f]">
                  مشاهده تسویه <ArrowLeft size={14} />
                </Link>
              </div>
            ) : (
              <p className="text-sm font-bold leading-7 text-[#7a4a12]">هنوز دوره بسته‌شده‌ای ثبت نشده است. برای نسخه نهایی بهتر است حداقل یک تسویه تأیید/پرداخت‌شده تست شود.</p>
            )}
          </Panel>
          <Panel icon={BellRing} title="گاردهای امنیتی لینک مشتری">
            <ul className="space-y-2 text-sm font-bold leading-7 text-[#6d5f49]">
              <li>توکن خام مشتری دیگر در query داشبورد نمایش داده نمی‌شود.</li>
              <li>پیام مدیر/تلگرام دیگر لینک خام مشتری را ذخیره نمی‌کند.</li>
              <li>لاگ مدیریتی و لاگ پیامک مشتری لینک خام را ذخیره نمی‌کنند.</li>
              <li>دکمه‌های اثرگذار در ماه بسته همچنان مسدود می‌شوند.</li>
            </ul>
          </Panel>
          <Panel icon={ClipboardCheck} title="زمان تولید گزارش">
            <p className="text-sm font-bold leading-7 text-[#6d5f49]">{formatJalaliDateTime(data.generatedAt)}</p>
          </Panel>
        </aside>
      </section>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, status }: { icon: LucideIcon; label: string; value: string; status: PostEventInvoiceHardeningStatus }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${getPostEventInvoiceHardeningStatusStyle(status)}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black opacity-75">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-white/55"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-lg font-black">{value}</p>
    </div>
  );
}

function CheckCard({ check }: { check: PostEventInvoiceHardeningCheck }) {
  return (
    <article className={`rounded-[1.35rem] border p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5 ${getPostEventInvoiceHardeningStatusStyle(check.status)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/20 bg-white/55 px-3 py-1 text-xs font-black">{postEventInvoiceHardeningStatusLabels[check.status]}</span>
            <span className="rounded-full border border-current/20 bg-white/55 px-3 py-1 text-xs font-black">تعداد: {formatPersianNumber(check.count)}</span>
          </div>
          <h2 className="mt-3 text-lg font-black">{check.title}</h2>
          <p className="mt-2 text-sm font-bold leading-7 opacity-80">{check.description}</p>
        </div>
        <Link href={check.href} className="inline-flex items-center gap-2 rounded-2xl border border-current/20 bg-white/70 px-4 py-2.5 text-xs font-black transition hover:bg-white sm:text-sm">
          بررسی <ArrowLeft size={15} />
        </Link>
      </div>
    </article>
  );
}

function Panel({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <div className="flex items-center gap-2">
        <Icon size={17} className="text-[#7d6841]" />
        <h2 className="text-sm font-black text-[#111827]">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
