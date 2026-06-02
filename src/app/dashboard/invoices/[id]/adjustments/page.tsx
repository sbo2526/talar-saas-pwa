import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePenLine,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  applyInvoiceAdjustmentRequestAction,
  createInvoiceAdjustmentRequestAction,
  rejectInvoiceAdjustmentRequestAction,
} from "@/lib/actions/invoice-adjustment-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getInvoiceAdjustmentStatusStyle,
  getInvoiceStatusStyle,
  invoiceAdjustmentStatusLabels,
  invoiceLineSourceLabels,
  invoiceStatusLabels,
} from "@/lib/invoices/display";
import { getMonthlyCloseLockForEventDate } from "@/lib/monthly-close/monthly-close-lock";
import { getPrisma } from "@/lib/prisma";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

type InvoiceAdjustmentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; applied?: string; rejected?: string; error?: string; "monthly-locked"?: string }>;
};

export default async function InvoiceAdjustmentPage({ params, searchParams }: InvoiceAdjustmentPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      contract: {
        select: {
          id: true,
          contractNo: true,
          eventDate: true,
          customer: { select: { fullName: true, phone: true } },
        },
      },
      lines: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      adjustmentRequests: {
        include: {
          requestedBy: { select: { name: true, email: true } },
          approvedBy: { select: { name: true, email: true } },
          rejectedBy: { select: { name: true, email: true } },
        },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!invoice) {
    return <NotFound />;
  }

  const isOwner = membership.role === "OWNER";
  const monthlyCloseLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: invoice.contract.eventDate,
  });
  const isMonthlyLocked = monthlyCloseLock.locked;
  const isLocked = invoice.status === "SETTLED" || invoice.status === "CANCELED" || isMonthlyLocked;
  const pendingCount = invoice.adjustmentRequests.filter((request) => request.status === "PENDING").length;
  const appliedTotal = invoice.adjustmentRequests
    .filter((request) => request.status === "APPLIED")
    .reduce((sum, request) => sum + Number(request.totalPrice.toString()), 0);

  return (
    <section className="space-y-5 sm:space-y-7">
      {query.created ? <Notice tone="success">درخواست اصلاح ثبت شد و تا تأیید مالک روی فاکتور اعمال نمی‌شود.</Notice> : null}
      {query.applied ? <Notice tone="success">اصلاح توسط مالک تأیید و به‌عنوان ردیف قفل‌شده به فاکتور اضافه شد.</Notice> : null}
      {query.rejected ? <Notice tone="danger">درخواست اصلاح توسط مالک رد شد و هیچ تغییری روی فاکتور اعمال نشد.</Notice> : null}
      {query.error ? <Notice tone="danger">{getErrorMessage(query.error)}</Notice> : null}
      {isMonthlyLocked ? <Notice tone="danger">ماه مالی {monthlyCloseLock.periodLabel} قفل شده است. ثبت یا اعمال اصلاح جدید روی این فاکتور مجاز نیست.</Notice> : null}

      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_17rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
                <FilePenLine size={15} /> اصلاح کنترل‌شده فاکتور
              </span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getInvoiceStatusStyle(invoice.status)}`}>
                {invoiceStatusLabels[invoice.status]}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              اصلاح فاکتور {toPersianDigits(invoice.invoiceNo)}
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              قرارداد {toPersianDigits(invoice.contract.contractNo)} · {invoice.contract.customer.fullName} · {formatJalaliDate(invoice.contract.eventDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <ArrowRight size={16} /> بازگشت به فاکتور
            </Link>
            <Link href="/dashboard/owner-financial-audit" className="inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-4 py-2.5 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/34 sm:text-sm">
              <AlertTriangle size={16} /> کنترل مالی مالک
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="جمع فعلی فاکتور" value={formatIRR(invoice.subtotal.toString())} />
        <MetricCard icon={ShieldCheck} label="مانده فعلی" value={formatIRR(invoice.payableAmount.toString())} />
        <MetricCard icon={AlertTriangle} label="در انتظار مالک" value={formatPersianNumber(pendingCount)} danger={pendingCount > 0} />
        <MetricCard icon={CheckCircle2} label="جمع اصلاح اعمال‌شده" value={formatIRR(appliedTotal)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-4">
          <Panel title="درخواست اصلاح جدید" icon={FilePenLine}>
            {isLocked ? (
              <div className="rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] p-4 text-sm font-black leading-7 text-[#8f2c2c]">
                <span className="inline-flex items-center gap-2"><LockKeyhole size={16} /> {isMonthlyLocked ? `این ماه مالی (${monthlyCloseLock.periodLabel}) بسته شده و اصلاح جدید نمی‌پذیرد.` : "این فاکتور بسته یا باطل شده است و اصلاح جدید نمی‌پذیرد."}</span>
              </div>
            ) : (
              <form action={createInvoiceAdjustmentRequestAction} className="grid gap-3">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="adjustmentMode" value="SET_FINAL_TOTAL" />
                <Field label="عنوان اصلاح">
                  <input name="title" required maxLength={180} defaultValue="اصلاح مبلغ نهایی فاکتور" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12" />
                </Field>
                <Field label="مبلغ نهایی اصلاح‌شده فاکتور">
                  <input name="finalSubtotal" required inputMode="numeric" placeholder="مثلاً 250000000" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12" />
                </Field>
                <Field label="شرح اصلاح">
                  <textarea name="description" rows={3} maxLength={900} placeholder="مثلاً اصلاح قیمت نهایی طبق توافق مالک و مشتری." className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12 resize-none" />
                </Field>
                <Field label="علت اصلاح و مستند تصمیم">
                  <textarea name="reason" required rows={4} maxLength={1200} placeholder="علت تغییر مبلغ را دقیق بنویسید تا در حسابرسی مالک قابل پیگیری باشد." className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12 resize-none" />
                </Field>
                <div className="rounded-2xl border border-[#17483f]/20 bg-[#f1fbf5] p-3 text-xs font-bold leading-6 text-[#17483f]">
                  این فرم مبلغ نهایی فاکتور را به عدد دستی جدید اصلاح می‌کند. اختلاف مبلغ فعلی و مبلغ جدید، بعد از تأیید مالک، به‌صورت ردیف حسابرسی‌شده روی فاکتور ثبت می‌شود.
                </div>
                <button className="min-h-11 rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#fff8ea] shadow-[0_12px_30px_rgba(17,32,51,0.22)]">
                  ثبت اصلاح مبلغ برای تأیید مالک
                </button>
              </form>
            )}
          </Panel>

          <Panel title="درخواست‌های اصلاح" icon={AlertTriangle}>
            {invoice.adjustmentRequests.length > 0 ? (
              <div className="space-y-3">
                {invoice.adjustmentRequests.map((request) => (
                  <article key={request.id} className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${getInvoiceAdjustmentStatusStyle(request.status)}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full border border-current/20 bg-white/50 px-3 py-1 text-[11px] font-black">
                          {invoiceAdjustmentStatusLabels[request.status]}
                        </span>
                        <h2 className="mt-3 text-base font-black leading-7 text-[#111827]">{request.title}</h2>
                        <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">{request.reason}</p>
                      </div>
                      <div className="rounded-2xl border border-current/15 bg-white/65 px-3 py-2 text-sm font-black text-[#111827]">
                        {formatIRR(request.totalPrice.toString())}
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 text-xs font-black sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="تعداد" value={formatPersianNumber(request.quantity)} />
                      <Info label="واحد" value={request.unitLabel ?? "—"} />
                      <Info label="مبلغ واحد" value={formatIRR(request.unitPrice.toString())} />
                      <Info label="ثبت‌کننده" value={request.requestedBy.name || request.requestedBy.email} />
                    </div>
                    {request.description ? <p className="mt-3 rounded-2xl border border-current/12 bg-white/55 p-3 text-xs font-bold leading-6 text-[#4b5563]">{request.description}</p> : null}
                    {request.ownerDecisionNote ? <p className="mt-3 rounded-2xl border border-[#172033]/16 bg-[#172033] p-3 text-xs font-bold leading-6 text-[#fff8ea]">نظر مالک: {request.ownerDecisionNote}</p> : null}
                    <div className="mt-3 text-[11px] font-bold leading-6 opacity-75">
                      ثبت: {formatJalaliDateTime(request.createdAt)}
                      {request.approvedAt ? ` · تأیید: ${formatJalaliDateTime(request.approvedAt)}` : ""}
                      {request.rejectedAt ? ` · رد: ${formatJalaliDateTime(request.rejectedAt)}` : ""}
                    </div>
                    {isOwner && request.status === "PENDING" && !isMonthlyLocked ? (
                      <div className="mt-4 grid gap-2 lg:grid-cols-2">
                        <form action={applyInvoiceAdjustmentRequestAction} className="rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-3">
                          <input type="hidden" name="requestId" value={request.id} />
                          <textarea name="ownerDecisionNote" rows={2} maxLength={1200} placeholder="یادداشت مالک برای تأیید" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12 resize-none" />
                          <button className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 text-xs font-black text-[#fff8ea]">
                            <CheckCircle2 size={15} /> تأیید و اعمال روی فاکتور
                          </button>
                        </form>
                        <form action={rejectInvoiceAdjustmentRequestAction} className="rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] p-3">
                          <input type="hidden" name="requestId" value={request.id} />
                          <textarea name="ownerDecisionNote" rows={2} maxLength={1200} placeholder="علت رد درخواست" className="min-h-11 rounded-2xl border border-[#d8c08b]/65 bg-white/82 px-3 py-2 text-sm font-black text-[#111827] outline-none transition focus:border-[#17483f]/45 focus:ring-2 focus:ring-[#17483f]/12 resize-none" />
                          <button className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-[#8f2c2c] px-4 text-xs font-black text-[#fff8ea]">
                            <XCircle size={15} /> رد درخواست
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#d8c08b]/70 bg-white/62 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
                هنوز درخواست اصلاحی ثبت نشده است.
              </div>
            )}
          </Panel>
        </div>

        <aside className="space-y-3">
          <SummaryCard label="وضعیت فاکتور" value={invoiceStatusLabels[invoice.status]} />
          <SummaryCard label="مشتری" value={invoice.contract.customer.fullName} />
          <SummaryCard label="تاریخ مراسم" value={formatJalaliDate(invoice.contract.eventDate)} />
          <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="font-black text-[#111827]">قانون اصلاح فاکتور</p>
            <p className="mt-2">مبلغ نهایی فاکتور فقط با عدد دستی اصلاح می‌شود. درخواست ثبت می‌شود، مالک آن را تأیید یا رد می‌کند، و اختلاف مبلغ فعلی و مبلغ جدید به‌صورت ردیف حسابرسی‌شده روی فاکتور می‌نشیند.</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 text-xs font-bold leading-6 text-[#17483f] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="font-black">ردیف‌های فعلی فاکتور</p>
            <div className="mt-3 space-y-2">
              {invoice.lines.map((line) => (
                <div key={line.id} className="rounded-2xl border border-[#17483f]/14 bg-white/75 p-3">
                  <p className="font-black text-[#111827]">{line.name}</p>
                  <p className="mt-1 text-[#17483f]">{invoiceLineSourceLabels[line.sourceType]} · {formatIRR(line.totalPrice.toString())}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </section>
  );
}

function getErrorMessage(error: string) {
  const messages: Record<string, string> = {
    "invalid-input": "اطلاعات اصلاح کامل نیست یا مبلغ معتبر نیست.",
    "locked-invoice": "فاکتور بسته یا باطل شده و اصلاح نمی‌پذیرد.",
    "not-pending": "این درخواست دیگر در وضعیت انتظار تأیید نیست.",
    "invalid-money": "مبلغ درخواست اصلاح معتبر نیست.",
    "monthly-locked": "ماه مالی این فاکتور بسته شده و اصلاح جدید مجاز نیست.",
  };
  return messages[error] ?? "خطای نامشخص در فرآیند اصلاح فاکتور.";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-black text-[#6d5f49]">
      {label}
      {children}
    </label>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
      <h2 className="flex items-center gap-2 text-lg font-black text-[#111827]"><Icon size={18} className="text-[#7d6841]" /> {title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, danger = false }: { icon: LucideIcon; label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${danger ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black opacity-75">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-white/56"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-lg font-black">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-[#111827] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-2 text-base font-black">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-current/12 bg-white/55 p-3">
      <p className="text-[11px] font-black opacity-65">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#111827]">{value}</p>
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
      <h1 className="text-xl font-black">فاکتور پیدا نشد.</h1>
      <Link href="/dashboard/invoices" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/22 bg-white px-4 py-2 text-sm font-black">
        <ArrowRight size={16} /> بازگشت به صورتحساب‌ها
      </Link>
    </section>
  );
}
