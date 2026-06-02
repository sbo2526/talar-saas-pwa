import { ArrowRight, FolderTree, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { ExpenseForm, type ExpenseFormContract } from "@/components/dashboard/expenses/expense-form";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDayKey, getTodayJalali } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";

export default async function NewExpensePage() {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const tenantId = membership.tenantId;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const today = getTodayJalali();

  const [categories, paymentMethods, contracts, customers, halls, salons] = await Promise.all([
    db.financialCategory.findMany({
      where: { tenantId, type: "EXPENSE", isActive: true },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    db.paymentMethod.findMany({
      where: { tenantId, isActive: true },
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
    db.hall.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.salon.findMany({ where: { tenantId, isActive: true }, select: { id: true, name: true, hallId: true }, orderBy: { name: "asc" } }),
  ]);

  if (!categories.length) {
    return <NoCategoryState />;
  }

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
      <Header tenantName={membership.tenant.name} />
      <ExpenseForm
        mode="create"
        canEdit={canEdit}
        categories={categories.map((category) => ({ id: category.id, label: category.title }))}
        paymentMethods={paymentMethods.map((method) => ({ id: method.id, title: method.title, type: method.type }))}
        contracts={contractOptions}
        customers={customers.map((customer) => ({ id: customer.id, label: `${customer.fullName} — ${customer.phone}` }))}
        halls={halls.map((hall) => ({ id: hall.id, label: hall.name }))}
        salons={salons.map((salon) => ({ id: salon.id, label: salon.name, hallId: salon.hallId }))}
        values={{
          title: "",
          amount: "",
          occurredAt: formatJalaliDayKey(today),
          status: "RECORDED",
          financialCategoryId: categories[0]?.id,
          paymentMethodId: paymentMethods[0]?.id,
        }}
      />
    </section>
  );
}

function Header({ tenantName }: { tenantName: string }) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
      <Link href="/dashboard/expenses" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
        <ArrowRight size={15} />
        بازگشت به هزینه‌ها
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><ReceiptText size={15} />ثبت هزینه جدید</span>
        <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]">{tenantName}</span>
      </div>
      <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">ثبت هزینه جدید</h1>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
        هزینه عملیاتی، فاکتور خرید، حقوق، خدمات تأمین‌کننده یا هزینه مرتبط با قرارداد را ثبت کنید.
      </p>
    </div>
  );
}

function NoCategoryState() {
  return (
    <section className="rounded-[2rem] border border-dashed border-[#c7a15a]/58 bg-[#fff9ee]/92 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><FolderTree size={22} /></span>
      <h1 className="mt-4 text-2xl font-black">ابتدا دسته‌بندی مالی تعریف کنید</h1>
      <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-[#6d5f49]">
        برای ثبت هزینه‌ها و نمایش دقیق گزارش سود و زیان، حداقل یک دسته‌بندی مالی از نوع هزینه لازم است.
      </p>
      <Link href="/dashboard/financial-categories" className="btn-luxury-primary mt-5 px-5 py-3">
        <Plus size={17} />
        تعریف دسته‌بندی مالی
      </Link>
    </section>
  );
}
