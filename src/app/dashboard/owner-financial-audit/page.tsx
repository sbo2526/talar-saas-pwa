import {
  AlertTriangle,
  ArrowLeft,
  FileWarning,
  HandCoins,
  MessageSquareWarning,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  getOwnerFinancialAuditCategoryLabel,
  getOwnerFinancialAuditSeverityStyle,
  getOwnerFinancialControlAuditData,
  ownerFinancialAuditSeverityLabels,
  type OwnerFinancialAuditFlag,
} from "@/lib/owner-audit/owner-financial-control-audit";

export default async function OwnerFinancialAuditPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }>;
}) {
  const membership = await requireTenantPermission("owner.audit.view");
  const query = await searchParams;
  const data = await getOwnerFinancialControlAuditData({
    tenantId: membership.tenantId,
    year: query?.year,
    month: query?.month,
  });

  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_14%_0%,rgba(180,83,83,0.12),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_20px_60px_rgba(17,24,39,0.10)] sm:rounded-[1.8rem] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/owner-settlements" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/34 sm:text-sm">
              <HandCoins size={16} /> تسویه مالک
            </Link>
            <Link href="/dashboard/settings" className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              تنظیمات <ArrowLeft size={16} />
            </Link>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b45353]/18 bg-[#fff1f1] px-3 py-1.5 text-xs font-black text-[#8f2c2c]">
            <ShieldAlert size={15} /> کنترل مالی مالک
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="min-w-0 text-right">
            <h1 className="text-2xl font-black leading-tight sm:text-4xl">
              حسابرسی اختلاف‌ها، پرداخت‌های خارج از فاکتور و نفرات اضافه
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              این صفحه فقط برای مالک نمایش داده می‌شود و هشدارهای مالی را از پاسخ مشتری، صورتحساب، تأیید برگزاری، فاکتور و تسویه ماهانه جمع‌بندی می‌کند.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d8c08b]/65 bg-white/62 p-3 text-center text-xs font-black leading-6 text-[#7d6841]">
            <p>دوره حسابرسی</p>
            <p className="mt-1 text-lg text-[#111827]">{data.period.label}</p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ShieldAlert}
          label="کل هشدارها"
          value={formatPersianNumber(data.summary.totalFlags)}
          strong={data.summary.totalFlags > 0}
          source="از همه هشدارهای حسابرسی مالک در همین دوره شمسی جمع می‌شود. قراردادهای آرشیوی قبل از شروع کنترل در این عدد وارد نمی‌شوند."
        />
        <MetricCard
          icon={AlertTriangle}
          label="ریسک زیاد"
          value={formatPersianNumber(data.summary.highRisk)}
          strong={data.summary.highRisk > 0}
          danger
          source="هشدارهایی که شدت آن‌ها زیاد تشخیص داده شده است؛ مثل پرداخت خارج فاکتور، اختلاف مهم نفرات یا مراسم برگزارشده بدون فاکتور."
        />
        <MetricCard
          icon={WalletCards}
          label="پرداخت خارج فاکتور"
          value={formatPersianNumber(data.summary.offInvoicePayments)}
          strong={data.summary.offInvoicePayments > 0}
          danger
          source="از گزارش مشتری یا داده‌های مرتبط با پرداخت‌هایی می‌آید که در فاکتور رسمی دوره ثبت نشده‌اند."
        />
        <MetricCard
          icon={UsersRound}
          label="اختلاف نفرات"
          value={formatPersianNumber(data.summary.extraGuestMismatches)}
          strong={data.summary.extraGuestMismatches > 0}
          source="اختلاف بین نفرات قرارداد، نفرات تأییدشده بعد از مراسم و موارد گزارش‌شده توسط مشتری را نشان می‌دهد."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Panel title={`هشدارهای دوره ${data.period.label}`} icon={FileWarning}>
            {data.flags.length > 0 ? (
              <div className="grid gap-3">
                {data.flags.map((flag) => <AuditFlagCard key={flag.id} flag={flag} />)}
              </div>
            ) : (
              <EmptyAuditState periodLabel={data.period.label} />
            )}
          </Panel>

          <Panel title="منبع‌های کنترل مالی" icon={ShieldCheck}>
            <div className="grid gap-3 md:grid-cols-3">
              <SourceBox title="فاکتور و قرارداد" body="مبلغ فاکتور، ردیف‌های اضافه، نفرات قرارداد و وضعیت برگزاری برای ساخت هشدار بررسی می‌شود." />
              <SourceBox title="بازخورد مشتری" body="اعتراض، پرداخت خارج از فاکتور، خدمات اضافه و پیام محرمانه مشتری فقط برای مالک در کنترل مالی دیده می‌شود." />
              <SourceBox title="تسویه مالک" body="نتیجه هشدارها در تصمیم‌گیری تسویه ماهانه، تأیید پرداخت و بررسی ریسک دوره استفاده می‌شود." />
            </div>
          </Panel>
        </div>

        <aside className="space-y-3">
          <PeriodFilter year={data.period.year} month={data.period.month} />
          <SummaryCard label="مراسم بدون فاکتور" value={formatPersianNumber(data.summary.heldWithoutInvoice)} icon={ReceiptText} danger={data.summary.heldWithoutInvoice > 0} source="مراسمی که برگزار شده اما برای آن فاکتور معتبر دوره ساخته نشده است." />
          <SummaryCard label="ریسک متوسط" value={formatPersianNumber(data.summary.mediumRisk)} icon={MessageSquareWarning} source="موارد قابل پیگیری که هنوز به سطح ریسک زیاد نرسیده‌اند." />
          <SummaryCard label="اطلاع حسابرسی" value={formatPersianNumber(data.summary.lowRisk)} icon={ShieldCheck} source="اطلاع‌های کم‌ریسک برای تکمیل دید مالک از وضعیت دوره." />
          <AccessRuleCard />
          <LatestSettlements settlements={data.latestSettlements} />
        </aside>
      </section>
    </section>
  );
}

