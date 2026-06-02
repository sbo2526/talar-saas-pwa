import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole, PlusCircle, ReceiptText, Save, SendHorizonal, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  createPostEventInvoiceDraftAction,
  issuePostEventInvoiceAction,
  savePostEventInvoiceDraftAction,
} from "@/lib/actions/post-event-invoice-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPostEventDecisionStatusLabel } from "@/lib/post-event-decisions/options";
import { getPostEventInvoiceStatusLabel } from "@/lib/post-event-invoices/options";
import { getPostEventInvoiceContract } from "@/lib/post-event-invoices/data";
import { calculatePostEventInvoiceTotals } from "@/lib/post-event-invoices/rules";
import { toNumber } from "@/lib/payments/display";
import { InvoiceContractSummary, InvoiceTotals } from "@/components/dashboard/post-event-invoices/post-event-invoice-summary";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; saved?: string; error?: string }>;
};

function getInvoiceErrorMessage(error: string) {
  if (error === "held-required" || error === "HELD_DECISION_REQUIRED") return "ابتدا باید وضعیت بعد از مراسم به عنوان «برگزار شده» ثبت شود.";
  if (error === "invalid-guest-count" || error === "ACTUAL_GUEST_REQUIRED") return "تعداد نفرات قرارداد برای صدور صورتحساب معتبر نیست.";
  if (error === "invalid-final-amount") return "مبلغ نهایی قرارداد برای صدور صورتحساب معتبر نیست.";
  if (error === "PER_GUEST_BELOW_SUGGESTED") return "نرخ هر نفر نمی‌تواند کمتر از نرخ پیشنهادی قرارداد باشد.";
  if (error === "INVALID_EXTRA_SERVICE_LINE") return "ردیف خدمات اضافه کامل نیست. عنوان، تعداد و مبلغ واحد را درست وارد کنید.";
  if (error === "INVOICE_NOT_EDITABLE") return "این صورتحساب قابل ویرایش نیست یا قبلاً صادر شده است.";
  return "درخواست صورتحساب معتبر نبود یا دسترسی شما مجاز نیست.";
}

export default async function ContractPostEventInvoicePage({ params, searchParams }: PageProps) {
  const membership = await requireTenantMember();
  const { id } = await params;
  const query = await searchParams;
  const contract = await getPostEventInvoiceContract({ tenantId: membership.tenantId, contractId: id });

  if (!contract) {
    return <BlockedState title="قرارداد پیدا نشد" message="این قرارداد وجود ندارد یا به فضای کاری شما تعلق ندارد." />;
  }

  const invoice = contract.postEventInvoice;
  const hasHeldDecision = contract.postEventDecision?.decisionStatus === "HELD";

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.20),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2.25rem] sm:p-7">
        <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          <ArrowRight size={15} />
          بازگشت به قرارداد
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            <ReceiptText size={15} />
            صورتحساب بعد از مراسم
          </span>
          <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
            وضعیت تصمیم: {getPostEventDecisionStatusLabel(contract.postEventDecision?.decisionStatus)}
          </span>
          {invoice ? (
            <span className="rounded-full border border-[#25a46d]/24 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              {getPostEventInvoiceStatusLabel(invoice.status)} · {invoice.invoiceNumber}
            </span>
          ) : null}
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">صدور صورتحساب بعد از مراسم</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
          این صورتحساب فقط از قرارداد برگزارشده ساخته می‌شود، مبلغ قرارداد را snapshot می‌کند و هیچ مبلغی را در قرارداد اصلی تغییر نمی‌دهد.
        </p>
      </div>

      {query.created ? <Notice tone="success">پیش‌نویس صورتحساب بعد از مراسم ساخته شد.</Notice> : null}
      {query.saved ? <Notice tone="success">پیش‌نویس صورتحساب ذخیره شد.</Notice> : null}
      {query.error ? <Notice tone="danger">{getInvoiceErrorMessage(query.error)}</Notice> : null}

      <InvoiceContractSummary contract={contract} />

      {!hasHeldDecision ? (
        <BlockedState title="صورتحساب فعلاً مجاز نیست" message="ابتدا باید وضعیت بعد از مراسم به عنوان «برگزار شده» ثبت شود." href="/dashboard/post-event-decisions" actionLabel="تعیین تکلیف بعد از مراسم" />
      ) : null}

      {hasHeldDecision && !invoice ? (
        <section className="rounded-[1.55rem] border border-[#25a46d]/24 bg-[#edfdf4] p-5 text-[#17483f] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-start gap-3">
            <PlusCircle className="mt-1 shrink-0" size={24} />
            <div>
              <h2 className="text-xl font-black">این قرارداد آماده ساخت پیش‌نویس صورتحساب است.</h2>
              <p className="mt-2 text-sm font-bold leading-7">بعد از ساخت پیش‌نویس، آیتم‌های قرارداد به صورت قفل‌شده وارد صورتحساب می‌شوند.</p>
              <form action={createPostEventInvoiceDraftAction} className="mt-4">
                <input type="hidden" name="contractId" value={contract.id} />
                <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-5 py-3 text-sm font-black text-white">
                  ساخت پیش‌نویس صورتحساب
                  <ArrowLeft size={18} />
                </button>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {invoice?.status === "DRAFT" ? <DraftInvoiceForm contract={contract} invoice={invoice} /> : null}
      {invoice?.status === "ISSUED" ? (
        <Notice tone="success">
          صورتحساب بعد از مراسم صادر شده است. برای مشاهده نسخه صادرشده به صفحه مشاهده صورتحساب بروید.
          <Link href={`/dashboard/post-event-invoices/${invoice.id}`} className="mr-3 inline-flex items-center gap-1 font-black underline">
            مشاهده صورتحساب <ArrowLeft size={14} />
          </Link>
        </Notice>
      ) : null}
    </section>
  );
}

