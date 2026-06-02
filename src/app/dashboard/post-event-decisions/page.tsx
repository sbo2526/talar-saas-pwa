import { ArrowLeft, CalendarCheck2, CheckCircle2, FileSignature, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  markPostEventCancellationAction,
  markPostEventHeldAction,
  markPostEventRescheduleAction,
} from "@/lib/actions/post-event-decision-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliWeekday, toLatinDigits, toPersianDigits } from "@/lib/date/jalali";
import { formatPersianNumber } from "@/lib/formatters";
import {
  getContractsRequiringPostEventDecision,
  getPostEventDecisionGateSummary,
  type PostEventDecisionContract,
} from "@/lib/post-event-decisions/data";
import { getRescheduleRulePersianText } from "@/lib/post-event-decisions/rules";

export default async function PostEventDecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ contractId?: string; flow?: string; saved?: string; contract?: string; error?: string }>;
}) {
  const membership = await requireTenantMember();
  const params = await searchParams;
  const [contracts, summary] = await Promise.all([
    getContractsRequiringPostEventDecision({ tenantId: membership.tenantId, take: 50 }),
    getPostEventDecisionGateSummary({ tenantId: membership.tenantId }),
  ]);
  const selectedContract = contracts.find((contract) => contract.id === params.contractId) ?? contracts[0] ?? null;
  const showNotHeldFlow = params.flow === "not-held" && selectedContract;

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <CalendarCheck2 size={15} />
              تعیین تکلیف بعد از مراسم
            </span>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">
              تعیین تکلیف مراسم‌های گذشته
            </h1>
            <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
              هر قرارداد گذشته باید فقط با یکی از دو تصمیم اصلی مشخص شود: مراسم برگزار شده یا برگزار نشده است. صدور صورتحساب، پرسشنامه مشتری و تسویه مالک در فازهای بعدی انجام می‌شود.
            </p>
          </div>
          <div className="grid gap-2 rounded-[1.4rem] border border-[#e8c478]/28 bg-[#111827] p-4 text-[#fff8ea] sm:min-w-72">
            <StatRow label="بدون تعیین تکلیف" value={summary.unresolvedCount} />
            <StatRow label="انتقال دیرهنگام برای بررسی مالک" value={summary.lateRescheduleOwnerReviewCount} />
          </div>
        </div>
      </div>

      {params.saved ? <SavedNotice saved={params.saved} contractNo={params.contract} /> : null}
      {params.error ? <ErrorNotice error={params.error} /> : null}

      {contracts.length === 0 ? (
        <section className="rounded-[1.75rem] border border-[#25a46d]/24 bg-[#edfdf4] p-5 text-[#17483f] shadow-[0_18px_56px_rgba(17,24,39,0.07)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 shrink-0" size={24} />
            <div>
              <h2 className="text-xl font-black">همه مراسم‌های گذشته تعیین تکلیف شده‌اند.</h2>
              <p className="mt-2 text-sm font-bold leading-7">فعلاً قرارداد گذشته بدون تصمیم بعد از مراسم وجود ندارد.</p>
              <Link href="/dashboard" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#25a46d]/24 bg-white/65 px-4 py-2.5 text-sm font-black text-[#17483f]">
                بازگشت به داشبورد
                <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
          <DecisionPanel contract={selectedContract} showNotHeldFlow={Boolean(showNotHeldFlow)} />
          <ContractsList contracts={contracts} selectedId={selectedContract?.id} />
        </div>
      )}
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#f0dba9]/16 bg-white/[0.06] px-4 py-3">
      <span className="text-xs font-black text-[#f0dba9]">{label}</span>
      <span className="text-lg font-black text-[#fff8ea]">{formatPersianNumber(value)}</span>
    </div>
  );
}

