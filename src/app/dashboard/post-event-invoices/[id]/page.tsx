import { ArrowRight, Copy, FileText, LockKeyhole, ReceiptText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireTenantMember } from "@/lib/auth/session";
import { createPostEventInvoiceCustomerLinkAction } from "@/lib/actions/post-event-invoice-customer-actions";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPostEventInvoiceById } from "@/lib/post-event-invoices/data";
import { getInvoiceSettlementMarkers } from "@/lib/owner-settlements/data";
import { getCustomerInvoiceFeedbackSummary } from "@/lib/post-event-invoice-customer/options";
import { postEventInvoiceLineTypeLabels } from "@/lib/post-event-invoices/options";
import { toNumber } from "@/lib/payments/display";
import { IssuedInvoiceSummary, InvoiceTotals } from "@/components/dashboard/post-event-invoices/post-event-invoice-summary";

export default async function PostEventInvoiceViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ issued?: string; createdToken?: string; link?: string; error?: string }>;
}) {
  const membership = await requireTenantMember();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getPostEventInvoiceById({ tenantId: membership.tenantId, invoiceId: id });
  const settlementMarkers = await getInvoiceSettlementMarkers(id);

  if (!invoice) {
    return (
      <section className="rounded-[1.55rem] border border-[#b45353]/24 bg-[#fff1f1] p-5 text-[#8f2c2c]" dir="rtl">
        <h1 className="text-xl font-black">صورتحساب پیدا نشد.</h1>
        <p className="mt-2 text-sm font-bold leading-7">این صورتحساب وجود ندارد یا به فضای کاری شما تعلق ندارد.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/post-event-invoices" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          <ArrowRight size={15} />
          بازگشت به صورتحساب‌ها
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            <ReceiptText size={15} />
            مشاهده صورتحساب بعد از مراسم
          </span>
          <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
            لینک امن مشتری · فاز ۳۱
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">صورتحساب بعد از مراسم</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
          این صفحه برای مشاهده داخلی، ساخت لینک امن مشتری و کنترل محرمانه گزارش‌های خارج از فاکتور است؛ پرداخت آنلاین و تسویه مالک هنوز اجرا نمی‌شود.
        </p>
      </div>

      {query.issued ? (
        <div className="rounded-[1.35rem] border border-[#25a46d]/24 bg-[#edfdf4] p-4 text-sm font-black leading-7 text-[#17483f]">
          صورتحساب بعد از مراسم صادر شد.
        </div>
      ) : null}

      {query.createdToken ? (
        <div className="rounded-[1.35rem] border border-[#25a46d]/24 bg-[#edfdf4] p-4 text-sm font-black leading-7 text-[#17483f]">
          لینک امن مشتری ساخته شد. برای ارسال دستی از این مسیر استفاده کنید:
          <code className="mx-2 rounded-xl bg-white/70 px-2 py-1 text-xs" dir="ltr">/portal/invoices/{query.createdToken}</code>
        </div>
      ) : null}
      {query.link === "exists" ? (
        <div className="rounded-[1.35rem] border border-[#c7a15a]/34 bg-[#fff7e6] p-4 text-sm font-black leading-7 text-[#7a4a12]">
          برای این صورتحساب یک لینک فعال مشتری از قبل وجود دارد.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-[1.35rem] border border-[#b42318]/25 bg-[#fef3f2] p-4 text-sm font-black leading-7 text-[#7a271a]">
          ساخت لینک فقط برای صورتحساب صادرشده مجاز است.
        </div>
      ) : null}

      {settlementMarkers.length > 0 ? (
        <div className="rounded-[1.35rem] border border-[#25a46d]/24 bg-[#edfdf4] p-4 text-sm font-black leading-7 text-[#17483f]">
          {settlementMarkers.some((marker) => marker.settlement.status === "LOCKED")
            ? `این صورتحساب در تسویه قفل‌شده ماه ${settlementMarkers.filter((marker) => marker.settlement.status === "LOCKED").map((marker) => `${marker.settlement.settlementYear}/${marker.settlement.settlementMonth}`).join("، ")} لحاظ شده است.`
            : `این صورتحساب در تسویه ماهانه مالک لحاظ شده است: ${settlementMarkers.map((marker) => `ماه ${marker.settlement.settlementYear}/${marker.settlement.settlementMonth}`).join("، ")}`}
        </div>
      ) : (
        <div className="rounded-[1.35rem] border border-[#c7a15a]/34 bg-[#fff7e6] p-4 text-sm font-black leading-7 text-[#7a4a12]">
          این صورتحساب هنوز در تسویه ماهانه مالک لحاظ نشده است.
        </div>
      )}

      <CustomerInvoiceLinkPanel invoice={invoice} />

      <IssuedInvoiceSummary invoice={invoice} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-center gap-2">
            <FileText size={20} />
            <h2 className="text-xl font-black">ردیف‌های صورتحساب</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {invoice.lines.map((line) => (
              <div key={line.id} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 lg:grid-cols-[1.3fr_.7fr_.8fr_.8fr]">
                <div>
                  <p className="text-sm font-black text-[#111827]">{line.title}</p>
                  <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
                    {postEventInvoiceLineTypeLabels[line.lineType]} {line.isLockedFromContract ? "· قفل‌شده از قرارداد" : ""}
                  </p>
                  {line.description ? <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{line.description}</p> : null}
                </div>
                <span className="text-sm font-black text-[#17483f]">{formatPersianNumber(toNumber(line.quantity))}</span>
                <span className="text-sm font-black text-[#17483f]">{formatIRR(toNumber(line.unitAmount))}</span>
                <span className="text-sm font-black text-[#111827]">{formatIRR(toNumber(line.totalAmount))}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#111827]/12 bg-[#111827]/7 px-4 py-3 text-xs font-black text-[#172033]">
            <LockKeyhole size={15} />
            بعد از صدور، ویرایش عادی در فاز ۳۰ غیرفعال است.
          </p>
        </section>
        <InvoiceTotals invoice={invoice} />
      </div>
    </section>
  );
}


function CustomerInvoiceLinkPanel({ invoice }: { invoice: NonNullable<Awaited<ReturnType<typeof getPostEventInvoiceById>>> }) {
  const activeLink = invoice.accessLinks?.find((link) => !link.revokedAt) ?? null;
  const feedback = invoice.customerFeedbacks?.[0] ?? activeLink?.feedbacks?.[0] ?? null;
  const summary = getCustomerInvoiceFeedbackSummary({
    hasLink: Boolean(activeLink),
    feedbackStatus: feedback?.feedbackStatus ?? null,
    hasMismatch: feedback?.hasMismatch ?? null,
    hasOffInvoicePayment: feedback?.hasOffInvoicePayment ?? null,
  });

  return (
    <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#172033] text-[#fff8ea]"><ShieldCheck size={18} /></span>
          <div>
            <h2 className="text-xl font-black">لینک امن بررسی صورتحساب مشتری</h2>
            <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">وضعیت: {summary}</p>
          </div>
        </div>
        {activeLink ? (
          <div className="rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/76 px-4 py-3 text-xs font-black text-[#17483f]">
            پیش‌نمایش توکن: {activeLink.tokenPreview} · بازدید: {activeLink.viewCount}
          </div>
        ) : invoice.status === "ISSUED" ? (
          <form action={createPostEventInvoiceCustomerLinkAction}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea]">
              <Copy size={16} />
              ساخت لینک امن مشتری
            </button>
          </form>
        ) : null}
      </div>
      <p className="mt-3 text-xs font-bold leading-6 text-[#7d6841]">
        لینک مشتری فقط صورتحساب صادرشده همین قرارداد را نشان می‌دهد و امکان ویرایش مبلغ، مشاهده یادداشت داخلی یا دسترسی به داشبورد ندارد. ارسال خارجی پیامک/تلگرام در فاز ۳۱ اضافه نشده است.
      </p>
    </section>
  );
}
