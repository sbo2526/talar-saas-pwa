import type { ReactNode } from "react";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPostEventDecisionStatusLabel } from "@/lib/post-event-decisions/options";
import { getPostEventInvoiceStatusLabel } from "@/lib/post-event-invoices/options";
import { toNumber } from "@/lib/payments/display";
import type { PostEventInvoiceContract, PostEventInvoiceWithContract } from "@/lib/post-event-invoices/data";

export function InvoiceContractSummary({ contract }: { contract: PostEventInvoiceContract }) {
  return (
    <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6" dir="rtl">
      <h2 className="text-lg font-black sm:text-2xl">خلاصه قرارداد مراسم</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="شماره قرارداد" value={toPersianDigits(contract.contractNo)} />
        <InfoItem label="مشتری" value={contract.customer.fullName} />
        <InfoItem label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
        <InfoItem label="تالار / سالن" value={[contract.hall?.name, contract.salon?.name].filter(Boolean).join(" / ") || "ثبت نشده"} />
        <InfoItem label="پکیج" value={contract.packageName || "ثبت نشده"} />
        <InfoItem label="تعداد قرارداد" value={`${formatPersianNumber(contract.guestCount)} نفر`} />
        <InfoItem label="مبلغ نهایی قرارداد" value={formatIRR(toNumber(contract.finalTotal))} />
        <InfoItem label="وضعیت بعد از مراسم" value={getPostEventDecisionStatusLabel(contract.postEventDecision?.decisionStatus)} />
      </div>
    </section>
  );
}

export function IssuedInvoiceSummary({ invoice }: { invoice: PostEventInvoiceWithContract }) {
  return (
    <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#17483f]">شماره صورتحساب</p>
          <h2 className="mt-1 text-2xl font-black">{toPersianDigits(invoice.invoiceNumber)}</h2>
        </div>
        <span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
          {getPostEventInvoiceStatusLabel(invoice.status)}
        </span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="قرارداد" value={toPersianDigits(invoice.contract.contractNo)} />
        <InfoItem label="مشتری" value={invoice.contract.customer.fullName} />
        <InfoItem label="تاریخ مراسم" value={formatJalaliDate(invoice.contract.eventDate)} />
        <InfoItem label="تاریخ صدور" value={invoice.issuedAt ? formatJalaliDateTime(invoice.issuedAt) : "صادر نشده"} />
        <InfoItem label="تعداد قرارداد" value={`${formatPersianNumber(invoice.contractGuestCountSnapshot)} نفر`} />
        <InfoItem label="تعداد واقعی" value={invoice.actualGuestCount === null ? "ثبت نشده" : `${formatPersianNumber(invoice.actualGuestCount)} نفر`} />
        <InfoItem label="نفرات اضافه" value={`${formatPersianNumber(invoice.extraGuestCount)} نفر`} />
        <InfoItem label="مانده نهایی" value={formatIRR(toNumber(invoice.finalBalanceAmount))} emphasis />
      </div>
    </section>
  );
}

export function InvoiceTotals({ invoice }: { invoice: PostEventInvoiceWithContract | NonNullable<PostEventInvoiceContract["postEventInvoice"]> }) {
  return (
    <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#111827] p-4 text-[#fff8ea] shadow-[0_18px_60px_rgba(17,24,39,0.13)] sm:rounded-[2rem] sm:p-6" dir="rtl">
      <h2 className="text-lg font-black sm:text-2xl">جمع صورتحساب</h2>
      <div className="mt-4 grid gap-2">
        <TotalRow label="مبلغ پایه قرارداد" value={formatIRR(toNumber(invoice.contractFinalAmountSnapshot))} />
        <TotalRow label="نفرات اضافه" value={formatIRR(toNumber(invoice.extraGuestAmount))} />
        <TotalRow label="خدمات اضافه" value={formatIRR(toNumber(invoice.extraServiceAmount))} />
        <TotalRow label="کسورات تأییدشده مدیر" value={formatIRR(toNumber(invoice.managerApprovedDeductionAmount))} muted />
        <TotalRow label="جمع صورتحساب" value={formatIRR(toNumber(invoice.invoiceTotalAmount))} strong />
        <TotalRow label="دریافت‌های قبلی" value={formatIRR(toNumber(invoice.previousPaymentsAmount))} />
        <TotalRow label="مانده نهایی" value={formatIRR(toNumber(invoice.finalBalanceAmount))} strong />
      </div>
      <p className="mt-4 rounded-2xl border border-[#f0dba9]/18 bg-white/[0.06] px-4 py-3 text-xs font-bold leading-6 text-[#f0dba9]">
        کسورات فقط در مراحل بعدی و با تأیید مالک/مدیر فعال می‌شود.
      </p>
    </section>
  );
}

function TotalRow({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${strong ? "border-[#f0dba9]/24 bg-[#f0dba9]/10" : "border-white/10 bg-white/[0.04]"}`}>
      <span className={`text-sm font-black ${muted ? "text-[#9b8b70]" : "text-[#f0dba9]"}`}>{label}</span>
      <span className="text-sm font-black text-[#fff8ea]">{value}</span>
    </div>
  );
}

export function InfoItem({ label, value, emphasis }: { label: string; value: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${emphasis ? "border-[#25a46d]/24 bg-[#25a46d]/10" : "border-[#d8c08b]/46 bg-[#fff8ea]/70"}`}>
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black leading-7 text-[#111827]">{value}</p>
    </div>
  );
}
