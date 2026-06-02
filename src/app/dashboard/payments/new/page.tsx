import type { ReactNode } from "react";
import { ArrowRight, Banknote, CalendarDays, CreditCard, Landmark, UserRound } from "lucide-react";
import Link from "next/link";
import { PaymentForm, type PaymentFormContract } from "@/components/dashboard/payments/payment-form";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDayKey, getTodayJalali, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR } from "@/lib/formatters";
import { calculateContractFinancialState } from "@/lib/finance/contract-financial-state";
import { getPrisma } from "@/lib/prisma";

type NewPaymentPageProps = {
  searchParams: Promise<{ contractId?: string }>;
};

export default async function NewPaymentPage({ searchParams }: NewPaymentPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const params = await searchParams;
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const today = getTodayJalali();

  const [methods, customers, contracts] = await Promise.all([
    db.paymentMethod.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, title: true, type: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    }),
    db.customer.findMany({
      where: { tenantId },
      select: { id: true, fullName: true, phone: true },
      orderBy: { fullName: "asc" },
      take: 300,
    }),
    db.contract.findMany({
      where: { tenantId },
      select: {
        id: true,
        contractNo: true,
        customerId: true,
        eventDate: true,
        finalTotal: true,
        depositAmount: true,
        status: true,
        customer: { select: { fullName: true, phone: true } },
        payments: { select: { amount: true, type: true, status: true } },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
  ]);

  if (!methods.length) {
    return <NoPaymentMethodState />;
  }

  const contractOptions: PaymentFormContract[] = contracts.map((contract) => {
    const financialState = calculateContractFinancialState(contract);

    return {
      id: contract.id,
      contractNo: contract.contractNo,
      customerId: contract.customerId,
      customerName: contract.customer.fullName,
      customerPhone: contract.customer.phone,
      eventDateLabel: formatJalaliDate(contract.eventDate),
      finalTotal: financialState.finalTotal,
      paidAmount: financialState.receivedTotal,
      remainingAmount: financialState.remainingAmount,
      financialState: financialState.state,
      financialStateLabel: financialState.label,
      canReceiveReceipt: financialState.canReceive,
      receiptBlockReason: financialState.blockReason,
    };
  });
  const selectedContract = contractOptions.find((contract) => contract.id === params.contractId);

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href="/dashboard/payments" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به دریافتی‌ها
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
            <CreditCard size={15} />
            ثبت دریافت جدید
          </span>
          <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">
            {membership.tenant.name}
          </span>
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">ثبت دریافت جدید</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
          دریافت بیعانه، قسط، تسویه یا سایر دریافتی‌های مرتبط با قرارداد را ثبت کنید.
        </p>
        {selectedContract ? (
          <div className="mt-5 rounded-[1.35rem] border border-[#25a46d]/20 bg-[#25a46d]/10 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm font-black text-[#17483f]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#25a46d]/22 bg-white/50 px-3 py-1.5">
                <UserRound size={15} />
                قرارداد {toPersianDigits(selectedContract.contractNo)} — {selectedContract.customerName}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <HeaderChip icon={<CalendarDays size={15} />} label="تاریخ مراسم" value={selectedContract.eventDateLabel} />
              <HeaderChip icon={<Banknote size={15} />} label="مبلغ نهایی" value={formatIRR(selectedContract.finalTotal)} />
              <HeaderChip icon={<CreditCard size={15} />} label="دریافت‌شده" value={formatIRR(selectedContract.paidAmount)} />
              <HeaderChip icon={<Landmark size={15} />} label="مانده قابل دریافت" value={formatIRR(Math.max(0, selectedContract.remainingAmount))} emphasis />
              <HeaderChip icon={<Banknote size={15} />} label="وضعیت تسویه" value={selectedContract.financialStateLabel} emphasis={!selectedContract.canReceiveReceipt} />
            </div>
          </div>
        ) : null}
      </div>

      <PaymentForm
        mode="create"
        canEdit={canEdit}
        methods={methods.map((method) => ({ id: method.id, title: method.title, type: method.type }))}
        contracts={contractOptions}
        customers={customers}
        values={{
          contractId: selectedContract?.id,
          customerId: selectedContract?.customerId,
          paymentMethodId: methods[0]?.id,
          type: "DEPOSIT",
          status: "RECORDED",
          amount: "",
          paidAt: formatJalaliDayKey(today),
        }}
      />
    </section>
  );
}

function HeaderChip({
  icon,
  label,
  value,
  emphasis,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-3 py-2 ${emphasis ? "border-[#25a46d]/24 bg-[#25a46d]/12" : "border-white/55 bg-white/48"}`}>
      <p className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#7d6841]">{icon}{label}</p>
      <p className={`mt-1 text-sm font-black ${emphasis ? "text-[#17483f]" : "text-[#111827]"}`}>{value}</p>
    </div>
  );
}

function NoPaymentMethodState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Landmark size={22} /></span>
      <h1 className="mt-4 text-2xl font-black">ابتدا روش دریافت تعریف کنید</h1>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#6d5f49]">
        برای ثبت دریافت‌ها، ابتدا روش‌های دریافت مانند نقدی، کارت‌خوان، حواله یا چک را در تعاریف پایه ثبت کنید.
      </p>
      <Link href="/dashboard/payment-methods" className="btn-luxury-primary mt-5 px-5 py-3">
        تعریف روش دریافت
      </Link>
    </section>
  );
}
