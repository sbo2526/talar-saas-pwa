import { ArrowRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm, type ExpenseFormContract } from "@/components/dashboard/expenses/expense-form";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate } from "@/lib/date/jalali";
import { isExpenseStatus } from "@/lib/expenses/display";
import { getPrisma } from "@/lib/prisma";

type EditExpensePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const expense = await db.expense.findFirst({
    where: { id, tenantId },
    include: { paymentMethod: { select: { id: true } }, cheques: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!expense) notFound();

  const [categories, paymentMethods, contracts, customers, halls, salons] = await Promise.all([
    db.financialCategory.findMany({
      where: { tenantId, type: "EXPENSE", OR: [{ isActive: true }, { id: expense.financialCategoryId ?? "" }] },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    db.paymentMethod.findMany({
      where: { tenantId, OR: [{ isActive: true }, { id: expense.paymentMethodId ?? "" }] },
      select: { id: true, title: true, type: true, isDefault: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { title: "asc" }],
    }),
    db.contract.findMany({
      where: { tenantId },
      select: {
        id: true,
        contractNo: true,
        customerId: true,
        eventDate: true,
        hallId: true,
        salonId: true,
        finalTotal: true,
        customer: { select: { fullName: true } },
        hall: { select: { name: true } },
        salon: { select: { name: true } },
      },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    db.customer.findMany({ where: { tenantId }, select: { id: true, fullName: true, phone: true }, orderBy: { fullName: "asc" }, take: 300 }),
    db.hall.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.salon.findMany({ where: { tenantId }, select: { id: true, name: true, hallId: true }, orderBy: { name: "asc" } }),
  ]);

  const contractOptions: ExpenseFormContract[] = contracts.map((contract) => ({
    id: contract.id,
    contractNo: contract.contractNo,
    customerId: contract.customerId,
    customerName: contract.customer.fullName,
    eventDateLabel: formatJalaliDate(contract.eventDate),
    hallId: contract.hallId,
    hallName: contract.hall?.name,
    salonId: contract.salonId,
    salonName: contract.salon?.name,
    finalTotal: contract.finalTotal?.toString(),
  }));

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href={`/dashboard/expenses/${expense.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به جزئیات هزینه
        </Link>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><ReceiptText size={15} />ویرایش هزینه</div>
        <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">ویرایش هزینه</h1>
        <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">اطلاعات مالی، ارتباطات و رسید این هزینه را به‌روزرسانی کنید.</p>
      </div>
      <ExpenseForm
        mode="edit"
        canEdit={canEdit}
        categories={categories.map((category) => ({ id: category.id, label: category.title }))}
        paymentMethods={paymentMethods.map((method) => ({ id: method.id, title: method.title, type: method.type }))}
        contracts={contractOptions}
        customers={customers.map((customer) => ({ id: customer.id, label: `${customer.fullName} — ${customer.phone}` }))}
        halls={halls.map((hall) => ({ id: hall.id, label: hall.name }))}
        salons={salons.map((salon) => ({ id: salon.id, label: salon.name, hallId: salon.hallId }))}
        values={{
          id: expense.id,
          title: expense.title,
          amount: expense.amount.toString(),
          occurredAt: expense.occurredAt,
          status: isExpenseStatus(expense.status) ? expense.status : "RECORDED",
          financialCategoryId: expense.financialCategoryId,
          paymentMethodId: expense.paymentMethodId,
          contractId: expense.contractId,
          customerId: expense.customerId,
          hallId: expense.hallId,
          salonId: expense.salonId,
          vendorName: expense.vendorName,
          referenceNumber: expense.referenceNumber,
          note: expense.note ?? expense.description,
          receiptImageUrl: expense.receiptImageUrl,
          chequeNumber: expense.cheques[0]?.chequeNumber,
          chequeDueDate: expense.cheques[0]?.dueDate,
          chequeBankName: expense.cheques[0]?.bankName,
          chequeBranchName: expense.cheques[0]?.branchName,
          chequeRecipientName: expense.cheques[0]?.recipientName,
          chequeAmount: expense.cheques[0]?.amount.toString(),
          chequeStatus: expense.cheques[0]?.status,
        }}
      />
    </section>
  );
}
