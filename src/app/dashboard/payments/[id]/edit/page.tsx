import { ArrowRight, CreditCard } from "lucide-react";
import Link from "next/link";
import { PaymentForm, type PaymentFormContract } from "@/components/dashboard/payments/payment-form";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDayKey } from "@/lib/date/jalali";
import { isPaymentRecordStatus, isPaymentType, paymentMethodTypeLabels, toNumber } from "@/lib/payments/display";
import { calculateContractFinancialState } from "@/lib/finance/contract-financial-state";
import { getPrisma } from "@/lib/prisma";

type EditPaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditPaymentPage({ params }: EditPaymentPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const [payment, methods, customers, contracts] = await Promise.all([
    db.payment.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        contract: true,
        paymentMethod: true,
        installments: { orderBy: { installmentNumber: "asc" } },
        cheques: { orderBy: { dueDate: "asc" } },
      },
    }),
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

  if (!payment) {
    return <PaymentNotFound />;
  }

  const methodOptions = payment.paymentMethod && !methods.some((method: { id: string }) => method.id === payment.paymentMethodId)
    ? [
        {
          id: payment.paymentMethod.id,
          title: payment.paymentMethod.title,
          type: payment.paymentMethod.type,
          isDefault: payment.paymentMethod.isDefault,
        },
        ...methods,
      ]
    : methods;

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
      canReceiveReceipt: financialState.canReceive || contract.id === payment.contractId,
      receiptBlockReason: financialState.blockReason,
    };
  });

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href={`/dashboard/payments/${payment.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به جزئیات دریافت
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
          <CreditCard size={15} />
          ویرایش دریافت
        </div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">ویرایش دریافت</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
          تغییر مبلغ، تاریخ، روش، وضعیت یا اطلاعات رسید با حفظ سوابق و محاسبه دوباره مانده قرارداد انجام می‌شود.
        </p>
      </div>

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-6">
        <PaymentForm
          mode="edit"
          canEdit={canEdit}
          methods={methodOptions.map((method: { id: string; title: string; type: keyof typeof paymentMethodTypeLabels }) => ({ id: method.id, title: method.title, type: method.type }))}
          contracts={contractOptions}
          customers={customers}
          backHref={`/dashboard/payments/${payment.id}`}
          values={{
            id: payment.id,
            contractId: payment.contractId ?? undefined,
            customerId: payment.customerId ?? payment.contract?.customerId ?? undefined,
            paymentMethodId: payment.paymentMethodId ?? methodOptions[0]?.id,
            type: isPaymentType(payment.type) ? payment.type : "DEPOSIT",
            status: isPaymentRecordStatus(payment.status) ? payment.status : "RECORDED",
            amount: String(toNumber(payment.amount)),
            paidAt: formatJalaliDayKey(payment.paidAt),
            referenceNumber: payment.referenceNumber ?? "",
            trackingCode: payment.trackingCode ?? "",
            chequeNumber: payment.chequeNumber ?? payment.cheques[0]?.chequeNumber ?? "",
            chequeDueDate: payment.cheques[0]?.dueDate ? formatJalaliDayKey(payment.cheques[0].dueDate) : payment.chequeDueDate ? formatJalaliDayKey(payment.chequeDueDate) : "",
            chequeBankName: payment.cheques[0]?.bankName ?? "",
            chequeBranchName: payment.cheques[0]?.branchName ?? "",
            chequeOwnerName: payment.cheques[0]?.ownerName ?? "",
            chequeAmount: payment.cheques[0]?.amount ? String(toNumber(payment.cheques[0].amount)) : "",
            chequeStatus: payment.cheques[0]?.status ?? "PENDING",
            installmentCount: payment.installments.length ? String(payment.installments.length) : "3",
            installmentStartDate: payment.installments[0]?.dueDate ? formatJalaliDayKey(payment.installments[0].dueDate) : formatJalaliDayKey(payment.paidAt),
            installmentIntervalDays: "30",
            installments: payment.installments.map((installment) => ({
              amount: String(toNumber(installment.amount)),
              dueDate: formatJalaliDayKey(installment.dueDate),
              status: installment.status === "PAID" || installment.status === "OVERDUE" || installment.status === "CANCELED" ? installment.status : "PENDING",
              notes: installment.notes ?? "",
            })),
            note: payment.note ?? payment.reference ?? "",
            receiptImageUrl: payment.receiptImageUrl,
          }}
        />
      </section>
    </section>
  );
}

function PaymentNotFound() {
  return (
    <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <h1 className="text-2xl font-black">دریافت پیدا نشد</h1>
      <p className="mt-3 leading-8 text-[#6d5f49]">این دریافت وجود ندارد یا دسترسی شما به آن مجاز نیست.</p>
      <Link href="/dashboard/payments" className="btn-luxury-dark mt-5 px-5 py-3">بازگشت به دریافتی‌ها</Link>
    </section>
  );
}