function AuditFlagCard({ flag }: { flag: OwnerFinancialAuditFlag }) {
  return (
    <article className={`rounded-[1.25rem] border p-4 text-right shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${getOwnerFinancialAuditSeverityStyle(flag.severity)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/20 bg-white/50 px-3 py-1 text-[11px] font-black">
              {ownerFinancialAuditSeverityLabels[flag.severity]}
            </span>
            <span className="rounded-full border border-current/15 bg-white/45 px-3 py-1 text-[11px] font-black">
              {getOwnerFinancialAuditCategoryLabel(flag.category)}
            </span>
          </div>
          <h2 className="mt-3 text-base font-black leading-7 text-[#111827] sm:text-lg">{flag.title}</h2>
          <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">{flag.description}</p>
        </div>
        {flag.href ? (
          <Link href={flag.href} className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-current/18 bg-white/72 px-3 text-xs font-black">
            مشاهده <ArrowLeft size={14} />
          </Link>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-xs font-black sm:grid-cols-2 lg:grid-cols-4">
        <Info label="قرارداد" value={flag.contractNo ? toPersianDigits(flag.contractNo) : "—"} />
        <Info label="فاکتور" value={flag.invoiceNo ? toPersianDigits(flag.invoiceNo) : "—"} />
        <Info label="مشتری" value={flag.customerName ?? "—"} />
        <Info label="تاریخ مراسم" value={flag.eventDateLabel ?? "—"} />
      </div>

      {typeof flag.amount === "number" && flag.amount > 0 ? (
        <div className="mt-3 rounded-2xl border border-current/15 bg-white/62 px-3 py-2 text-sm font-black text-[#111827]">
          مبلغ/اختلاف اعلامی: {formatIRR(String(flag.amount))}
        </div>
      ) : null}

      {flag.evidence.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pr-5 text-xs font-bold leading-6 text-[#4b5563]">
          {flag.evidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}

      {flag.ownerOnlyMessage ? (
        <div className="mt-3 rounded-2xl border border-[#172033]/16 bg-[#172033] px-3 py-2 text-xs font-bold leading-6 text-[#fff8ea]">
          <p className="font-black">پیام محرمانه مشتری برای مالک:</p>
          <p className="mt-1">{flag.ownerOnlyMessage}</p>
        </div>
      ) : null}
    </article>
  );
}

function EmptyAuditState({ periodLabel }: { periodLabel: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#25a46d]/24 bg-[#f1fbf5] p-5 text-center text-sm font-bold leading-7 text-[#17483f]">
      <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-white/70 text-[#17483f]">
        <ShieldCheck size={20} />
      </div>
      <p className="mt-3 text-base font-black text-[#111827]">برای دوره {periodLabel} هشدار فعالی ثبت نشده است.</p>
      <p className="mx-auto mt-2 max-w-2xl">
        این وضعیت از بررسی قراردادهای غیرآرشیوی، فاکتورهای بعد از مراسم، پاسخ مشتری و سیگنال‌های تسویه ساخته می‌شود. اگر داده‌ای وجود نداشته باشد، صفحه به‌صورت امن empty state نشان می‌دهد.
      </p>
    </div>
  );
}

function PeriodFilter({ year, month }: { year: number; month: number }) {
  return (
    <form className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="text-sm font-black text-[#111827]">انتخاب دوره شمسی</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input name="year" defaultValue={year} inputMode="numeric" aria-label="سال" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 text-center text-sm font-black text-[#111827]" />
        <input name="month" defaultValue={month} inputMode="numeric" aria-label="ماه" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 text-center text-sm font-black text-[#111827]" />
      </div>
      <button className="mt-3 min-h-11 w-full rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]">نمایش حسابرسی</button>
    </form>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <h2 className="flex items-center justify-center gap-2 text-center text-lg font-black text-[#111827] sm:justify-start sm:text-right">
        <Icon size={18} className="text-[#7d6841]" /> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, source, strong = false, danger = false }: { icon: LucideIcon; label: string; value: string; source: string; strong?: boolean; danger?: boolean }) {
  const className = danger && strong
    ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"
    : strong
      ? "border-[#17483f]/22 bg-[#f1fbf5] text-[#17483f]"
      : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]";
  return (
    <div className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${className}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="text-center text-xs font-black opacity-75">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-white/62"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-center text-xl font-black">{value}</p>
      <SourceDetails>{source}</SourceDetails>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, source, danger = false }: { icon: LucideIcon; label: string; value: string; source: string; danger?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 text-center shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${danger ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"}`}>
      <div className="flex flex-col items-center justify-center gap-2">
        <p className="text-center text-xs font-black opacity-75">{label}</p>
        <Icon size={17} />
      </div>
      <p className="mt-2 text-center text-base font-black">{value}</p>
      <SourceDetails>{source}</SourceDetails>
    </div>
  );
}