function DecisionPanel({
  contract,
  showNotHeldFlow,
}: {
  contract: PostEventDecisionContract | null;
  showNotHeldFlow: boolean;
}) {
  if (!contract) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
          <FileSignature size={14} />
          قرارداد شماره {toPersianDigits(contract.contractNo)}
        </span>
        <span className="rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#7a4a12]">
          {formatJalaliWeekday(contract.eventDate)}، {formatJalaliDate(contract.eventDate)}
        </span>
      </div>

      <h2 className="mt-4 text-xl font-black leading-9 sm:text-2xl">
        آیا مراسم قرارداد شماره {toPersianDigits(contract.contractNo)} برای مشتری {contract.customer.fullName} در تاریخ {formatJalaliDate(contract.eventDate)} برگزار شده است؟
      </h2>

      <div className="mt-4 grid gap-3 rounded-[1.35rem] border border-[#d8c08b]/52 bg-[#fff8ea]/70 p-4 sm:grid-cols-2">
        <InfoItem label="مشتری" value={contract.customer.fullName} />
        <InfoItem label="تالار" value={contract.hall?.name ?? "ثبت نشده"} />
        <InfoItem label="تعداد مهمان" value={`${formatPersianNumber(contract.guestCount)} نفر`} />
        <InfoItem label="شماره قرارداد" value={toPersianDigits(contract.contractNo)} />
      </div>

      {!showNotHeldFlow ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <form action={markPostEventHeldAction} className="grid gap-3 rounded-[1.35rem] border border-[#25a46d]/24 bg-[#edfdf4] p-4">
            <input type="hidden" name="contractId" value={contract.id} />
            <label className="grid gap-2 text-sm font-black text-[#17483f]">
              توضیح اپراتور
              <textarea name="operatorNote" rows={3} className="input-luxury resize-none text-sm" placeholder="اختیاری؛ توضیح کوتاه درباره وضعیت مراسم" />
            </label>
            <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 py-3 text-sm font-black text-white">
              <CheckCircle2 size={18} />
              بله، برگزار شده
            </button>
          </form>

          <Link href={`/dashboard/post-event-decisions?contractId=${encodeURIComponent(contract.id)}&flow=not-held`} className="grid place-items-center rounded-[1.35rem] border border-[#b45353]/24 bg-[#fff1f1] p-4 text-center text-sm font-black leading-7 text-[#8f2c2c] transition hover:border-[#b45353]/40">
            <span className="flex flex-col items-center gap-3">
              <ShieldAlert size={26} />
              خیر، برگزار نشده
            </span>
          </Link>
        </div>
      ) : (
        <NotHeldChoices contract={contract} />
      )}
    </section>
  );
}

function NotHeldChoices({ contract }: { contract: PostEventDecisionContract }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-[1.25rem] border border-[#c7a15a]/38 bg-[#fff7e6] px-4 py-3 text-sm font-black leading-7 text-[#7a4a12]">
        در این مرحله فقط یکی از دو مسیر برگزارنشدن قابل ثبت است: کنسلی قرارداد یا انتقال مراسم به تاریخ دیگر.
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <form action={markPostEventCancellationAction} className="grid gap-3 rounded-[1.35rem] border border-[#b45353]/24 bg-[#fff1f1] p-4">
          <input type="hidden" name="contractId" value={contract.id} />
          <h3 className="text-lg font-black text-[#8f2c2c]">کنسلی قرارداد</h3>
          <p className="text-sm font-bold leading-7 text-[#8f2c2c]">
            محاسبه کنسلی در این فاز تغییر نمی‌کند. این تصمیم فقط قرارداد را وارد مسیر کنسلی می‌کند.
          </p>
          <label className="grid gap-2 text-sm font-black text-[#8f2c2c]">
            توضیح اپراتور
            <textarea name="operatorNote" rows={3} className="input-luxury resize-none text-sm" placeholder="اختیاری؛ دلیل یا توضیح کنسلی" />
          </label>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#8f2c2c] px-4 py-3 text-sm font-black text-white">
            کنسلی قرارداد
          </button>
        </form>

        <form action={markPostEventRescheduleAction} className="grid gap-3 rounded-[1.35rem] border border-[#c7a15a]/38 bg-[#fff8ea] p-4">
          <input type="hidden" name="contractId" value={contract.id} />
          <h3 className="text-lg font-black text-[#7a4a12]">انتقال مراسم به تاریخ دیگر</h3>
          <p className="text-sm font-bold leading-7 text-[#7a4a12]">
            {getRescheduleRulePersianText()} چون این صفحه بعد از تاریخ مراسم فعال می‌شود، انتقال جدید از این صفحه دیرهنگام ثبت می‌شود مگر سابقه معتبر قبلی وجود داشته باشد.
          </p>
          <label className="grid gap-2 text-sm font-black text-[#7a4a12]">
            تاریخ جدید مراسم
            <input name="rescheduledToDate" type="date" className="input-luxury text-sm" inputMode="numeric" />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#7a4a12]">
            توضیح اپراتور
            <textarea name="operatorNote" rows={3} className="input-luxury resize-none text-sm" placeholder="اختیاری؛ توضیح درباره انتقال تاریخ" />
          </label>
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea]">
            انتقال مراسم به تاریخ دیگر
          </button>
        </form>
      </div>
    </div>
  );
}