function DraftInvoiceForm({ contract, invoice }: { contract: NonNullable<Awaited<ReturnType<typeof getPostEventInvoiceContract>>>; invoice: NonNullable<NonNullable<Awaited<ReturnType<typeof getPostEventInvoiceContract>>>["postEventInvoice"]> }) {
  const suggestedPerGuestAmount = toNumber(invoice.suggestedPerGuestAmount);
  const actualGuestCount = invoice.actualGuestCount ?? contract.guestCount;
  const previewTotals = calculatePostEventInvoiceTotals({
    contractFinalAmountSnapshot: toNumber(invoice.contractFinalAmountSnapshot),
    contractGuestCountSnapshot: invoice.contractGuestCountSnapshot,
    finalPerGuestAmount: toNumber(invoice.finalPerGuestAmount),
    actualGuestCount,
    extraServiceAmount: toNumber(invoice.extraServiceAmount),
    managerApprovedDeductionAmount: 0,
    previousPaymentsAmount: toNumber(invoice.previousPaymentsAmount),
  });
  const contractLines = invoice.lines.filter((line) => line.lineType === "CONTRACT_ITEM");
  const extraServices = invoice.lines.filter((line) => line.lineType === "EXTRA_SERVICE");

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <input type="hidden" name="contractId" value={contract.id} />
      <div className="space-y-5">
        <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <h2 className="text-lg font-black sm:text-2xl">تسویه تعداد مهمان</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <ReadonlyBox label="تعداد قرارداد" value={`${formatPersianNumber(invoice.contractGuestCountSnapshot)} نفر`} />
            <ReadonlyBox label="مبلغ قرارداد" value={formatIRR(toNumber(invoice.contractFinalAmountSnapshot))} />
            <ReadonlyBox label="نرخ پیشنهادی هر نفر" value={formatIRR(suggestedPerGuestAmount)} />
            <label className="grid gap-2 text-sm font-black text-[#17483f]">
              تعداد واقعی مهمان
              <input name="actualGuestCount" type="number" min="0" defaultValue={invoice.actualGuestCount ?? ""} required className="input-luxury" />
            </label>
            <label className="grid gap-2 text-sm font-black text-[#17483f]">
              نرخ نهایی هر نفر
              <input name="finalPerGuestAmount" type="number" min={suggestedPerGuestAmount} defaultValue={toNumber(invoice.finalPerGuestAmount)} className="input-luxury" />
            </label>
            <ReadonlyBox label="نفرات اضافه فعلی" value={`${formatPersianNumber(previewTotals.extraGuestCount)} نفر`} />
          </div>
          <p className="mt-4 rounded-2xl border border-[#c7a15a]/34 bg-[#fff7e6] px-4 py-3 text-sm font-black leading-7 text-[#7a4a12]">
            تعداد واقعی کمتر از تعداد قرارداد ثبت شده است. مبلغ قرارداد به صورت خودکار کاهش پیدا نمی‌کند.
          </p>
        </section>

        <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <div className="flex items-center gap-2">
            <LockKeyhole size={18} />
            <h2 className="text-lg font-black sm:text-2xl">ردیف‌های قفل‌شده قرارداد</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {contractLines.length > 0 ? contractLines.map((line) => (
              <LineRow key={line.id} title={line.title} description="از قرارداد اصلی کپی شده و قابل حذف یا ویرایش نیست." quantity={toNumber(line.quantity)} unitAmount={toNumber(line.unitAmount)} totalAmount={toNumber(line.totalAmount)} locked />
            )) : <p className="text-sm font-bold text-[#6d5f49]">برای این قرارداد ردیف جداگانه‌ای ثبت نشده است؛ مبلغ پایه قرارداد همچنان در جمع صورتحساب لحاظ می‌شود.</p>}
          </div>
        </section>

        <section className="rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          <h2 className="text-lg font-black sm:text-2xl">خدمات اضافه</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">تا قبل از صدور، می‌توانید خدمات اضافه را وارد کنید. بعد از صدور، ردیف‌ها قفل می‌شوند.</p>
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => {
              const existing = extraServices[index];
              return (
                <div key={index} className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 lg:grid-cols-[1.3fr_.75fr_.75fr_1.2fr]">
                  <input name="extraServiceTitle" defaultValue={existing?.title ?? ""} className="input-luxury" placeholder="عنوان خدمات اضافه" />
                  <input name="extraServiceQuantity" type="number" min="0" step="0.01" defaultValue={existing ? toNumber(existing.quantity) : ""} className="input-luxury" placeholder="تعداد" />
                  <input name="extraServiceUnitAmount" type="number" min="0" defaultValue={existing ? toNumber(existing.unitAmount) : ""} className="input-luxury" placeholder="مبلغ واحد" />
                  <input name="extraServiceDescription" defaultValue={existing?.description ?? ""} className="input-luxury" placeholder="توضیح اختیاری" />
                </div>
              );
            })}
          </div>
        </section>

        <label className="grid gap-2 rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-sm font-black text-[#17483f] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
          توضیح اپراتور
          <textarea name="operatorNote" rows={3} defaultValue={invoice.operatorNote ?? ""} className="input-luxury resize-none text-sm" placeholder="اختیاری" />
        </label>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-28">
        <InvoiceTotals invoice={invoice} />
        <div className="grid gap-2 rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 shadow-[0_18px_60px_rgba(17,24,39,0.07)]">
          <button formAction={savePostEventInvoiceDraftAction} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#25a46d]/12 px-4 py-3 text-sm font-black text-[#17483f]">
            <Save size={18} />
            ذخیره پیش‌نویس
          </button>
          <button formAction={issuePostEventInvoiceAction} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-sm font-black text-[#fff8ea]">
            <SendHorizonal size={18} />
            صدور صورتحساب
          </button>
        </div>
      </aside>
    </form>
  );
}

