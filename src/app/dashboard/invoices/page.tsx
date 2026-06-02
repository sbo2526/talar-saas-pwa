import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  ReceiptText,
  ShieldCheck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getInvoiceStatusStyle, invoiceStatusLabels } from "@/lib/invoices/display";
import { getOwnerOperationStartDateForTenant } from "@/lib/post-event/post-event-decision-gate";
import { getPrisma } from "@/lib/prisma";

const postEventActionableStatuses = ["RESERVED", "CONFIRMED", "COMPLETED"] as const;
const postEventDecisionGraceHours = 24;

type OperationCenterContract = {
  id: string;
  contractNo: string;
  eventDate: Date;
  eventStartTime: string | null;
  eventTypeName: string | null;
  guestCount: number;
  finalTotal: { toString(): string };
  remainingAmount: { toString(): string };
  customer: { fullName: string };
  hall: { name: string } | null;
  salon: { name: string } | null;
};

function subtractHours(date: Date, hours: number) {
  return new Date(date.getTime() - hours * 60 * 60 * 1000);
}

export default async function InvoicesPage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const ownerOperationStartDate = await getOwnerOperationStartDateForTenant(membership.tenantId);
  const dueEventDateCutoff = subtractHours(new Date(), postEventDecisionGraceHours);

  const [invoices, readyForInvoiceContracts, needsConfirmationContracts] = await Promise.all([
    db.invoice.findMany({
      where: { tenantId: membership.tenantId },
      include: {
        contract: {
          select: {
            id: true,
            contractNo: true,
            eventDate: true,
            eventTypeName: true,
            customer: { select: { fullName: true } },
          },
        },
      },
      orderBy: [{ issuedAt: "desc" }],
      take: 50,
    }),
    db.contract.findMany({
      where: {
        tenantId: membership.tenantId,
        status: { in: [...postEventActionableStatuses] },
        eventDate: { gte: ownerOperationStartDate, lt: dueEventDateCutoff },
        invoice: { is: null },
        postEventConfirmation: { is: { status: "HELD", invoiceRequired: true } },
      },
      select: operationCenterContractSelect(),
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    db.contract.findMany({
      where: {
        tenantId: membership.tenantId,
        status: { in: [...postEventActionableStatuses] },
        eventDate: { gte: ownerOperationStartDate, lt: dueEventDateCutoff },
        invoice: { is: null },
        postEventConfirmation: { is: null },
      },
      select: operationCenterContractSelect(),
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  const totals = invoices.reduce(
    (acc, invoice) => {
      acc.count += 1;
      acc.subtotal += Number(invoice.subtotal.toString());
      acc.payable += Number(invoice.payableAmount.toString());
      acc.extraGuests += invoice.extraGuestCount;
      return acc;
    },
    { count: 0, subtotal: 0, payable: 0, extraGuests: 0 },
  );

  return (
    <section className="space-y-3.5 sm:space-y-4">
      <div className="overflow-hidden rounded-[1.15rem] border border-[#d8c08b]/58 bg-[radial-gradient(circle_at_8%_0%,rgba(199,161,90,0.10),transparent_12rem),linear-gradient(145deg,rgba(255,249,238,0.98),rgba(248,239,219,0.94))] p-3.5 text-[#111827] shadow-[0_10px_30px_rgba(17,24,39,0.055)] sm:rounded-[1.35rem] sm:p-4">
        <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#17483f]/16 bg-[#25a46d]/10 px-2.5 py-1 text-[10px] font-black text-[#17483f]">
              <ReceiptText size={13} />
              مرکز صدور فاکتور بعد از مراسم
            </span>
            <h1 className="mt-1.5 text-[1.45rem] font-black leading-tight sm:text-2xl">صورتحساب‌ها</h1>
            <p className="mt-1 max-w-2xl text-xs font-bold leading-6 text-[#6d5f49] sm:text-sm">
              این صفحه فاکتورهای صادرشده و قراردادهای گذشته بدون فاکتور را برای اقدام سریع و کنترل‌شده نمایش می‌دهد.
            </p>
          </div>
          <Link href="/dashboard/contracts" className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#d8c08b]/65 bg-white/82 px-3.5 py-2 text-xs font-black text-[#7d6841] shadow-[0_6px_16px_rgba(17,24,39,0.035)] transition hover:border-[#c7a15a] sm:w-auto">
            قراردادها
            <ArrowLeft size={15} />
          </Link>
        </div>
      </div>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ReceiptText} label="تعداد صورتحساب" value={formatPersianNumber(totals.count)} />
        <MetricCard icon={WalletCards} label="جمع صورتحساب‌ها" value={formatIRR(totals.subtotal)} />
        <MetricCard icon={ShieldCheck} label="مانده قابل دریافت" value={formatIRR(totals.payable)} />
        <MetricCard icon={UsersRound} label="جمع نفرات اضافه" value={`${formatPersianNumber(totals.extraGuests)} نفر`} />
      </section>

      <PostEventInvoiceOperationCenter
        readyForInvoiceContracts={readyForInvoiceContracts}
        needsConfirmationContracts={needsConfirmationContracts}
      />

      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[1.05rem] border border-[#d8c08b]/48 bg-[#fff9ee]/84 px-3 py-2.5 shadow-[0_8px_22px_rgba(17,24,39,0.035)]">
          <div>
            <span className="text-[10px] font-black text-[#7d6841]">بایگانی فاکتور</span>
            <h2 className="mt-0.5 flex items-center gap-2 text-base font-black text-[#111827]"><ReceiptText size={17} /> فاکتورهای صادرشده</h2>
          </div>
          <span className="rounded-full border border-[#d8c08b]/62 bg-white/76 px-2.5 py-1 text-[11px] font-black text-[#7d6841]">
            آخرین {toPersianDigits("50")} فاکتور
          </span>
        </div>
        {invoices.length > 0 ? (
          invoices.map((invoice) => (
            <Link key={invoice.id} href={`/dashboard/invoices/${invoice.id}`} className="group rounded-[1.05rem] border border-[#d8c08b]/52 bg-[#fff9ee]/94 p-3 text-[#111827] shadow-[0_8px_24px_rgba(17,24,39,0.045)] transition hover:-translate-y-0.5 hover:border-[#c7a15a]/72 sm:rounded-[1.2rem]">
              <div className="grid items-center gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111827]/12 bg-white/72 px-2.5 py-1 text-[11px] font-black text-[#172033]">
                      <ReceiptText size={13} />
                      {toPersianDigits(invoice.invoiceNo)}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${getInvoiceStatusStyle(invoice.status)}`}>
                      {invoiceStatusLabels[invoice.status]}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-sm font-black leading-6 sm:text-base">
                    قرارداد {toPersianDigits(invoice.contract.contractNo)} · {invoice.contract.customer.fullName}
                  </h2>
                  <p className="mt-0.5 text-[11px] font-bold leading-5 text-[#6d5f49]">
                    {invoice.contract.eventTypeName || "نوع مراسم ثبت نشده"} · {formatJalaliDate(invoice.contract.eventDate)} · صدور {formatJalaliDateTime(invoice.issuedAt)}
                  </p>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-3 xl:min-w-[16rem]">
                  <MiniFact label="جمع" value={formatIRR(invoice.subtotal.toString())} />
                  <MiniFact label="مانده" value={formatIRR(invoice.payableAmount.toString())} />
                  <MiniFact label="نفر اضافه" value={formatPersianNumber(invoice.extraGuestCount)} />
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-[#d8c08b]/70 bg-[#fff9ee]/88 p-5 text-center text-[#6d5f49]">
            <ReceiptText className="mx-auto text-[#c7a15a]" size={32} />
            <h2 className="mt-3 text-lg font-black text-[#111827]">هنوز صورتحسابی صادر نشده است.</h2>
            <p className="mt-2 text-sm font-bold leading-7">از مرکز عملیاتی بالا، اول برگزاری مراسم را ثبت کنید و بعد فاکتور قطعی را صادر کنید.</p>
          </div>
        )}
      </section>
    </section>
  );
}

function operationCenterContractSelect() {
  return {
    id: true,
    contractNo: true,
    eventDate: true,
    eventStartTime: true,
    eventTypeName: true,
    guestCount: true,
    finalTotal: true,
    remainingAmount: true,
    customer: { select: { fullName: true } },
    hall: { select: { name: true } },
    salon: { select: { name: true } },
  } as const;
}

function PostEventInvoiceOperationCenter({
  readyForInvoiceContracts,
  needsConfirmationContracts,
}: {
  readyForInvoiceContracts: OperationCenterContract[];
  needsConfirmationContracts: OperationCenterContract[];
}) {
  const hasAction = readyForInvoiceContracts.length > 0 || needsConfirmationContracts.length > 0;

  return (
    <section className="rounded-[1.15rem] border border-[#d8c08b]/54 bg-[#fff9ee]/94 p-3 text-[#111827] shadow-[0_10px_28px_rgba(17,24,39,0.05)] sm:rounded-[1.35rem] sm:p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#d8c08b]/34 pb-2.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-black sm:text-base"><ClipboardCheck size={17} /> مرکز عملیاتی صدور فاکتور</h2>
          <p className="mt-0.5 max-w-3xl text-[11px] font-bold leading-5 text-[#7d6841]">
            قراردادهای گذشته از مسیر امن «تأیید برگزاری ← پیش‌نمایش فاکتور ← صدور فاکتور» عبور می‌کنند.
          </p>
        </div>
        <span className="rounded-full border border-[#17483f]/18 bg-[#f1fbf5] px-2.5 py-1 text-[11px] font-black text-[#17483f]">
          {formatPersianNumber(readyForInvoiceContracts.length + needsConfirmationContracts.length)} اقدام باز
        </span>
      </div>

      {hasAction ? (
        <div className="mt-2.5 grid items-stretch gap-2.5 xl:grid-cols-2">
          <ActionColumn title="آماده صدور فاکتور" hint="برگزاری ثبت شده اما فاکتور هنوز صادر نشده است." count={readyForInvoiceContracts.length}>
            {readyForInvoiceContracts.length > 0 ? readyForInvoiceContracts.map((contract) => (
              <ReadyForInvoiceCard key={contract.id} contract={contract} />
            )) : <EmptyActionText>مورد آماده صدور فاکتور وجود ندارد.</EmptyActionText>}
          </ActionColumn>

          <ActionColumn title="نیازمند ثبت برگزاری" hint="قرارداد گذشته یا تسویه‌شده است، اما تعیین‌تکلیف بعد از مراسم ندارد." count={needsConfirmationContracts.length}>
            {needsConfirmationContracts.length > 0 ? needsConfirmationContracts.map((contract) => (
              <NeedsConfirmationCard key={contract.id} contract={contract} />
            )) : <EmptyActionText>مورد نیازمند ثبت برگزاری وجود ندارد.</EmptyActionText>}
          </ActionColumn>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-3 text-sm font-black leading-7 text-[#17483f]">
          فعلاً قرارداد گذشته بدون فاکتور یا بدون تعیین‌تکلیف پیدا نشد.
        </div>
      )}
    </section>
  );
}

function ActionColumn({ title, hint, count, children }: { title: string; hint: string; count: number; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-[1.05rem] border border-[#d8c08b]/48 bg-white/58 p-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#d8c08b]/26 pb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-[#111827]">{title}</h3>
          <p className="mt-0.5 text-[11px] font-bold leading-5 text-[#7d6841]">{hint}</p>
        </div>
        <span className="rounded-full border border-[#d8c08b]/58 bg-[#fff8ea] px-2.5 py-1 text-[11px] font-black text-[#7d6841]">{formatPersianNumber(count)} مورد</span>
      </div>
      <div className="mt-2 grid flex-1 content-start gap-2">{children}</div>
    </div>
  );
}

function ReadyForInvoiceCard({ contract }: { contract: OperationCenterContract }) {
  return (
    <div className="rounded-[0.95rem] border border-[#17483f]/14 bg-[#f1fbf5]/78 p-2.5 text-xs font-bold leading-6 text-[#17483f]">
      <ContractActionHeader contract={contract} />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
        <Link href={`/dashboard/contracts/${contract.id}/invoice`} className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#17483f] px-3 py-1.5 text-[11px] font-black text-[#f7fff9] transition hover:bg-[#10372f] sm:w-auto">
          <ReceiptText size={13} className="shrink-0" />
          <span className="whitespace-nowrap">پیش‌نمایش و صدور فاکتور</span>
        </Link>
      </div>
    </div>
  );
}

function NeedsConfirmationCard({ contract }: { contract: OperationCenterContract }) {
  return (
    <div className="rounded-[0.95rem] border border-[#c7a15a]/32 bg-[#fff8ea]/78 p-2.5 text-xs font-bold leading-6 text-[#7d6841]">
      <ContractActionHeader contract={contract} />
      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
        <form action={confirmPostEventAction} className="w-full sm:w-auto">
          <input type="hidden" name="contractId" value={contract.id} />
          <input type="hidden" name="decision" value="HELD" />
          <input type="hidden" name="note" value="ثبت برگزاری از مرکز صدور فاکتور بعد از مراسم." />
          <ConfirmSubmitButton
            confirmTitle="ثبت برگزاری مراسم"
            confirmLabel="ثبت و ادامه صدور فاکتور"
            confirmTone="success"
            confirmMessage={`برای قرارداد ${toPersianDigits(contract.contractNo)} وضعیت مراسم «برگزار شده» ثبت می‌شود و بلافاصله صفحه پیش‌نمایش فاکتور باز خواهد شد.`}
            className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#17483f] px-3 py-1.5 text-[11px] font-black text-[#f7fff9] transition hover:bg-[#10372f] sm:w-auto"
          >
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="whitespace-nowrap">ثبت برگزاری و صدور</span>
          </ConfirmSubmitButton>
        </form>
        <Link href={`/dashboard/contracts/${contract.id}`} className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[#d8c08b]/58 bg-white/76 px-3 py-1.5 text-[11px] font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 sm:w-auto">
          <FileSignature size={13} className="shrink-0" />
          <span className="whitespace-nowrap">جزئیات قرارداد</span>
        </Link>
      </div>
    </div>
  );
}

function ContractActionHeader({ contract }: { contract: OperationCenterContract }) {
  const place = [contract.hall?.name, contract.salon?.name].filter(Boolean).join(" / ") || "محل ثبت نشده";
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <p className="text-xs font-black leading-5 text-[#111827] sm:text-sm">قرارداد {toPersianDigits(contract.contractNo)} · {contract.customer.fullName}</p>
        <span className="rounded-full border border-[#d8c08b]/44 bg-white/62 px-2 py-0.5 text-[10px] font-black text-[#7d6841]">
          {contract.eventTypeName || "نوع مراسم ثبت نشده"}
        </span>
      </div>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
        <MiniFact label="تاریخ / مهمان" value={`${formatJalaliDate(contract.eventDate)} · ${formatPersianNumber(contract.guestCount)} نفر`} />
        <MiniFact label="مبلغ قرارداد" value={formatIRR(contract.finalTotal.toString())} />
        <MiniFact label="مانده فعلی" value={formatIRR(contract.remainingAmount.toString())} />
      </div>
      <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#d8c08b]/42 bg-white/58 px-2.5 py-0.5 text-[10px] font-black text-[#7d6841]">
        <CalendarDays size={12} />
        {place}
      </p>
    </div>
  );
}

function EmptyActionText({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-[#d8c08b]/62 bg-[#fff9ee]/70 p-3 text-center text-xs font-black leading-6 text-[#7d6841]">{children}</p>;
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-h-[4.15rem] items-start gap-2.5 rounded-[0.95rem] border border-[#d8c08b]/52 bg-[#fff9ee]/93 px-3 py-2.5 text-right shadow-[0_7px_18px_rgba(17,24,39,0.032)]">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[0.75rem] border border-[#d8c08b]/42 bg-white/76 text-[#7d6841] shadow-[0_4px_10px_rgba(17,24,39,0.022)]">
        <Icon size={14} strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black leading-4 text-[#7d6841]">{label}</p>
        <p className="mt-0.5 truncate text-sm font-black leading-6 text-[#111827] sm:text-[0.95rem]">{value}</p>
      </div>
    </div>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-[0.8rem] border border-[#d8c08b]/44 bg-white/76 px-2 py-1.5 text-[11px] font-black text-[#111827]">
      <span className="block text-[9px] leading-4 text-[#7d6841]">{label}</span>
      <span className="mt-0.5 block leading-5">{value}</span>
    </span>
  );
}
