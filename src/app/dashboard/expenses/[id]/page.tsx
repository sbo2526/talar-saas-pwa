import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  Edit3,
  FileText,
  FolderTree,
  Landmark,
  ReceiptText,
  UserRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelExpenseAction } from "@/lib/actions/expense-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import {
  getExpenseChequeStatusLabel,
  getExpenseChequeStatusStyle,
  getExpenseStatusLabel,
  getExpenseStatusStyle,
  getExpenseStatusTone,
} from "@/lib/expenses/display";
import { formatIRR } from "@/lib/formatters";
import { formatPaymentMethodLabel } from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";

type ExpenseDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; canceled?: string }>;
};

function toNumber(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export default async function ExpenseDetailPage({ params, searchParams }: ExpenseDetailPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const flags = await searchParams;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const expense = await db.expense.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      financialCategory: { select: { title: true, color: true } },
      paymentMethod: { select: { title: true, type: true } },
      contract: { select: { id: true, contractNo: true, title: true, eventDate: true } },
      customer: { select: { id: true, fullName: true, phone: true } },
      hall: { select: { id: true, name: true } },
      salon: { select: { id: true, name: true } },
      cheques: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!expense) notFound();

  const cheque = expense.cheques[0];

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href="/dashboard/expenses" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به هزینه‌ها
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><ReceiptText size={15} />پرونده هزینه</span>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getExpenseStatusStyle(expense.status)}`}>{getExpenseStatusLabel(expense.status)}</span>
          {cheque ? <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getExpenseChequeStatusStyle(cheque.status)}`}>هزینه چکی · {getExpenseChequeStatusLabel(cheque.status)}</span> : null}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <h1 className="text-2xl font-black leading-tight sm:text-4xl">{expense.title}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49]">{getExpenseStatusTone(expense.status)}</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#172033]/10 bg-[#172033] px-5 py-4 text-[#fff8ea]">
            <p className="text-xs font-black text-[#f0dba9]">مبلغ هزینه</p>
            <p className="mt-1 text-2xl font-black">{formatIRR(toNumber(expense.amount))}</p>
          </div>
        </div>
      </div>

      {flags.created ? <Alert>هزینه با موفقیت ثبت شد.</Alert> : null}
      {flags.updated ? <Alert>تغییرات هزینه با موفقیت ذخیره شد.</Alert> : null}
      {flags.canceled ? <Alert>هزینه لغو شد و در گزارش‌ها محاسبه نمی‌شود.</Alert> : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <h2 className="text-xl font-black text-[#172033]">جزئیات مالی</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard icon={<CalendarDays size={17} />} label="تاریخ وقوع" value={formatJalaliDate(expense.occurredAt)} />
            <InfoCard icon={<FolderTree size={17} />} label="دسته‌بندی" value={expense.financialCategory?.title ?? "بدون دسته‌بندی"} />
            <InfoCard icon={<Landmark size={17} />} label="روش پرداخت" value={expense.paymentMethod ? formatPaymentMethodLabel(expense.paymentMethod) : "ثبت نشده"} />
            <InfoCard icon={<Banknote size={17} />} label="شماره فاکتور / مرجع" value={expense.referenceNumber ? toPersianDigits(expense.referenceNumber) : "ثبت نشده"} />
            <InfoCard icon={<UserRound size={17} />} label="فروشنده / دریافت‌کننده" value={expense.vendorName ?? "ثبت نشده"} />
            <InfoCard icon={<CalendarDays size={17} />} label="آخرین به‌روزرسانی" value={formatJalaliDateTime(expense.updatedAt)} />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <h2 className="text-xl font-black text-[#172033]">ارتباطات</h2>
          <div className="mt-4 grid gap-3">
            <InfoCard icon={<FileText size={17} />} label="قرارداد" value={expense.contract ? toPersianDigits(expense.contract.contractNo) : "بدون قرارداد"} href={expense.contract ? `/dashboard/contracts/${expense.contract.id}` : undefined} />
            <InfoCard icon={<UserRound size={17} />} label="مشتری" value={expense.customer?.fullName ?? "بدون مشتری"} href={expense.customer ? `/dashboard/customers/${expense.customer.id}` : undefined} />
            <InfoCard icon={<Building2 size={17} />} label="تالار / سالن" value={[expense.hall?.name, expense.salon?.name].filter(Boolean).join(" / ") || "ثبت نشده"} />
          </div>
        </section>
      </div>

      {cheque ? (
        <section className="rounded-[1.75rem] border border-[#c7a15a]/46 bg-[#fff7e6]/90 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
          <h2 className="text-xl font-black text-[#172033]">اطلاعات چک هزینه</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={<Banknote size={17} />} label="شماره چک" value={toPersianDigits(cheque.chequeNumber)} />
            <InfoCard icon={<CalendarDays size={17} />} label="تاریخ سررسید" value={formatJalaliDate(cheque.dueDate)} />
            <InfoCard icon={<Banknote size={17} />} label="مبلغ چک" value={formatIRR(toNumber(cheque.amount))} />
            <InfoCard icon={<FileText size={17} />} label="وضعیت چک" value={getExpenseChequeStatusLabel(cheque.status)} />
            <InfoCard icon={<Landmark size={17} />} label="بانک" value={cheque.bankName ?? "ثبت نشده"} />
            <InfoCard icon={<Landmark size={17} />} label="شعبه" value={cheque.branchName ?? "ثبت نشده"} />
            <InfoCard icon={<UserRound size={17} />} label="دریافت‌کننده چک" value={cheque.recipientName ?? "ثبت نشده"} />
            <InfoCard icon={<FileText size={17} />} label="توضیحات چک" value={cheque.notes ?? "ثبت نشده"} />
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.75rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-4 shadow-[0_14px_42px_rgba(17,24,39,0.055)] sm:p-5">
        <h2 className="text-xl font-black text-[#172033]">رسید و توضیحات</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[1.35rem] border border-dashed border-[#d8c08b]/58 bg-white/50 p-4 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#172033] text-[#f0dba9]"><FileText size={21} /></span>
            <p className="mt-3 text-sm font-black text-[#172033]">{expense.receiptImageUrl ? "رسید ثبت شده است" : "رسیدی ثبت نشده است"}</p>
            {expense.receiptImageUrl ? <a href={expense.receiptImageUrl} target="_blank" rel="noreferrer" className="btn-luxury-dark mt-4 px-5 py-3 text-sm">مشاهده رسید</a> : null}
          </div>
          <div className="rounded-[1.35rem] border border-[#d8c08b]/46 bg-white/50 p-4">
            <p className="text-xs font-black text-[#7d6841]">توضیحات</p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-8 text-[#172033]">{expense.note || expense.description || "توضیحی ثبت نشده است."}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 rounded-[1.4rem] border border-[#c7a15a]/30 bg-[linear-gradient(135deg,rgba(23,31,43,0.98),rgba(12,20,31,0.98))] p-3 text-[#fff8ea] shadow-[0_18px_70px_rgba(17,24,39,0.22)] sm:grid-cols-3">
        <Link href="/dashboard/expenses" className="btn-luxury-secondary justify-center border-white/10 bg-white/8 px-5 py-3 text-[#fff8ea] hover:bg-white/12">بازگشت به هزینه‌ها</Link>
        <Link href={`/dashboard/expenses/${expense.id}/edit`} className="btn-luxury-primary justify-center px-5 py-3"><Edit3 size={17} />ویرایش</Link>
        {canEdit && expense.status !== "CANCELED" ? (
          <form action={cancelExpenseAction}>
            <input type="hidden" name="expenseId" value={expense.id} />
            <input type="hidden" name="returnTo" value={`/dashboard/expenses/${expense.id}`} />
            <button className="btn-luxury-secondary w-full justify-center border-[#b45353]/20 bg-[#fff1f1] px-5 py-3 text-[#8f2c2c]" type="submit"><XCircle size={17} />لغو هزینه</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function InfoCard({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const body = <><p className="inline-flex items-center gap-2 text-[11px] font-black text-[#7d6841]">{icon}{label}</p><p className="mt-1 text-sm font-black text-[#172033]">{value}</p></>;
  if (href) return <Link href={href} className="rounded-2xl border border-[#d8c08b]/46 bg-white/50 px-4 py-3 transition hover:border-[#c7a15a]/70">{body}</Link>;
  return <div className="rounded-2xl border border-[#d8c08b]/46 bg-white/50 px-4 py-3">{body}</div>;
}

function Alert({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-[#25a46d]/24 bg-[#25a46d]/10 px-4 py-3 text-sm font-black text-[#17483f]">{children}</div>;
}
