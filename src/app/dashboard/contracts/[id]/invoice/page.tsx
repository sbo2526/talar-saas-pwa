import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { createPostEventInvoiceAction } from "@/lib/actions/invoice-actions";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliWeekday, toPersianDigits } from "@/lib/date/jalali";
import { calculatePostEventInvoice } from "@/lib/invoices/invoice-calculation";
import { getPrisma } from "@/lib/prisma";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

const invoiceErrorMessages: Record<string, string> = {
  "guest-count-below-contract": "تعداد نفرات واقعی نمی‌تواند کمتر از تعداد نفرات قرارداد باشد.",
  "manual-amount-required": "مبلغ فاکتور باید به صورت دستی و معتبر وارد شود.",
};

type ContractInvoicePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ postEvent?: string; invoice?: string }>;
};

export default async function ContractInvoicePage({ params, searchParams }: ContractInvoicePageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;

  const contract = await db.contract.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
      lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      payments: { select: { amount: true, type: true, status: true } },
      postEventConfirmation: { select: { status: true, invoiceRequired: true, confirmedAt: true } },
      invoice: { select: { id: true, invoiceNo: true, status: true } },
    },
  });

  if (!contract) {
    return <NotFound />;
  }

  if (contract.invoice) {
    return (
      <section className="space-y-5">
        <Notice tone="success">برای این قرارداد قبلاً صورتحساب صادر شده است.</Notice>
        <Link href={`/dashboard/invoices/${contract.invoice.id}`} className="btn-luxury-dark px-5 py-3">
          <ReceiptText size={18} />
          مشاهده صورتحساب {toPersianDigits(contract.invoice.invoiceNo)}
        </Link>
      </section>
    );
  }

  const canRegisterHeldForInvoice = !contract.postEventConfirmation &&
    (contract.status === "RESERVED" || contract.status === "CONFIRMED" || contract.status === "COMPLETED") &&
    contract.eventDate < new Date();

  if (contract.postEventConfirmation?.status !== "HELD" || !contract.postEventConfirmation.invoiceRequired) {
    return (
      <section className="space-y-5">
        <Notice tone="danger">
          صدور صورتحساب فقط بعد از ثبت قطعی «بله، برگزار شده» در تعیین‌تکلیف بعد از مراسم مجاز است.
        </Notice>
        {canRegisterHeldForInvoice ? (
          <div className="rounded-[1.35rem] border border-[#17483f]/18 bg-[#f1fbf5]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.08)] sm:rounded-[1.65rem] sm:p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#17483f]" />
              <h2 className="text-lg font-black text-[#17483f]">ثبت برگزاری و ادامه صدور فاکتور</h2>
            </div>
            <p className="mt-2 text-xs font-bold leading-6 text-[#17483f]">
              این قرارداد هنوز تعیین‌تکلیف بعد از مراسم ندارد. اگر مراسم برگزار شده، همین‌جا ثبت کنید تا صفحه پیش‌نمایش فاکتور فعال شود.
            </p>
            <form action={confirmPostEventAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="contractId" value={contract.id} />
              <input type="hidden" name="decision" value="HELD" />
              <input type="hidden" name="note" value="ثبت برگزاری از صفحه صدور فاکتور بعد از مراسم." />
              <div className="rounded-2xl border border-[#17483f]/18 bg-white/75 px-3 py-2 text-xs font-bold leading-6 text-[#17483f]">
                قرارداد {toPersianDigits(contract.contractNo)} · {contract.customer.fullName} · {formatJalaliDate(contract.eventDate)}
              </div>
              <ConfirmSubmitButton
                confirmTitle="ثبت برگزاری مراسم"
                confirmLabel="ثبت و ادامه صدور فاکتور"
                confirmTone="success"
                confirmMessage={`برای قرارداد ${toPersianDigits(contract.contractNo)} وضعیت مراسم «برگزار شده» ثبت می‌شود و سپس همین صفحه برای صدور فاکتور آماده خواهد شد.`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 py-2 text-xs font-black text-[#f7fff9] transition hover:bg-[#10372f]"
              >
                <CheckCircle2 size={16} />
                ثبت برگزاری
              </ConfirmSubmitButton>
            </form>
          </div>
        ) : null}
        <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-[#fff8ea] px-4 py-3 text-sm font-black text-[#7d6841]">
          <ArrowRight size={17} />
          بازگشت به قرارداد
        </Link>
      </section>
    );
  }

  const preview = calculatePostEventInvoice(contract, contract.guestCount);
  const statusMessage = query.invoice ? invoiceErrorMessages[query.invoice] : null;

  return (
    <section className="space-y-5 sm:space-y-7">
      {query.postEvent === "held" ? (
        <Notice tone="success">مراسم برگزار شده ثبت شد. حالا صورتحساب را از روی داده‌های قرارداد صادر کنید.</Notice>
      ) : null}
      {statusMessage ? <Notice tone="danger">{statusMessage}</Notice> : null}

      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_17rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <ReceiptText size={15} />
              صدور صورتحساب بعد از مراسم
            </span>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              قرارداد {toPersianDigits(contract.contractNo)} · {contract.customer.fullName}
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              {formatJalaliWeekday(contract.eventDate)}، {formatJalaliDate(contract.eventDate)} · {contract.eventTypeName || "نوع مراسم ثبت نشده"} · {formatPersianNumber(contract.guestCount)} نفر قرارداد
            </p>
          </div>
          <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
            <ArrowRight size={16} />
            قرارداد
          </Link>
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-4">
        <MetricCard icon={FileSignature} label="مبلغ قرارداد برای راهنما" value={formatIRR(preview.contractSubtotal)} />
        <MetricCard icon={UsersRound} label="تعداد قرارداد" value={`${formatPersianNumber(preview.guestCountContracted)} نفر`} />
        <MetricCard icon={ShieldCheck} label="دریافت‌شده تا امروز" value={formatIRR(preview.paidAmountAtIssue)} />
        <MetricCard icon={ReceiptText} label="قیمت فاکتور" value="ورود دستی" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
          <div className="flex items-center gap-2">
            <FileSignature size={18} className="text-[#7d6841]" />
            <h2 className="text-lg font-black text-[#111827]">اطلاعات قرارداد برای راهنمای صدور</h2>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-[#6d5f49]">
            این ردیف‌ها فقط برای دیدن سابقه قرارداد نمایش داده می‌شوند. مبلغ فاکتور از این ردیف‌ها محاسبه نمی‌شود و باید دستی وارد شود.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#d8c08b]/58">
            <div className="grid grid-cols-[minmax(0,1fr)_7rem_9rem] gap-2 bg-[#17483f] px-3 py-2 text-xs font-black text-[#fff8ea]">
              <span>شرح</span>
              <span>تعداد</span>
              <span>مبلغ</span>
            </div>
            {preview.lines.filter((line) => line.sourceType === "CONTRACT_LINE").length > 0 ? (
              preview.lines.filter((line) => line.sourceType === "CONTRACT_LINE").map((line) => (
                <div key={`${line.contractLineItemId}-${line.name}`} className="grid grid-cols-[minmax(0,1fr)_7rem_9rem] gap-2 border-t border-[#d8c08b]/45 bg-white/72 px-3 py-2.5 text-xs font-bold text-[#111827]">
                  <div className="min-w-0">
                    <p className="truncate font-black">{line.name}</p>
                    <p className="mt-1 truncate text-[11px] text-[#7d6841]">{line.description || "از قرارداد"}</p>
                  </div>
                  <span>{formatPersianNumber(line.quantity)} {line.unitLabel || "مورد"}</span>
                  <span className="font-black">{formatIRR(line.totalPrice)}</span>
                </div>
              ))
            ) : (
              <div className="bg-white/72 px-3 py-5 text-sm font-bold text-[#6d5f49]">ردیف قراردادی ثبت نشده است؛ مبلغ کل قرارداد همچنان مبنای صورتحساب است.</div>
            )}
          </div>
        </div>

        <form action={createPostEventInvoiceAction} className="rounded-[1.35rem] border border-[#17483f]/18 bg-[#f1fbf5]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.08)] sm:rounded-[1.65rem] sm:p-5">
          <input type="hidden" name="contractId" value={contract.id} />
          <div className="flex items-center gap-2">
            <LockKeyhole size={18} className="text-[#17483f]" />
            <h2 className="text-lg font-black text-[#17483f]">ثبت دستی قیمت فاکتور</h2>
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-[#17483f]">
            قیمت این فاکتور از قرارداد، پکیج یا نفرات اضافه محاسبه نمی‌شود. مبلغ نهایی را دستی وارد کنید؛ مانده قابل دریافت بعد از کسر دریافتی‌های ثبت‌شده محاسبه می‌شود.
          </p>

          <label className="mt-4 grid gap-2 text-sm font-black text-[#17483f]">
            تعداد نفرات واقعی مراسم
            <input
              name="guestCountActual"
              type="number"
              inputMode="numeric"
              min={contract.guestCount}
              defaultValue={contract.guestCount}
              className="min-h-12 rounded-2xl border border-[#17483f]/22 bg-white px-4 text-right text-base font-black text-[#111827] outline-none transition focus:border-[#17483f]/50"
            />
          </label>

          <label className="mt-4 grid gap-2 text-sm font-black text-[#17483f]">
            مبلغ نهایی فاکتور، قبل از کسر دریافتی‌ها
            <input
              name="manualInvoiceAmount"
              required
              inputMode="numeric"
              placeholder="مثلاً 250000000"
              className="min-h-12 rounded-2xl border border-[#17483f]/22 bg-white px-4 text-right text-base font-black text-[#111827] outline-none transition focus:border-[#17483f]/50"
            />
          </label>

          <div className="mt-4 grid gap-2 rounded-2xl border border-[#17483f]/18 bg-white/75 p-3 text-xs font-bold leading-6 text-[#17483f]">
            <p>مبلغ قرارداد فقط برای راهنما: {formatIRR(preview.contractSubtotal)}</p>
            <p>دریافت‌شده تا زمان صدور: {formatIRR(preview.paidAmountAtIssue)}</p>
            <p>محاسبه خودکار قیمت نفرات اضافه در این فاکتور غیرفعال است.</p>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-black text-[#17483f]">
            توضیح داخلی صورتحساب
            <textarea
              name="note"
              rows={3}
              className="rounded-2xl border border-[#17483f]/22 bg-white px-4 py-3 text-right text-sm font-bold leading-7 text-[#111827] outline-none transition focus:border-[#17483f]/50"
              placeholder="مثلاً: نفرات اضافه طبق اعلام سرپرست سالن ثبت شد."
            />
          </label>

          <ConfirmSubmitButton
            confirmTitle="صدور صورتحساب بعد از مراسم"
            confirmLabel="صدور صورتحساب"
            confirmTone="success"
            confirmMessage={`صورتحساب قرارداد ${contract.contractNo} صادر می‌شود.
مبلغ فاکتور فقط از عدد دستی واردشده ثبت می‌شود و محاسبه خودکار قرارداد یا نفرات اضافه اعمال نمی‌شود.
بعد از صدور، ارسال برای مشتری از مسیر کانال‌های فعال انجام می‌شود.`}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 py-3 text-sm font-black text-[#f7fff9] transition hover:bg-[#10372f]"
          >
            <CheckCircle2 size={18} />
            صدور صورتحساب قطعی
          </ConfirmSubmitButton>
        </form>
      </section>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#7d6841]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-lg font-black text-[#111827]">{value}</p>
    </div>
  );
}

function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-black leading-7 ${tone === "success" ? "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]" : "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {children}
    </div>
  );
}

function NotFound() {
  return (
    <section className="rounded-[1.5rem] border border-[#b45353]/22 bg-[#fff1f1] p-5 text-[#8f2c2c]">
      <h1 className="text-xl font-black">قرارداد پیدا نشد.</h1>
      <Link href="/dashboard/contracts" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/22 bg-white px-4 py-2 text-sm font-black">
        <ArrowRight size={16} />
        بازگشت به قراردادها
      </Link>
    </section>
  );
}
