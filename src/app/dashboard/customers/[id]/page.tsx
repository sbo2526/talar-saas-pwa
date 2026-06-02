import type { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CreditCard,
  Edit3,
  Eye,
  FileSignature,
  Plus,
  ReceiptText,
  Trash2,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { deleteCustomerAction } from "@/lib/actions/customer-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { contractStatusLabels, getPaidAmount, getRemainingAmount, toNumber } from "@/lib/contracts/display";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { getPaymentRecordStatusLabel, getPaymentRecordStatusStyle, getPaymentTypeLabel, getPaymentTypeStyle, formatPaymentMethodLabel } from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";

type CustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; statusUpdated?: string; customerError?: string }>;
};

type CustomerDetail = Prisma.CustomerGetPayload<{
  include: {
    contracts: {
      include: {
        payments: { select: { amount: true; type: true; status: true } };
      };
    };
    payments: {
      include: {
        contract: { select: { id: true; contractNo: true; eventTypeName: true; eventDate: true } };
        paymentMethod: { select: { title: true; type: true } };
      };
    };
  };
}>;

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;

  const customer = await db.customer.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      contracts: {
        include: {
          payments: { select: { amount: true, type: true, status: true } },
        },
        orderBy: { eventDate: "desc" },
      },
      payments: {
        include: {
          contract: { select: { id: true, contractNo: true, eventTypeName: true, eventDate: true } },
          paymentMethod: { select: { title: true, type: true } },
        },
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!customer) {
    return <CustomerNotFound />;
  }

  const summary = getCustomerSummary(customer);
  const nationalCode = customer.nationalCode ?? customer.nationalId;
  const initial = customer.fullName.trim().slice(0, 1) || "م";
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";
  const canDeleteCustomer = canEdit && summary.contractCount === 0;

  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <Link href="/dashboard/customers" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70">
          <ArrowRight size={15} />
          بازگشت به مشتریان
        </Link>
        <div className="mt-5 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-[#111827] text-3xl font-black text-[#f0dba9] shadow-[0_18px_44px_rgba(17,24,39,0.20)]">{initial}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${customer.isActive ? "border-[#25a46d]/24 bg-[#25a46d]/10 text-[#17483f]" : "border-[#b45353]/20 bg-[#fff1f1] text-[#8f2c2c]"}`}>{customer.isActive ? "فعال" : "غیرفعال"}</span>
              <span className="rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#7d6841]">پرونده مشتری</span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">{customer.fullName}</h1>
            <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">{toPersianDigits(customer.phone)}{nationalCode ? ` · کد ملی ${toPersianDigits(nationalCode)}` : ""}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[22rem]">
            <Link href={`/dashboard/contracts/new?customerId=${customer.id}`} className="btn-luxury-dark min-h-11 px-4 py-2 text-sm"><Plus size={16} />ثبت قرارداد جدید</Link>
            <Link href={`/dashboard/customers/${customer.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"><Edit3 size={16} />ویرایش مشتری</Link>
            {canEdit ? (
              <form action={deleteCustomerAction} className="sm:col-span-2">
                <input type="hidden" name="customerId" value={customer.id} />
                <input type="hidden" name="returnTo" value="/dashboard/customers" />
                <ConfirmSubmitButton
                  confirmMessage={`آیا از حذف این مشتری مطمئن هستید؟ این عملیات قابل بازگشت نیست.
${customer.fullName}${customer.phone ? ` — ${customer.phone}` : ""}`}
                  disabled={!canDeleteCustomer}
                  disabledMessage="این مشتری دارای قرارداد ثبت‌شده است و امکان حذف آن وجود ندارد."
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/24 bg-[#fff1f1]/75 px-4 py-2 text-sm font-black text-[#8f2c2c] transition hover:border-[#b45353]/45 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Trash2 size={16} />
                  حذف مشتری
                </ConfirmSubmitButton>
                {!canDeleteCustomer ? (
                  <p className="mt-1.5 text-[11px] font-bold leading-5 text-[#8f2c2c]">این مشتری دارای قرارداد ثبت‌شده است و امکان حذف آن وجود ندارد.</p>
                ) : null}
              </form>
            ) : null}
          </div>
        </div>
      </div>

      {query.created ? <Notice tone="success">مشتری با موفقیت ثبت شد.</Notice> : null}
      {query.updated ? <Notice tone="success">اطلاعات مشتری ذخیره شد.</Notice> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <KpiCard icon={FileSignature} label="تعداد قراردادها" value={formatPersianNumber(summary.contractCount)} />
        <KpiCard icon={CalendarDays} label="نزدیک‌ترین مراسم" value={summary.nextContract ? formatJalaliDate(summary.nextContract.eventDate) : "ثبت نشده"} />
        <KpiCard icon={ReceiptText} label="مجموع مبلغ قراردادها" value={formatIRR(summary.finalTotal)} />
        <KpiCard icon={CreditCard} label="دریافت‌شده" value={formatIRR(summary.paidAmount)} />
        <KpiCard icon={WalletCards} label="مانده" value={formatIRR(summary.remainingAmount)} />
        <KpiCard icon={Banknote} label="آخرین دریافت" value={summary.lastPayment ? formatJalaliDate(summary.lastPayment.paidAt) : "ثبت نشده"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="space-y-5">
          <InfoSection icon={UserRound} title="اطلاعات هویتی مشتری">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="عنوان" value={customer.salutation} />
              <DetailRow label="نام کامل" value={customer.fullName} />
              <DetailRow label="شماره همراه" value={toPersianDigits(customer.phone)} />
              <DetailRow label="کد ملی" value={nationalCode ? toPersianDigits(nationalCode) : undefined} />
              <DetailRow label="نشانی" value={customer.address} wide />
              <DetailRow label="توضیحات" value={customer.notes} wide />
              <DetailRow label="تاریخ ثبت مشتری" value={formatJalaliDateTime(customer.createdAt)} />
              <DetailRow label="آخرین به‌روزرسانی" value={formatJalaliDateTime(customer.updatedAt)} />
            </div>
          </InfoSection>

          <InfoSection icon={FileSignature} title="سوابق قراردادها">
            {customer.contracts.length > 0 ? (
              <div className="grid gap-3">
                {customer.contracts.map((contract) => {
                  const paid = getPaidAmount(contract.payments, contract.depositAmount);
                  const remaining = contract.status === "CANCELED" ? 0 : getRemainingAmount(contract.finalTotal, paid);
                  return <ContractHistoryCard key={contract.id} contract={contract} paid={paid} remaining={remaining} />;
                })}
              </div>
            ) : (
              <EmptyPanel text="برای این مشتری هنوز قراردادی ثبت نشده است." href={`/dashboard/contracts/new?customerId=${customer.id}`} label="ثبت قرارداد جدید" />
            )}
          </InfoSection>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28">
          <InfoSection icon={Banknote} title="خط زمانی دریافتی‌ها" compact>
            {customer.payments.length > 0 ? (
              <div className="grid gap-3">
                {customer.payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)}
              </div>
            ) : (
              <EmptyPanel text="دریافتی برای این مشتری ثبت نشده است." />
            )}
          </InfoSection>
          <InfoSection icon={CalendarDays} title="فعالیت پرونده" compact>
            <div className="grid gap-3">
              <TimelineItem title="پرونده مشتری ایجاد شد" detail={formatJalaliDateTime(customer.createdAt)} />
              <TimelineItem title="آخرین به‌روزرسانی" detail={formatJalaliDateTime(customer.updatedAt)} />
            </div>
          </InfoSection>
        </aside>
      </div>
    </section>
  );
}

function getCustomerSummary(customer: CustomerDetail) {
  const now = new Date();
  const upcoming = customer.contracts.filter((contract) => contract.eventDate >= now).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  const paidAmount = customer.contracts.reduce((sum, contract) => sum + getPaidAmount(contract.payments, contract.depositAmount), 0);
  const finalTotal = customer.contracts.reduce((sum, contract) => {
    const paid = getPaidAmount(contract.payments, contract.depositAmount);
    return sum + (contract.status === "CANCELED" ? paid : toNumber(contract.finalTotal));
  }, 0);
  const remainingAmount = customer.contracts.reduce((sum, contract) => {
    const paid = getPaidAmount(contract.payments, contract.depositAmount);
    return sum + (contract.status === "CANCELED" ? 0 : getRemainingAmount(contract.finalTotal, paid));
  }, 0);
  return {
    contractCount: customer.contracts.length,
    nextContract: upcoming[0],
    finalTotal,
    paidAmount,
    remainingAmount,
    lastPayment: customer.payments[0],
  };
}

function ContractHistoryCard({ contract, paid, remaining }: { contract: CustomerDetail["contracts"][number]; paid: number; remaining: number }) {
  return (
    <article className="rounded-[1.25rem] border border-[#d8c08b]/52 bg-[#fff8ea]/70 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1 text-xs font-black text-[#fff8ea]">{toPersianDigits(contract.contractNo)}</span>
            <span className="rounded-full border border-[#c7a15a]/32 bg-[#c7a15a]/12 px-3 py-1 text-xs font-black text-[#7d6841]">{contractStatusLabels[contract.status]}</span>
          </div>
          <h3 className="mt-2 text-sm font-black text-[#111827]">{contract.eventTypeName ?? "مراسم ثبت نشده"}</h3>
          <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">{formatJalaliDate(contract.eventDate)}</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs font-black lg:min-w-[24rem]">
          <MiniMoney label="مبلغ نهایی" value={formatIRR(toNumber(contract.finalTotal))} />
          <MiniMoney label="دریافت‌شده" value={formatIRR(paid)} />
          <MiniMoney label="مانده" value={contract.status === "CANCELED" ? "بسته‌شده" : formatIRR(remaining)} alert={contract.status !== "CANCELED" && remaining > 0} />
        </div>
        <Link href={`/dashboard/contracts/${contract.id}`} className="btn-luxury-dark min-h-10 px-4 py-2 text-xs"><Eye size={15} />مشاهده قرارداد</Link>
      </div>
    </article>
  );
}

function PaymentCard({ payment }: { payment: CustomerDetail["payments"][number] }) {
  return (
    <Link href={`/dashboard/payments/${payment.id}`} className="block rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/70 p-3 transition hover:border-[#c7a15a]/70">
      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
      </div>
      <p className="mt-2 text-sm font-black text-[#111827]">{formatIRR(toNumber(payment.amount))}</p>
      <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">{formatJalaliDate(payment.paidAt)} · {formatPaymentMethodLabel(payment.paymentMethod)}</p>
      {payment.contract ? <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">قرارداد {toPersianDigits(payment.contract.contractNo)} · {payment.contract.eventTypeName ?? "مراسم"}</p> : null}
    </Link>
  );
}

function CustomerNotFound() {
  return <section className="rounded-[2rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-6 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.08)]"><h1 className="text-2xl font-black">مشتری پیدا نشد</h1><p className="mt-3 leading-8 text-[#6d5f49]">این مشتری وجود ندارد یا دسترسی شما به آن مجاز نیست.</p><Link href="/dashboard/customers" className="btn-luxury-dark mt-5 px-5 py-3">بازگشت به مشتریان</Link></section>;
}

function InfoSection({ icon: Icon, title, children, compact }: { icon: LucideIcon; title: string; children: ReactNode; compact?: boolean }) {
  return <section className={`rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[2rem] ${compact ? "p-4" : "p-4 sm:p-5"}`}><div className="mb-4 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Icon size={18} /></span><h2 className="text-lg font-black">{title}</h2></div>{children}</section>;
}

function KpiCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <article className="flex min-h-32 flex-col justify-between rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_14px_42px_rgba(17,24,39,0.06)] sm:rounded-[1.55rem] sm:p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black leading-6 text-[#7d6841]">{label}</p><span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Icon size={17} /></span></div><p className="mt-3 break-words text-lg font-black leading-tight sm:text-xl">{value}</p></article>;
}

function DetailRow({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  const hasValue = Boolean(value && value.trim());
  return <div className={`rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/70 px-4 py-3 ${wide ? "md:col-span-2" : ""}`}><p className="text-xs font-black text-[#7d6841]">{label}</p><p className={`mt-1 break-words text-sm font-black leading-7 ${hasValue ? "text-[#111827]" : "text-[#9b8b70]"}`}>{hasValue ? value : "ثبت نشده"}</p></div>;
}

function MiniMoney({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return <div className={`rounded-2xl border px-3 py-2 ${alert ? "border-[#c7a15a]/32 bg-[#c7a15a]/12 text-[#7d6841]" : "border-[#d8c08b]/52 bg-white/50 text-[#111827]"}`}><p className="text-[11px] text-[#7d6841]">{label}</p><p className="mt-1 font-black">{value}</p></div>;
}

function EmptyPanel({ text, href, label }: { text: string; href?: string; label?: string }) {
  return <div className="rounded-2xl border border-dashed border-[#c7a15a]/42 bg-[#fff8ea]/70 p-4 text-sm font-bold leading-7 text-[#6d5f49]"><p>{text}</p>{href && label ? <Link href={href} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#111827]/16 bg-[#111827] px-4 py-2 text-xs font-black text-[#fff8ea]">{label}</Link> : null}</div>;
}

function TimelineItem({ title, detail }: { title: string; detail: string }) {
  return <div className="flex items-start gap-3 rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/70 px-4 py-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-[#c7a15a]" /><div><p className="text-sm font-black text-[#111827]">{title}</p><p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{detail}</p></div></div>;
}

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "danger" }) {
  return <div className={`rounded-3xl border px-5 py-4 text-sm font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>{children}</div>;
}
