import type { ContractStatus, Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ClipboardList,
  FileSignature,
  History,
  MoreHorizontal,
  Pencil,
  Printer,
  Trash2,
  ReceiptText,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { deleteContractAction, finalizeContractSettlementAction, updateContractStatusAction } from "@/lib/actions/contract-actions";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { PrintCreatedDialog } from "@/components/dashboard/contracts/print-created-dialog";
import { ContractCancelDialog } from "@/components/dashboard/contracts/contract-cancel-dialog";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { EntityAuditTimeline } from "@/components/dashboard/audit/entity-audit-timeline";
import { getEntityAuditLogs } from "@/lib/audit/audit-log-service";
import {
  contractStatusLabels,
  formatContractTime,
  formatContractTimeRange,
  getContractStatusStyle,
  getLineItemFormula,
  getLineItemGroupKey,
  getPaidAmount,
  getPaymentStatus,
  getPaymentStatusStyle,
  lineItemTypeLabels,
  paymentStatusLabels,
  pricingTypeLabels,
  toNumber,
} from "@/lib/contracts/display";
import {
  formatJalaliDate,
  formatJalaliDateTime,
  formatJalaliWeekday,
  toPersianDigits,
} from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPrisma } from "@/lib/prisma";
import {
  getPaymentRecordStatusLabel,
  getPaymentRecordStatusStyle,
  getPaymentTypeLabel,
  getPaymentTypeStyle,
  formatPaymentMethodLabel,
  formatReference,
} from "@/lib/payments/display";

type ContractDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; settled?: string; canceled?: string; error?: string; invoice?: string; postEvent?: string }>;
};

const contractStatuses: ContractStatus[] = [
  "DRAFT",
  "RESERVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
];

function getContractFinalSettlementConfirmMessage(input: {
  customerName: string;
  contractNo: string;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
}) {
  return `آیا مطمئن هستید که می‌خواهید این قرارداد را تسویه نهایی کنید؟
مبلغ مانده قرارداد به‌صورت خودکار تسویه می‌شود و وضعیت قرارداد به تسویه‌شده و برگزارشده تغییر می‌کند.
نام مشتری: ${input.customerName}
شماره قرارداد: ${toPersianDigits(input.contractNo)}
مبلغ مانده فعلی: ${formatIRR(input.remainingAmount)}
مبلغ نهایی قرارداد: ${formatIRR(input.finalTotal)}
مبلغ دریافت‌شده فعلی: ${formatIRR(input.paidAmount)}`;
}

function getContractDetailErrorMessage(error: string) {
  if (error === "settlement-failed") return "تسویه نهایی قرارداد انجام نشد. چند دقیقه دیگر دوباره تلاش کنید.";
  if (error === "invalid-settlement") return "درخواست تسویه نهایی معتبر نیست.";
  if (error === "not-found") return "این قرارداد پیدا نشد.";
  if (error === "invalid-cancellation-amount") return "مبلغ کنسلی معتبر نیست.";
  if (error === "cancel-failed") return "کنسل کردن قرارداد انجام نشد. چند دقیقه دیگر دوباره تلاش کنید.";
  return "درخواست قرارداد معتبر نبود یا دسترسی شما مجاز نیست.";
}

function getContractDeleteConfirmMessage(contractNo: string) {
  return `آیا مطمئن هستید که می‌خواهید این قرارداد حذف شود؟
با حذف این قرارداد، تمام اطلاعات مربوط به این قرارداد شامل جزئیات مراسم، منوها، خدمات، دریافت‌ها، پرداخت‌ها و اطلاعات مالی وابسته حذف خواهد شد. فقط اطلاعات پایه مشتری باقی می‌ماند. این عملیات قابل بازگشت نیست.
قرارداد ${contractNo}`;
}

function canRegisterHeldConfirmationForInvoiceFromDetail(contract: ContractDetail) {
  if (contract.invoice || contract.postEventConfirmation) return false;
  if (contract.status !== "RESERVED" && contract.status !== "CONFIRMED" && contract.status !== "COMPLETED") return false;
  return contract.eventDate < new Date();
}

function getPostEventInvoiceConfirmMessageFromDetail(contract: ContractDetail, finalTotal: number) {
  return `برای قرارداد ${toPersianDigits(contract.contractNo)} وضعیت مراسم «برگزار شده» ثبت می‌شود و سپس صفحه پیش‌نمایش فاکتور باز خواهد شد.
مشتری: ${contract.customer.fullName}
تاریخ مراسم: ${formatJalaliDate(contract.eventDate)}
مبلغ قرارداد: ${formatIRR(finalTotal)}`;
}