function ContractsList({ contracts, selectedId }: { contracts: PostEventDecisionContract[]; selectedId?: string }) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-28">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-[#111827]">فهرست قراردادها</h2>
          <span className="rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7a4a12]">
            {formatPersianNumber(contracts.length)} مورد
          </span>
        </div>
        <div className="mt-4 grid gap-2.5">
          {contracts.map((contract) => {
            const isSelected = contract.id === selectedId;
            return (
              <Link
                key={contract.id}
                href={`/dashboard/post-event-decisions?contractId=${encodeURIComponent(contract.id)}`}
                className={`rounded-2xl border p-3 transition hover:border-[#c7a15a]/70 ${isSelected ? "border-[#111827]/18 bg-[#111827] text-[#fff8ea]" : "border-[#d8c08b]/52 bg-[#fff8ea]/72 text-[#111827]"}`}
              >
                <p className="text-sm font-black">قرارداد {toPersianDigits(contract.contractNo)}</p>
                <p className={`mt-1 text-xs font-bold leading-6 ${isSelected ? "text-[#f0dba9]" : "text-[#6d5f49]"}`}>
                  {contract.customer.fullName} · {formatJalaliDate(contract.eventDate)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black leading-7 text-[#111827]">{value}</p>
    </div>
  );
}

function SavedNotice({ saved, contractNo }: { saved: string; contractNo?: string }) {
  const contractLabel = contractNo ? `قرارداد ${toPersianDigits(toLatinDigits(contractNo))}` : "قرارداد";
  const messages: Record<string, string> = {
    held: `${contractLabel} به عنوان برگزار شده ثبت شد. صورتحساب بعد از مراسم در فاز بعدی صادر خواهد شد.`,
    cancellation: `${contractLabel} به عنوان برگزارنشده و نیازمند ورود به فرآیند کنسلی ثبت شد.`,
    "reschedule-owner-review": `انتقال تاریخ بعد از موعد یا کمتر از ۱۰ روز قبل از مراسم ثبت شده و نیازمند بررسی مالک است.`,
  };

  return (
    <div className="rounded-[1.25rem] border border-[#25a46d]/24 bg-[#edfdf4] px-4 py-3 text-sm font-black leading-7 text-[#17483f]">
      {messages[saved] ?? "تعیین تکلیف بعد از مراسم ثبت شد."}
    </div>
  );
}

function ErrorNotice({ error }: { error: string }) {
  const messages: Record<string, string> = {
    "invalid-request": "درخواست تعیین تکلیف معتبر نیست.",
    "not-found": "قرارداد انتخاب‌شده پیدا نشد یا قبلاً تعیین تکلیف شده است.",
    "reschedule-date-required": "برای انتقال مراسم، تاریخ جدید را وارد کنید.",
    "reschedule-date-invalid": "تاریخ جدید مراسم معتبر نیست.",
  };

  return (
    <div className="rounded-[1.25rem] border border-[#b45353]/24 bg-[#fff1f1] px-4 py-3 text-sm font-black leading-7 text-[#8f2c2c]">
      {messages[error] ?? "عملیات تعیین تکلیف انجام نشد."}
    </div>
  );
}