function LineRow({ title, description, quantity, unitAmount, totalAmount, locked }: { title: string; description?: string; quantity: number; unitAmount: number; totalAmount: number; locked?: boolean }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3 lg:grid-cols-[1.4fr_.6fr_.8fr_.8fr]">
      <div>
        <p className="text-sm font-black text-[#111827]">{title}</p>
        {description ? <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{description}</p> : null}
      </div>
      <span className="text-sm font-black text-[#17483f]">{formatPersianNumber(quantity)}</span>
      <span className="text-sm font-black text-[#17483f]">{formatIRR(unitAmount)}</span>
      <span className="text-sm font-black text-[#111827]">{formatIRR(totalAmount)} {locked ? "· قفل" : ""}</span>
    </div>
  );
}

function ReadonlyBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-3">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <div className={`rounded-[1.35rem] border p-4 text-sm font-black leading-7 ${tone === "success" ? "border-[#25a46d]/24 bg-[#edfdf4] text-[#17483f]" : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {children}
    </div>
  );
}

function BlockedState({ title, message, href, actionLabel }: { title: string; message: string; href?: string; actionLabel?: string }) {
  return (
    <section className="rounded-[1.55rem] border border-[#b45353]/24 bg-[#fff1f1] p-5 text-[#8f2c2c] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6" dir="rtl">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-1 shrink-0" size={24} />
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm font-bold leading-7">{message}</p>
          {href && actionLabel ? (
            <Link href={href} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#111827] px-4 py-2.5 text-sm font-black text-[#fff8ea]">
              {actionLabel}
              <ArrowLeft size={16} />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
