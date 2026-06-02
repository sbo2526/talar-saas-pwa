import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Info,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  BackToSettingsLink,
  SettingsPageShell,
} from "@/components/dashboard/settings/settings-page-shell";
import { bulkSettleHistoricalContractsAction } from "@/lib/actions/bulk-contract-settlement-actions";
import { requireTenantMember } from "@/lib/auth/session";
import {
  formatJalaliDate,
  formatJalaliDayKey,
  formatJalaliMonthTitle,
  getJalaliMonthLength,
  getPreviousJalaliMonth,
  getTodayJalali,
  parseDateLikeToDate,
  toLatinDigits,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import { getEffectivePaidAmount, toNumber } from "@/lib/payments/display";

type BulkContractSettlementPageProps = {
  searchParams?: Promise<{ cutoff?: string; status?: string }>;
};

type PreviewContract = {
  id: string;
  contractNo: string;
  title: string;
  eventDate: Date;
  customer: { fullName: string };
  finalTotal: { toString(): string } | string | number | null;
  remainingAmount: { toString(): string } | string | number | null;
  remainingAmountManual: boolean;
  status: string;
  payments: Array<{
    amount: { toString(): string } | string | number | null;
    type?: string | null;
    status?: string | null;
  }>;
  invoice: { status: string } | null;
};

function getDefaultCutoffDayKey() {
  const today = getTodayJalali();
  const previousMonth = getPreviousJalaliMonth(today.year, today.month);
  const day = getJalaliMonthLength(previousMonth.year, previousMonth.month);

  return formatJalaliDayKey({ ...previousMonth, day });
}

function normalizeCutoffInput(value: string | undefined) {
  return toLatinDigits(value ?? "").trim().replace(/[/.]/g, "-");
}

function parseCutoff(value: string | undefined) {
  const normalized = normalizeCutoffInput(value);
  if (!normalized) return null;

  const parsed = parseDateLikeToDate(normalized);
  if (!parsed) return null;

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 23, 59, 59, 999));
}

function getStatusMessage(status?: string) {
  const messages: Record<string, { tone: "success" | "warning" | "danger"; text: string }> = {
    settled: { tone: "success", text: "تسویه گروهی قراردادهای قدیمی انجام شد و گزارش آن در تاریخچه فعالیت‌ها ثبت شد." },
    empty: { tone: "warning", text: "برای بازه انتخاب‌شده قراردادی برای تسویه گروهی پیدا نشد." },
    "invalid-date": { tone: "danger", text: "تاریخ پایان بازه معتبر نیست. تاریخ را به شکل ۱۴۰۵-۰۲-۳۱ یا 1405-02-31 وارد کنید." },
    "confirm-required": { tone: "danger", text: "برای اجرای عملیات، عبارت تایید را دقیقاً وارد کنید." },
    "future-date": { tone: "danger", text: "تاریخ پایان بازه نمی‌تواند بعد از امروز باشد." },
    "owner-only": { tone: "danger", text: "این عملیات فقط برای مالک تالار فعال است." },
  };

  return status ? messages[status] : null;
}

function getContractRemaining(contract: PreviewContract) {
  const paidAmount = getEffectivePaidAmount(contract.payments);
  const computedRemaining = Math.max(0, toNumber(contract.finalTotal) - paidAmount);
  const storedRemaining = Math.max(0, toNumber(contract.remainingAmount));

  if (contract.status === "COMPLETED" && storedRemaining <= 0) {
    return 0;
  }

  const remainingAmount = contract.remainingAmountManual
    ? storedRemaining
    : Math.max(computedRemaining, storedRemaining);

  return Math.max(0, Math.round(remainingAmount));
}

