import { ArrowLeft, FileText, ReceiptText } from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getCustomerInvoiceFeedbackSummary } from "@/lib/post-event-invoice-customer/options";
import { getPostEventInvoiceStatusLabel, getPostEventInvoiceStatusTone } from "@/lib/post-event-invoices/options";
import { getPostEventInvoiceDashboardSummary, getPostEventInvoiceList } from "@/lib/post-event-invoices/data";
import { toNumber } from "@/lib/payments/display";

export default async function PostEventInvoicesPage() {
  const membership = await requireTenantMember();
  const [invoices, summary] = await Promise.all([
    getPostEventInvoiceList({ tenantId: membership.tenantId }),
    getPostEventInvoiceDashboardSummary({ tenantId: membership.tenantId }),
  ]);

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
          <ReceiptText size={15} />
          صورتحساب‌های بعد از مراسم
        </span>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">مدیریت صورتحساب بعد از مراسم</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
          فقط قراردادهایی که در تعیین تکلیف بعد از مراسم با وضعیت «برگزار شده» ثبت شده‌اند، وارد صدور صورتحساب می‌شوند.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Summary label="قراردادهای برگزارشده آماده صدور صورتحساب" value={summary.readyHeldCount} />
          <Summary label="پیش‌نویس‌ها" value={summary.draftCount} />
          <Summary label="صادرشده‌ها" value={summary.issuedCount} />
        </div>
      </div>

      <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <div className="flex items-center gap-2 text-[#111827]">
          <FileText size={20} />
          <h2 className="text-xl font-black">فهرست صورتحساب‌ها</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {invoices.length > 0 ? invoices.map((invoice) => {
            const tone = getPostEventInvoiceStatusTone(invoice.status);
            const link = invoice.accessLinks?.[0] ?? null;
            const feedback = invoice.customerFeedbacks?.[0] ?? link?.feedbacks?.[0] ?? null;
            const feedbackSummary = getCustomerInvoiceFeedbackSummary({
              hasLink: Boolean(link),
              feedbackStatus: feedback?.feedbackStatus ?? null,
              hasMismatch: feedback?.hasMismatch ?? null,
              hasOffInvoicePayment: feedback?.hasOffInvoicePayment ?? null,
            });
            return (
              <Link key={invoice.id} href={`/dashboard/post-event-invoices/${invoice.id}`} className="group grid gap-3 rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-4 text-[#111827] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/60 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black">صورتحساب {toPersianDigits(invoice.invoiceNumber)}</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">قرارداد {toPersianDigits(invoice.contract.contractNo)} · {invoice.contract.customer.fullName}</p>
                  <p className="mt-1 text-[11px] font-black leading-5 text-[#17483f]">وضعیت پاسخ مشتری: {feedbackSummary}</p>
                </div>
                <p className="text-sm font-black text-[#17483f]">{formatJalaliDate(invoice.contract.eventDate)}</p>
                <p className="text-sm font-black text-[#111827]">{formatIRR(toNumber(invoice.finalBalanceAmount))}</p>
                <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-black ${tone === "success" ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : tone === "warning" ? "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]" : "border-[#111827]/12 bg-[#111827]/7 text-[#172033]"}`}>
                  {getPostEventInvoiceStatusLabel(invoice.status)}
                  <ArrowLeft className="mr-1 transition group-hover:-translate-x-0.5" size={14} />
                </span>
              </Link>
            );
          }) : (
            <div className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-5 text-sm font-bold leading-7 text-[#6d5f49]">
              هنوز صورتحساب بعد از مراسم ثبت نشده است.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/72 p-4">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#111827]">{formatPersianNumber(value)}</p>
    </div>
  );
}