type ContractDetail = Prisma.ContractGetPayload<{
  include: {
    customer: true;
    hall: { select: { name: true; address: true; city: true; phone: true } };
    salon: { select: { name: true; capacity: true; floor: true } };
    lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] };
    payments: {
      include: { paymentMethod: { select: { title: true; type: true } } };
      orderBy: { paidAt: "asc" };
    };
    postEventConfirmation: { select: { status: true; invoiceRequired: true; cancellationRequired: true; cancellationAmount: true; cancellationAmountManual: true } };
    invoice: { select: { id: true; invoiceNo: true; status: true } };
  };
}>;

export default async function ContractDetailPage({
  params,
  searchParams,
}: ContractDetailPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const contract = await db.contract.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    include: {
      customer: true,
      hall: { select: { name: true, address: true, city: true, phone: true } },
      salon: { select: { name: true, capacity: true, floor: true } },
      lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      payments: {
        include: { paymentMethod: { select: { title: true, type: true } } },
        orderBy: { paidAt: "asc" },
      },
      postEventConfirmation: { select: { status: true, invoiceRequired: true, cancellationRequired: true, cancellationAmount: true, cancellationAmountManual: true } },
      invoice: { select: { id: true, invoiceNo: true, status: true } },
    },
  });

  if (!contract) {
    return <ContractNotFound />;
  }

  const contractAuditLogs = await getEntityAuditLogs({
    tenantId: membership.tenantId,
    entityType: "CONTRACT",
    entityId: contract.id,
    limit: 5,
  });

  const isCanceledContract = contract.status === "CANCELED";
  const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
  const finalTotal = toNumber(contract.finalTotal);
  const remainingAmount = isCanceledContract ? 0 : toNumber(contract.remainingAmount);
  const paymentStatus = remainingAmount <= 0 && finalTotal > 0 ? "PAID" : getPaymentStatus(contract.finalTotal, paidAmount);
  const financialStatusLabel = isCanceledContract ? "بسته‌شده / کنسلی" : paymentStatusLabels[paymentStatus];
  const packageItems = contract.lineItems.filter((item) => item.type === "PACKAGE");
  const serviceItems = contract.lineItems.filter((item) => item.type === "SERVICE");
  const menuItems = contract.lineItems.filter((item) => item.type !== "SERVICE" && item.type !== "PACKAGE");
  const groupedLineItems = groupLineItems(contract.lineItems);
  const progressPercent = finalTotal > 0 ? Math.min(100, Math.round(((finalTotal - remainingAmount) / finalTotal) * 100)) : paidAmount > 0 ? 100 : 0;
  const eventTimeLabel = formatEventTimeRange(contract.eventStartTime, contract.eventEndTime);
  const contractTitle = `${contract.eventTypeName || "قرارداد"} ${contract.customer.fullName}`;
  const showCreatedPrompt = query.created === "1";
  const canDeleteContract = canEdit;
  const canIssuePostEventInvoice = contract.postEventConfirmation?.status === "HELD" && contract.postEventConfirmation.invoiceRequired && !contract.invoice;
  const canRegisterHeldForInvoice = canEdit && canRegisterHeldConfirmationForInvoiceFromDetail(contract);

  return (
    <section className="space-y-5 sm:space-y-7 print:bg-white print:text-black">
      <PrintCreatedDialog contractId={contract.id} open={showCreatedPrompt} />
      {query.settled === "1" ? <Notice tone="success">قرارداد با موفقیت تسویه نهایی شد و دریافت مانده به‌صورت خودکار ثبت شد.</Notice> : null}
      {query.settled === "zero" ? <Notice tone="success">قرارداد مانده مالی نداشت؛ وضعیت آن به تسویه‌شده و برگزارشده تغییر کرد.</Notice> : null}
      {query.canceled === "1" ? <Notice tone="success">قرارداد با موفقیت کنسل شد و مبلغ کنسلی برای گزارش‌های مالی ثبت شد.</Notice> : null}
      {query.error ? <Notice tone="danger">{getContractDetailErrorMessage(query.error)}</Notice> : null}
      {query.invoice === "requires-held-confirmation" ? <Notice tone="danger">برای صدور فاکتور، اول باید وضعیت مراسم «برگزار شده» ثبت شود.</Notice> : null}
      {query.postEvent === "held" ? <Notice tone="success">برگزاری مراسم ثبت شد. حالا فاکتور قطعی را از صفحه پیش‌نمایش صادر کنید.</Notice> : null}
      {canRegisterHeldForInvoice ? <Notice tone="danger">این قرارداد فاکتور ندارد. اگر مراسم برگزار شده، از دکمه «ثبت برگزاری و فاکتور» استفاده کنید تا وارد تسویه مالک شود.</Notice> : null}
      <div className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.16),transparent_16rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] text-[#111827] shadow-[0_18px_62px_rgba(17,24,39,0.09)] sm:rounded-[1.65rem] print:rounded-none print:border-0 print:shadow-none">
        <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,25rem)] lg:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard/contracts" className="inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-2.5 py-1 text-[11px] font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 print:hidden">
                <ArrowRight size={14} />
                بازگشت به قراردادها
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111827]/14 bg-[#111827] px-2.5 py-1 text-[11px] font-black text-[#fff8ea]">
                <FileSignature size={14} />
                قرارداد شماره {toPersianDigits(contract.contractNo)}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getContractStatusStyle(contract.status)}`}>
                {contractStatusLabels[contract.status]}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getPaymentStatusStyle(paymentStatus)}`}>
                {financialStatusLabel}
              </span>
            </div>
            <h1 className="mt-2.5 text-xl font-black leading-tight sm:text-2xl lg:text-3xl">
              {contractTitle}
            </h1>
            <p className="mt-1.5 max-w-4xl text-xs font-bold leading-6 text-[#6d5f49] sm:text-sm sm:leading-7">
              {formatJalaliWeekday(contract.eventDate)}، {formatJalaliDate(contract.eventDate)} · {eventTimeLabel} · {formatPersianNumber(contract.guestCount)} مهمان
            </p>
            <LifecycleBar contractStatus={contract.status} paymentStatus={paymentStatus} paidAmount={paidAmount} />
          </div>

          <div className="grid gap-2 rounded-[1.35rem] border border-[#d8c08b]/52 bg-white/55 p-3 print:hidden sm:grid-cols-2">
            {isCanceledContract ? (
              <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/44 bg-[#fff8ea]/70 px-3 py-2 text-xs font-black text-[#7d6841]">
                <Banknote size={15} />
                قرارداد کنسل و بسته شده است
              </span>
            ) : (
              <Link href={`/dashboard/payments/new?contractId=${contract.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#25a46d]/22 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#25a46d]/42">
                <Banknote size={15} />
                ثبت دریافت
              </Link>
            )}
            {contract.invoice ? (
              <Link href={`/dashboard/invoices/${contract.invoice.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#f1fbf5] px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/38">
                <ReceiptText size={15} />
                مشاهده صورتحساب
              </Link>
            ) : canIssuePostEventInvoice ? (
              <Link href={`/dashboard/contracts/${contract.id}/invoice`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#f1fbf5] px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/38">
                <ReceiptText size={15} />
                صدور صورتحساب
              </Link>
            ) : canRegisterHeldForInvoice ? (
              <form action={confirmPostEventAction} className="grid">
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="decision" value="HELD" />
                <input type="hidden" name="note" value="ثبت برگزاری از جزئیات قرارداد برای صدور فاکتور بعد از مراسم." />
                <ConfirmSubmitButton
                  confirmTitle="ثبت برگزاری و ادامه صدور فاکتور"
                  confirmLabel="ثبت و رفتن به فاکتور"
                  confirmTone="success"
                  confirmMessage={getPostEventInvoiceConfirmMessageFromDetail(contract, finalTotal)}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#17483f] px-3 py-2 text-xs font-black text-[#f7fff9] transition hover:border-[#17483f]/38 hover:bg-[#10372f]"
                >
                  <CheckCircle2 size={15} />
                  ثبت برگزاری و فاکتور
                </ConfirmSubmitButton>
              </form>
            ) : null}
            {canEdit && !isCanceledContract && remainingAmount > 0 ? (
              <form action={finalizeContractSettlementAction} className="grid">
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="returnTo" value={`/dashboard/contracts/${contract.id}`} />
                <ConfirmSubmitButton
                  confirmTitle="تأیید تسویه نهایی قرارداد"
                  confirmLabel="تأیید تسویه نهایی"
                  confirmTone="success"
                  confirmMessage={getContractFinalSettlementConfirmMessage({
                    customerName: contract.customer.fullName,
                    contractNo: contract.contractNo,
                    finalTotal,
                    paidAmount,
                    remainingAmount,
                  })}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#17483f]/20 bg-[#25a46d]/12 px-3 py-2 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/38"
                >
                  <CheckCircle2 size={15} />
                  تسویه نهایی
                </ConfirmSubmitButton>
              </form>
            ) : null}
            <Link href={`/dashboard/contracts/${contract.id}/print`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#111827]/12 bg-[#111827] px-3 py-2 text-xs font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60">
              <Printer size={15} />
              چاپ قرارداد
            </Link>
            {canEdit && !isCanceledContract ? (
              <ContractCancelDialog
                contractId={contract.id}
                contractNo={contract.contractNo}
                customerName={contract.customer.fullName}
                eventLabel={`${formatJalaliWeekday(contract.eventDate)}، ${formatJalaliDate(contract.eventDate)} · ${eventTimeLabel}`}
                finalTotal={finalTotal}
                paidAmount={paidAmount}
                remainingAmount={remainingAmount}
                returnTo={`/dashboard/contracts/${contract.id}`}
              />
            ) : null}
            {canEdit ? (
              <Link href={`/dashboard/contracts/${contract.id}/edit`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#c7a15a]/36 bg-[#fff8ea]/88 px-3 py-2 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
                <Pencil size={15} />
                ویرایش جزئیات
              </Link>
            ) : (
              <button type="button" disabled className="inline-flex min-h-10 cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/42 bg-[#f5ead3]/68 px-3 py-2 text-xs font-black text-[#9b8b70]">
                <Pencil size={15} />
                ویرایش
              </button>
            )}
            {canDeleteContract ? (
              <form action={deleteContractAction} className="grid">
                <input type="hidden" name="contractId" value={contract.id} />
                <input type="hidden" name="returnTo" value="/dashboard/contracts" />
                <ConfirmSubmitButton
                  confirmMessage={getContractDeleteConfirmMessage(contract.contractNo)}
                  reasonFieldName="deleteReason"
                  reasonLabel="دلیل حذف قرارداد"
                  reasonPlaceholder="اختیاری؛ دلیل حذف برای تاریخچه غیرقابل حذف ثبت می‌شود."
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/30 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/45"
                >
                  <Trash2 size={15} />
                  حذف قرارداد
                </ConfirmSubmitButton>
              </form>
            ) : null}
            {canEdit ? (
              <details className="group rounded-2xl border border-[#d8c08b]/46 bg-[#fff8ea]/70 p-2 sm:col-span-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-black text-[#7d6841]">
                  <span className="inline-flex items-center gap-2">
                    <MoreHorizontal size={14} />
                    تغییر وضعیت قرارداد
                  </span>
                  <ChevronDown size={14} className="text-[#9f7131] transition group-open:rotate-180" />
                </summary>
                <form action={updateContractStatusAction} className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <input type="hidden" name="contractId" value={contract.id} />
                  <input type="hidden" name="returnTo" value={`/dashboard/contracts/${contract.id}`} />
                  <select name="status" defaultValue={contract.status} className="input-luxury min-h-10 py-2 text-xs">
                    {contractStatuses.map((status) => (
                      <option key={status} value={status}>{contractStatusLabels[status]}</option>
                    ))}
                  </select>
                  <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">
                    ثبت تغییر
                  </button>
                </form>
              </details>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard icon={CalendarDays} label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
        <SummaryCard icon={Clock3} label="ساعت مراسم" value={eventTimeLabel} />
        <SummaryCard icon={UsersRound} label="تعداد مهمان" value={`${formatPersianNumber(contract.guestCount)} نفر`} />
        <SummaryCard icon={ReceiptText} label="مبلغ نهایی" value={formatIRR(finalTotal)} />
        <SummaryCard icon={WalletCards} label="دریافت‌شده" value={formatIRR(paidAmount)} tone={paymentStatus === "PAID" ? "success" : paymentStatus === "PARTIAL" ? "warning" : "neutral"} />
        <SummaryCard icon={CheckCircle2} label="مانده" value={isCanceledContract ? "بسته‌شده" : remainingAmount <= 0 ? "تسویه شده" : formatIRR(remainingAmount)} tone={remainingAmount <= 0 ? "success" : "warning"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22.5rem] xl:items-start">
        <div className="space-y-5">
          <CustomerSection contract={contract} />
          <EventSection contract={contract} eventTimeLabel={eventTimeLabel} />
          <LineItemsSection groupedLineItems={groupedLineItems} lineItemCount={contract.lineItems.length} />
          <ContractHistory contract={contract} depositAmount={toNumber(contract.depositAmount)} />
          <EntityAuditTimeline
            title="تاریخچه قرارداد"
            items={contractAuditLogs}
            allHref={`/dashboard/settings/activity?entityType=CONTRACT&entityId=${contract.id}`}
          />
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28">
          <FinancialSummary
            packageTotal={toNumber(contract.packageTotal) || packageItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)}
            servicesTotal={toNumber(contract.servicesTotal) || serviceItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)}
            menuTotal={toNumber(contract.menuTotal) || menuItems.reduce((sum, item) => sum + toNumber(item.totalPrice), 0)}
            discountAmount={toNumber(contract.discountAmount)}
            depositAmount={toNumber(contract.depositAmount)}
            paidAmount={paidAmount}
            finalTotal={finalTotal}
            remainingAmount={remainingAmount}
            progressPercent={progressPercent}
            paymentStatus={paymentStatus}
            isCanceled={isCanceledContract}
          />


          <PaymentTimeline contractId={contract.id} payments={contract.payments} />
        </aside>
      </div>
    </section>
  );
}

function groupLineItems(items: ContractDetail["lineItems"]) {
  return items.reduce<Record<string, ContractDetail["lineItems"]>>((groups, item) => {
    const key = getLineItemGroupKey(item);
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function parseTimeToMinutes(value: string | null | undefined) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatEventTimeRange(start: string | null | undefined, end: string | null | undefined) {
  const base = formatContractTimeRange(start, end);
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  if (startMinutes !== null && endMinutes !== null && endMinutes < startMinutes) {
    return `${formatContractTime(start)} تا ${formatContractTime(end)} روز بعد`;
  }

  return base;
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "danger" }) {
  const isSuccess = tone === "success";

  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm font-black leading-7 ${isSuccess ? "border-[#25a46d]/24 bg-[#edfdf4] text-[#17483f]" : "border-[#b45353]/24 bg-[#fff1f1] text-[#8f2c2c]"}`}>
      {children}
    </div>
  );
}

function ContractNotFound() {
  return (
    <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <h1 className="text-2xl font-black">قرارداد پیدا نشد</h1>
      <p className="mt-3 leading-8 text-[#6d5f49]">
        این قرارداد وجود ندارد یا دسترسی شما به آن مجاز نیست.
      </p>
      <Link href="/dashboard/contracts" className="btn-luxury-dark mt-5 px-5 py-3">
        بازگشت به قراردادها
      </Link>
    </section>
  );
}

function LifecycleBar({
  contractStatus,
  paymentStatus,
  paidAmount,
}: {
  contractStatus: ContractStatus;
  paymentStatus: ReturnType<typeof getPaymentStatus>;
  paidAmount: number;
}) {
  const steps = [
    { label: "رزرو", done: contractStatus !== "DRAFT" && contractStatus !== "CANCELED" },
    { label: "بیعانه", done: paidAmount > 0 },
    { label: "تسویه", done: paymentStatus === "PAID" },
    { label: "برگزاری", done: contractStatus === "COMPLETED" },
  ];

  return (
    <div className="mt-2.5 grid grid-cols-4 gap-1 sm:max-w-lg">
      {steps.map((step) => (
        <div
          key={step.label}
          className={`rounded-xl border px-2 py-1.5 text-center text-[10px] font-black sm:text-[11px] ${
            step.done
              ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]"
              : "border-[#d8c08b]/44 bg-[#fff8ea]/62 text-[#9b8b70]"
          }`}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}

function CustomerSection({ contract }: { contract: ContractDetail }) {
  const initial = contract.customer.fullName.trim().slice(0, 1) || "م";
  const nationalCode = contract.customer.nationalCode || contract.customer.nationalId;

  return (
    <InfoSection icon={UserRound} title="اطلاعات مشتری">
      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="rounded-[1.35rem] border border-[#111827]/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.46),rgba(255,248,234,0.72))] p-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#111827] text-2xl font-black text-[#f0dba9]">
            {initial}
          </span>
          <h3 className="mt-3 text-lg font-black text-[#111827]">{contract.customer.fullName}</h3>
          <p className="mt-1 text-sm font-bold text-[#7d6841]">{toPersianDigits(contract.customer.phone)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="عنوان" value={contract.customer.salutation} />
          <DetailRow label="نام کامل" value={contract.customer.fullName} />
          <DetailRow label="شماره همراه" value={toPersianDigits(contract.customer.phone)} />
          <DetailRow label="کد ملی" value={nationalCode ? toPersianDigits(nationalCode) : undefined} />
          <DetailRow label="نشانی" value={contract.customer.address} wide />
        </div>
      </div>
    </InfoSection>
  );
}

function EventSection({ contract, eventTimeLabel }: { contract: ContractDetail; eventTimeLabel: string }) {
  const hallAddress = [contract.hall?.city, contract.hall?.address].filter(Boolean).join("، ");

  return (
    <InfoSection icon={CalendarDays} title="اطلاعات مراسم">
      <div className="grid gap-3 md:grid-cols-2">
        <DetailRow label="نوع مراسم" value={contract.eventTypeName} />
        <DetailRow label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
        <DetailRow label="روز مراسم" value={formatJalaliWeekday(contract.eventDate)} />
        <DetailRow label="ساعت مراسم" value={eventTimeLabel} />
        <DetailRow label="تعداد مهمان" value={`${formatPersianNumber(contract.guestCount)} نفر`} />
        <DetailRow label="تالار" value={contract.hall?.name} />
        <DetailRow label="سالن" value={contract.salon?.name} />
        <DetailRow label="نشانی تالار" value={hallAddress || undefined} wide />
        <DetailRow label="توضیحات قرارداد" value={contract.notes ?? undefined} wide />
      </div>
    </InfoSection>
  );
}

function LineItemsSection({
  groupedLineItems,
  lineItemCount,
}: {
  groupedLineItems: Record<string, ContractDetail["lineItems"]>;
  lineItemCount: number;
}) {
  return (
    <InfoSection icon={ClipboardList} title="خدمات و منوی قرارداد">
      {lineItemCount > 0 ? (
        <div className="grid gap-4">
          {Object.entries(groupedLineItems).map(([group, items]) => (
            <div key={group} className="overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/52 bg-[#fff8ea]/70">
              <div className="flex items-center justify-between gap-3 border-b border-[#d8c08b]/42 px-4 py-3">
                <h3 className="text-sm font-black text-[#17483f]">
                  {lineItemTypeLabels[group as keyof typeof lineItemTypeLabels]}
                </h3>
                <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-3 py-1 text-xs font-black text-[#7d6841]">
                  {formatPersianNumber(items.length)} ردیف
                </span>
              </div>
              <div className="hidden grid-cols-[minmax(0,1fr)_9rem_8rem_9rem_9rem] gap-3 border-b border-[#d8c08b]/36 px-4 py-2 text-xs font-black text-[#7d6841] lg:grid">
                <span>شرح</span>
                <span>نوع قیمت‌گذاری</span>
                <span>تعداد / مبنا</span>
                <span>قیمت واحد</span>
                <span>جمع</span>
              </div>
              <div className="grid gap-2 p-3">
                {items.map((item) => (
                  <LineItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#c7a15a]/42 bg-[#fff8ea]/70 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
          برای این قرارداد هنوز خدمت یا منویی ثبت نشده است.
        </p>
      )}
    </InfoSection>
  );
}

function ContractHistory({ contract, depositAmount }: { contract: ContractDetail; depositAmount: number }) {
  return (
    <InfoSection icon={History} title="خط زمانی قرارداد">
      <div className="grid gap-3">
        <TimelineItem title="قرارداد ایجاد شد" detail={formatJalaliDateTime(contract.createdAt)} />
        {depositAmount > 0 ? <TimelineItem title="بیعانه ثبت شد" detail={formatIRR(depositAmount)} /> : null}
        <TimelineItem title="آخرین به‌روزرسانی" detail={formatJalaliDateTime(contract.updatedAt)} />
        <TimelineItem title="وضعیت فعلی" detail={contractStatusLabels[contract.status]} />
      </div>
    </InfoSection>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass = tone === "success"
    ? "border-[#25a46d]/24 bg-[#ecfff5] text-[#17483f]"
    : tone === "warning"
      ? "border-[#c7a15a]/34 bg-[#fff8ea] text-[#7d6841]"
      : "border-[#d8c08b]/60 bg-[#fff9ee]/96 text-[#111827]";

  return (
    <article className={`overflow-hidden rounded-[1.2rem] border p-4 shadow-[0_12px_34px_rgba(17,24,39,0.05)] sm:rounded-[1.35rem] ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black leading-5 text-[#7d6841]">{label}</p>
          <p className="mt-2 break-words text-sm font-black leading-7 text-[#111827] sm:text-base">
            {value}
          </p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_10px_22px_rgba(17,24,39,0.12)]">
          <Icon size={17} />
        </span>
      </div>
    </article>
  );
}

function InfoSection({
  icon: Icon,
  title,
  children,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/58 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(255,248,234,0.95))] text-[#111827] shadow-[0_16px_44px_rgba(17,24,39,0.06)] sm:rounded-[1.7rem]">
      <div className="flex items-center gap-3 border-b border-[#eadfc7] px-4 py-3.5 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_10px_24px_rgba(17,24,39,0.12)]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-black sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-[11px] font-bold text-[#8b7a5d]">نمایش خلاصه و مرتب اطلاعات این بخش</p>
        </div>
      </div>
      <div className={compact ? "p-4" : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

function DetailRow({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  const hasValue = Boolean(value && value.trim());
  const displayValue = hasValue ? value : "ثبت نشده";
  return (
    <div className={`grid min-h-[5.25rem] content-start gap-1 rounded-[1.1rem] border border-[#e5d6b3] bg-white/75 px-4 py-3 shadow-[0_6px_18px_rgba(17,24,39,0.03)] ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-[11px] font-black leading-5 text-[#8b7a5d]">{label}</p>
      <p className={`break-words text-sm font-black leading-7 ${hasValue ? "text-[#111827]" : "text-[#9b8b70]"}`}>
        {displayValue}
      </p>
    </div>
  );
}

function LineItemRow({ item }: { item: ContractDetail["lineItems"][number] }) {
  const pricingLabel = item.pricingType ? pricingTypeLabels[item.pricingType] : "ثبت نشده";
  const basisLabel = getLineItemFormula(item);

  return (
    <div className="grid gap-3 rounded-[1.2rem] border border-[#e5d6b3] bg-white/72 p-3.5 shadow-[0_8px_24px_rgba(17,24,39,0.03)] lg:grid-cols-[minmax(0,1fr)_9rem_8rem_9rem_9rem] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black text-[#111827]">{item.name}</p>
          <span className="rounded-full border border-[#c7a15a]/28 bg-[#c7a15a]/10 px-2.5 py-1 text-[11px] font-black text-[#7d6841] lg:hidden">
            {pricingLabel}
          </span>
        </div>
        {item.note ? (
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{item.note}</p>
        ) : null}
      </div>
      <InvoiceCell label="نوع قیمت‌گذاری" value={pricingLabel} />
      <InvoiceCell label="تعداد / مبنا" value={basisLabel} />
      <InvoiceCell label="قیمت واحد" value={formatIRR(toNumber(item.unitPrice))} />
      <div className="rounded-2xl border border-[#25a46d]/18 bg-[#edf9f2] px-3 py-2 text-sm font-black text-[#17483f] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
        {formatIRR(toNumber(item.totalPrice))}
      </div>
    </div>
  );
}

function InvoiceCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm font-bold text-[#6d5f49]">
      <p className="text-[11px] font-black text-[#7d6841] lg:hidden">{label}</p>
      <p className="mt-1 font-black text-[#111827] lg:mt-0">{value}</p>
    </div>
  );
}

function FinancialSummary({
  packageTotal,
  servicesTotal,
  menuTotal,
  discountAmount,
  depositAmount,
  paidAmount,
  finalTotal,
  remainingAmount,
  progressPercent,
  paymentStatus,
  isCanceled,
}: {
  packageTotal: number;
  servicesTotal: number;
  menuTotal: number;
  discountAmount: number;
  depositAmount: number;
  paidAmount: number;
  finalTotal: number;
  remainingAmount: number;
  progressPercent: number;
  paymentStatus: ReturnType<typeof getPaymentStatus>;
  isCanceled: boolean;
}) {
  const isSettled = remainingAmount <= 0;

  return (
    <section className="overflow-hidden rounded-[1.45rem] border border-[#d8c08b]/58 bg-[linear-gradient(180deg,rgba(255,252,245,0.98),rgba(255,248,234,0.95))] p-4 text-[#111827] shadow-[0_16px_44px_rgba(17,24,39,0.06)] sm:rounded-[1.7rem]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9] shadow-[0_10px_24px_rgba(17,24,39,0.12)]">
          <WalletCards size={18} />
        </span>
        <div>
          <h2 className="text-lg font-black">جمع‌بندی مالی</h2>
          <p className="mt-0.5 text-[11px] font-bold text-[#8b7a5d]">خلاصه تمیز و قابل‌پیگیری مبالغ قرارداد</p>
        </div>
      </div>
      <div className={`mb-4 rounded-[1.1rem] border p-3.5 ${isSettled ? "border-[#25a46d]/24 bg-[#ecfff5]" : "border-[#c7a15a]/34 bg-[#fff8ea]"}`}>
        <div className="flex items-center justify-between gap-3 text-xs font-black">
          <span className={isSettled ? "text-[#17483f]" : "text-[#7d6841]"}>{isCanceled ? "قرارداد کنسل و بسته شده است" : isSettled ? "قرارداد تسویه شده است" : "مانده قابل دریافت"}</span>
          <span className="text-[#111827]">{formatPersianNumber(progressPercent)}٪ دریافت شده</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#d8c08b]/30">
          <div className={`h-full rounded-full ${paymentStatus === "PAID" ? "bg-[#25a46d]" : "bg-[#c7a15a]"}`} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="grid gap-2">
        {packageTotal > 0 ? <DarkRow label="جمع پکیج" value={packageTotal} /> : null}
        <DarkRow label="جمع خدمات" value={servicesTotal} />
        <DarkRow label="جمع منو" value={menuTotal} />
        <DarkRow label="تخفیف" value={discountAmount} />
        <DarkRow label="بیعانه" value={depositAmount} />
        <DarkRow label="دریافت‌شده" value={paidAmount} />
        <DarkRow label="مبلغ نهایی" value={finalTotal} strong />
        <DarkRow label="مانده" value={isCanceled ? 0 : remainingAmount} strong />
      </div>
    </section>
  );
}

function DarkRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[1rem] border px-4 py-3 ${strong ? "border-[#17483f]/16 bg-[#173f33] text-[#fff8ea] shadow-[0_10px_24px_rgba(23,63,51,0.18)]" : "border-[#e5d6b3] bg-white/72 text-[#111827]"}`}>
      <span className={`text-sm font-bold ${strong ? "text-[#f0dba9]" : "text-[#7d6841]"}`}>{label}</span>
      <span className="text-sm font-black">{formatIRR(value)}</span>
    </div>
  );
}

function PaymentTimeline({ contractId, payments }: { contractId: string; payments: ContractDetail["payments"] }) {
  return (
    <InfoSection icon={Banknote} title="خط زمانی دریافتی‌ها" compact>
      {payments.length > 0 ? (
        <div className="grid gap-3">
          {payments.map((payment, index) => (
            <PaymentRow key={payment.id} payment={payment} index={index + 1} total={payments.length} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c7a15a]/42 bg-[#fff8ea]/70 p-4 text-sm font-bold leading-7 text-[#6d5f49]">
          <p>دریافتی برای این قرارداد ثبت نشده است.</p>
          <Link href={`/dashboard/payments/new?contractId=${contractId}`} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea] print:hidden">
            ثبت دریافت
          </Link>
        </div>
      )}
    </InfoSection>
  );
}

function PaymentRow({ payment, index, total }: { payment: ContractDetail["payments"][number]; index: number; total: number }) {
  const reference = formatReference(payment);
  const note = payment.note || payment.reference;

  return (
    <article className="relative rounded-[1.15rem] border border-[#e5d6b3] bg-white/72 p-3.5 shadow-[0_8px_24px_rgba(17,24,39,0.03)]">
      <span className="absolute right-[-0.35rem] top-5 size-3 rounded-full border-2 border-[#fff9ee] bg-[#c7a15a]" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentRecordStatusStyle(payment.status)}`}>
              {getPaymentRecordStatusLabel(payment.status)}
            </span>
            {total > 1 ? <span className="rounded-full border border-[#d8c08b]/62 bg-white/50 px-3 py-1 text-xs font-black text-[#7d6841]">دریافت {formatPersianNumber(index)} از {formatPersianNumber(total)}</span> : null}
          </div>
          <p className="mt-2 text-sm font-black text-[#111827]">{formatIRR(toNumber(payment.amount))}</p>
          <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">
            {formatJalaliDate(payment.paidAt)} · روش دریافت: {formatPaymentMethodLabel(payment.paymentMethod)}
          </p>
        </div>
      </div>
      <div className="mt-2 grid gap-1 text-xs font-bold leading-6 text-[#7d6841]">
        {reference !== "ثبت نشده" ? <p>کد/مرجع: {reference}</p> : null}
        {note ? <p>توضیح: {note}</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 print:hidden">
        {payment.receiptImageUrl ? (
          <a href={payment.receiptImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            مشاهده رسید
          </a>
        ) : null}
        <Link href={`/dashboard/payments/${payment.id}`} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#111827]/12 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
          مشاهده دریافت
        </Link>
        <Link href={`/dashboard/payments/${payment.id}`} className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[#d8c08b]/62 bg-[#fff9ee]/80 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          چاپ رسید
        </Link>
      </div>
    </article>
  );
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/70 px-4 py-3">
      <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[#c7a15a]" />
      <div>
        <p className="text-sm font-black text-[#111827]">{title}</p>
        <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{detail}</p>
      </div>
    </div>
  );
}