export default async function BulkContractSettlementPage({ searchParams }: BulkContractSettlementPageProps) {
  const membership = await requireTenantMember();

  if (membership.role !== "OWNER") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const defaultCutoff = getDefaultCutoffDayKey();
  const cutoffInput = normalizeCutoffInput(params?.cutoff || defaultCutoff);
  const cutoffDate = parseCutoff(cutoffInput);
  const message = getStatusMessage(params?.status);
  const db = await getPrisma();

  const contracts: PreviewContract[] = cutoffDate
    ? ((await db.contract.findMany({
        where: {
          tenantId: membership.tenantId,
          eventDate: { lte: cutoffDate },
          status: { not: "CANCELED" },
        },
        select: {
          id: true,
          contractNo: true,
          title: true,
          status: true,
          eventDate: true,
          finalTotal: true,
          remainingAmount: true,
          remainingAmountManual: true,
          customer: { select: { fullName: true } },
          payments: { select: { amount: true, type: true, status: true } },
          invoice: { select: { status: true } },
        },
        orderBy: [{ eventDate: "desc" }, { contractNo: "desc" }],
        take: 400,
      })) as PreviewContract[])
    : [];

  const payableContracts = contracts.filter((contract: PreviewContract) => getContractRemaining(contract) > 0);
  const completedOrZeroContracts = contracts.filter((contract: PreviewContract) => getContractRemaining(contract) <= 0 && contract.status !== "COMPLETED");
  const alreadySettledContracts = contracts.filter((contract: PreviewContract) => getContractRemaining(contract) <= 0 && contract.status === "COMPLETED");
  const payableTotal = payableContracts.reduce((sum: number, contract: PreviewContract) => sum + getContractRemaining(contract), 0);
  const affectedCount = payableContracts.length + completedOrZeroContracts.length;
  const today = getTodayJalali();
  const previousMonth = getPreviousJalaliMonth(today.year, today.month);

  return (
    <SettingsPageShell
      title="تسویه گروهی قراردادهای قدیمی"
      subtitle="مالک می‌تواند قراردادهای قدیمی تا یک تاریخ مشخص را یک‌جا تسویه کند؛ برای قراردادهای دارای مانده، دریافت تسویه نهایی ثبت می‌شود و وضعیت قرارداد تکمیل می‌شود."
      badge="فقط مالک"
      tenantName={membership.tenant.hallProfile?.brandName ?? membership.tenant.name}
      actions={<BackToSettingsLink />}
    >
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<CalendarDays size={18} />} label="بازه پیشنهادی" value={`تا پایان ${formatJalaliMonthTitle(previousMonth.year, previousMonth.month)}`} />
        <SummaryCard icon={<FileCheck2 size={18} />} label="قراردادهای قابل بررسی" value={`${toPersianDigits(contracts.length)} قرارداد`} />
        <SummaryCard icon={<ReceiptText size={18} />} label="نیازمند ثبت تسویه" value={`${toPersianDigits(payableContracts.length)} قرارداد`} />
        <SummaryCard icon={<WalletCards size={18} />} label="جمع مانده قابل تسویه" value={formatIRR(payableTotal)} featured />
      </section>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#f1fbf5] px-3 py-1.5 text-xs font-black text-[#17483f]">
              <ShieldCheck size={15} /> اجرای کنترل‌شده توسط مالک
            </div>
            <h2 className="mt-3 text-2xl font-black">انتخاب بازه تسویه</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
              تاریخ پایان را وارد کنید. سامانه فقط قراردادهای همان تالار را تا پایان آن تاریخ بررسی می‌کند و قراردادهای لغوشده را تغییر نمی‌دهد. این کار برای مرتب‌سازی قراردادهای قدیمی است؛ همان کاری که اگر قرار بود دستی برای ۳۰۰ قرارداد انجام بدهی، احتمالاً تمدن از پا درمی‌آمد.
            </p>
          </div>

          <form action="/dashboard/settings/bulk-contract-settlement" className="grid gap-3 rounded-[1.35rem] border border-[#d8c08b]/55 bg-white/62 p-3">
            <label className="grid gap-1.5 text-xs font-black text-[#172033]">
              <span>تاریخ پایان بازه</span>
              <input name="cutoff" defaultValue={cutoffInput} dir="ltr" className="rounded-2xl border border-[#d8c08b]/65 bg-white px-3 py-3 text-sm font-black text-[#111827] outline-none focus:border-[#17483f]/50" placeholder="1405-02-31" />
            </label>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 text-sm font-black text-[#17483f] transition hover:border-[#17483f]/38">
              <Info size={16} /> پیش‌نمایش بازه
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">پیش‌نمایش اثر عملیات</h2>
              <p className="mt-1 text-sm font-bold text-[#6d5f49]">
                تاریخ انتخاب‌شده: {cutoffDate ? formatJalaliDate(cutoffDate) : "نامعتبر"}
              </p>
            </div>
            <span className="rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1.5 text-xs font-black text-[#7d6841]">
              {toPersianDigits(affectedCount)} قرارداد قابل تغییر
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniMetric label="ثبت دریافت تسویه" value={`${toPersianDigits(payableContracts.length)} قرارداد`} />
            <MiniMetric label="فقط تکمیل وضعیت" value={`${toPersianDigits(completedOrZeroContracts.length)} قرارداد`} />
            <MiniMetric label="قبلاً مرتب شده" value={`${toPersianDigits(alreadySettledContracts.length)} قرارداد`} />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-[#d8c08b]/58">
            <div className="grid grid-cols-[1.2fr_0.9fr_0.8fr] bg-[#f4ead4] px-3 py-2 text-xs font-black text-[#7d6841]">
              <span>قرارداد</span>
              <span>تاریخ مراسم</span>
              <span>مانده</span>
            </div>
            <div className="divide-y divide-[#d8c08b]/42 bg-white/55">
              {contracts.slice(0, 8).map((contract) => {
                const remaining = getContractRemaining(contract);
                return (
                  <div key={contract.id} className="grid grid-cols-[1.2fr_0.9fr_0.8fr] gap-2 px-3 py-3 text-xs font-bold text-[#172033]">
                    <span className="truncate">{toPersianDigits(contract.contractNo)} · {contract.customer.fullName}</span>
                    <span>{formatJalaliDate(contract.eventDate)}</span>
                    <span className={remaining > 0 ? "text-[#8f2c2c]" : "text-[#17483f]"}>{remaining > 0 ? formatIRR(remaining) : "تسویه"}</span>
                  </div>
                );
              })}
              {contracts.length === 0 ? (
                <p className="px-3 py-5 text-center text-sm font-black text-[#7d6841]">برای این بازه قراردادی پیدا نشد.</p>
              ) : null}
            </div>
          </div>
          {contracts.length > 8 ? (
            <p className="mt-3 text-center text-xs font-black text-[#7d6841]">
              فقط ۸ مورد اول نمایش داده شده است؛ عملیات روی همه موارد قابل تغییر همین بازه انجام می‌شود.
            </p>
          ) : null}
        </div>

        <form action={bulkSettleHistoricalContractsAction} className="rounded-[1.75rem] border border-[#b45353]/18 bg-[#fff1f1]/68 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#b45353]/22 bg-white/70 px-3 py-1.5 text-xs font-black text-[#8f2c2c]">
            <AlertTriangle size={15} /> عملیات مالی گروهی
          </div>
          <h2 className="mt-3 text-xl font-black">اجرای تسویه گروهی</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#7d4d4d]">
            بعد از اجرا، برای مانده‌ها دریافت تسویه نهایی ثبت می‌شود، قراردادها تکمیل می‌شوند و صورتحساب‌های موجود به وضعیت تسویه‌شده می‌روند. قبل از اجرا از دیتابیس بکاپ بگیر؛ چون ظاهراً هنوز ماشین زمان در بسته npm نصب نمی‌شود.
          </p>
          <input type="hidden" name="cutoffDate" value={cutoffInput} />
          <label className="mt-4 grid gap-1.5 text-xs font-black text-[#172033]">
            <span>یادداشت اختیاری</span>
            <textarea name="note" rows={3} className="rounded-2xl border border-[#d8c08b]/65 bg-white px-3 py-3 text-sm font-bold text-[#111827] outline-none focus:border-[#17483f]/50" placeholder="مثلاً تسویه قراردادهای قدیمی قبل از شروع استفاده رسمی از سامانه" />
          </label>
          <label className="mt-3 grid gap-1.5 text-xs font-black text-[#172033]">
            <span>عبارت تایید</span>
            <input name="confirmation" className="rounded-2xl border border-[#b45353]/24 bg-white px-3 py-3 text-sm font-black text-[#111827] outline-none focus:border-[#b45353]/45" placeholder="تسویه گروهی" />
          </label>
          <button type="submit" disabled={!cutoffDate || affectedCount <= 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 text-sm font-black text-[#fff8ea] shadow-[0_16px_38px_rgba(17,24,39,0.18)] transition enabled:hover:border-[#c7a15a] disabled:cursor-not-allowed disabled:opacity-45">
            <CheckCircle2 size={17} /> تسویه همه قراردادهای این بازه
          </button>
        </form>
      </section>
    </SettingsPageShell>
  );
}

function SummaryCard({ icon, label, value, featured = false }: { icon: ReactNode; label: string; value: string; featured?: boolean }) {
  return (
    <div className={`rounded-[1.35rem] border p-4 text-[#111827] shadow-[0_12px_36px_rgba(17,24,39,0.055)] ${featured ? "border-[#111827]/18 bg-[#111827] text-[#fff8ea]" : "border-[#d8c08b]/58 bg-[#fff9ee]/94"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`flex size-10 items-center justify-center rounded-2xl ${featured ? "bg-white/10 text-[#f0dba9]" : "bg-[#111827] text-[#f0dba9]"}`}>{icon}</span>
        <p className="text-lg font-black">{value}</p>
      </div>
      <p className={`mt-3 text-xs font-black ${featured ? "text-[#f0dba9]" : "text-[#7d6841]"}`}>{label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/48 bg-white/62 px-3 py-3 text-center">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-base font-black text-[#111827]">{value}</p>
    </div>
  );
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "warning" | "danger" }) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]"
      : tone === "warning"
        ? "border-[#c7a15a]/32 bg-[#fff7e6] text-[#7a4a12]"
        : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]";

  return <div className={`rounded-3xl border px-5 py-4 text-sm font-black ${className}`}>{children}</div>;
}