function SourceDetails({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 rounded-2xl border border-current/12 bg-white/45 px-3 py-2 text-right text-[11px] font-bold leading-5">
      <summary className="cursor-pointer text-center font-black">منبع داده</summary>
      <p className="mt-2 text-[#4b5563]">{children}</p>
    </details>
  );
}

function SourceBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.1rem] border border-[#d8c08b]/55 bg-white/64 p-4 text-center text-xs font-bold leading-6 text-[#6d5f49]">
      <p className="text-sm font-black text-[#111827]">{title}</p>
      <p className="mt-2">{body}</p>
    </div>
  );
}

function AccessRuleCard() {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-center text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="font-black text-[#111827]">قانون دسترسی</p>
      <p className="mt-2">این صفحه فقط با نقش مالک باز می‌شود. کاربر غیرمالک نباید پیام محرمانه مشتری، پرداخت بیرون فاکتور یا سیگنال‌های کنترل مالک را ببیند.</p>
    </div>
  );
}

function LatestSettlements({ settlements }: { settlements: { id: string; periodLabel: string; finalOwnerPayable: number | string }[] }) {
  return (
    <div className="rounded-[1.25rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 text-center text-xs font-bold leading-6 text-[#17483f] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="font-black">آخرین تسویه‌ها</p>
      <div className="mt-3 space-y-2">
        {settlements.length > 0 ? settlements.map((settlement) => (
          <Link key={settlement.id} href={`/dashboard/owner-settlements/${settlement.id}`} className="block rounded-2xl border border-[#17483f]/16 bg-white/75 p-3 transition hover:bg-[#fff4d8]">
            <p className="font-black text-[#111827]">{settlement.periodLabel}</p>
            <p className="mt-1 text-[#17483f]">{formatIRR(settlement.finalOwnerPayable.toString())}</p>
          </Link>
        )) : <p>هنوز تسویه ماهانه ذخیره نشده است.</p>}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-current/12 bg-white/55 p-3 text-center">
      <p className="text-[11px] font-black opacity-65">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}
