import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CreditCard,
  FileImage,
  FileText,
  Landmark,
  Pencil,
  ReceiptText,
  ShieldCheck,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cancelPaymentAction } from "@/lib/actions/payment-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { PaymentPrintButton } from "@/components/dashboard/payments/payment-print-button";
import { contractStatusLabels } from "@/lib/contracts/display";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  formatReference,
  getContractPaidAmount,
  getContractRemainingAmount,
  getPaymentRecordStatusLabel,
  getPaymentRecordStatusStyle,
  getPaymentTypeLabel,
  getPaymentTypeStyle,
  toNumber,
} from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";

type PaymentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; canceled?: string; paymentError?: string }>;
};

export default async function PaymentDetailPage({ params, searchParams }: PaymentDetailPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;
  const canEdit = membership.role === "OWNER" || membership.role === "ADMIN";

  const payment = await db.payment.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      customer: true,
      paymentMethod: true,
      installments: { orderBy: { installmentNumber: "asc" } },
      cheques: { orderBy: { dueDate: "asc" } },
      contract: {
        include: {
          customer: true,
          hall: { select: { name: true } },
          salon: { select: { name: true } },
          payments: { select: { amount: true, type: true, status: true } },
        },
      },
    },
  });

  if (!payment) {
    return <PaymentNotFound />;
  }

  const customer = payment.customer ?? payment.contract?.customer;
  const contractPaid = payment.contract ? getContractPaidAmount(payment.contract.payments, payment.contract.depositAmount) : 0;
  const contractRemaining = payment.contract ? getContractRemainingAmount(payment.contract.finalTotal, contractPaid) : 0;

  return (
    <section className="space-y-5 sm:space-y-7 print:bg-white print:text-black">
      <div className="overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_80px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6 print:rounded-none print:border-0 print:shadow-none">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
          <div>
            <Link href="/dashboard/payments" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 print:hidden">
              <ArrowRight size={15} />
              بازگشت به دریافتی‌ها
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#111827]/14 bg-[#111827] px-3 py-1.5 text-xs font-black text-[#fff8ea]"><CreditCard size={15} />رسید دریافت</span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getPaymentTypeStyle(payment.type)}`}>{getPaymentTypeLabel(payment.type)}</span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getPaymentRecordStatusStyle(payment.status)}`}>{getPaymentRecordStatusLabel(payment.status)}</span>
            </div>
            <h1 className="mt-4 text-2xl font-black leading-tight sm:text-4xl">دریافت {formatIRR(toNumber(payment.amount))}</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              {customer?.fullName ?? "مشتری ثبت نشده"} · {payment.contract ? `قرارداد ${toPersianDigits(payment.contract.contractNo)}` : "دریافت مستقل"} · {formatJalaliDate(payment.paidAt)}
            </p>
          </div>
          <div className="grid gap-2 rounded-[1.45rem] border border-[#111827]/10 bg-[#111827] p-4 text-[#fff8ea] print:hidden">
            <PaymentPrintButton className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#f0dba9]/24 bg-white/[0.06] px-4 py-2 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60" />
            <Link href={`/dashboard/payments/${payment.id}/edit`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#f0dba9]/24 bg-white/[0.06] px-4 py-2 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60"><Pencil size={16} />ویرایش</Link>
            {canEdit && payment.status !== "CANCELED" ? (
              <form action={cancelPaymentAction}>
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="returnTo" value={`/dashboard/payments/${payment.id}`} />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/24 bg-[#b45353]/12 px-4 py-2 text-sm font-black text-[#ffecec] transition hover:border-[#b45353]/45"><XCircle size={16} />لغو دریافت</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>

      {query.created ? <Notice tone="success">دریافت با موفقیت ثبت شد.</Notice> : null}
      {query.updated ? <Notice tone="success">تغییرات دریافت ذخیره شد.</Notice> : null}
      {query.canceled ? <Notice tone="success">دریافت لغو شد و در جمع دریافت‌شده قرارداد محاسبه نمی‌شود.</Notice> : null}
      {query.paymentError ? <Notice tone="danger">درخواست دریافت معتبر نبود یا دسترسی شما مجاز نیست.</Notice> : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <SummaryCard icon={Banknote} label="مبلغ" value={formatIRR(toNumber(payment.amount))} />
        <SummaryCard icon={CreditCard} label="نوع دریافت" value={getPaymentTypeLabel(payment.type)} />
        <SummaryCard icon={ShieldCheck} label="وضعیت" value={getPaymentRecordStatusLabel(payment.status)} />
        <SummaryCard icon={CalendarDays} label="تاریخ دریافت" value={formatJalaliDate(payment.paidAt)} />
        <SummaryCard icon={Landmark} label="روش دریافت" value={formatPaymentMethodLabel(payment.paymentMethod)} />
        <SummaryCard icon={ReceiptText} label="کد/مرجع" value={formatReference(payment)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="space-y-5">
          <InfoSection icon={UserRound} title="اطلاعات مشتری">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="نام کامل" value={customer?.fullName} />
              <DetailRow label="شماره همراه" value={customer?.phone ? toPersianDigits(customer.phone) : undefined} />
              <DetailRow label="کد ملی" value={customer?.nationalCode || customer?.nationalId ? toPersianDigits(customer?.nationalCode ?? customer?.nationalId ?? "") : undefined} />
              <DetailRow label="نشانی" value={customer?.address} wide />
            </div>
          </InfoSection>

          <InfoSection icon={FileText} title="قرارداد مرتبط">
            {payment.contract ? (
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="شماره قرارداد" value={toPersianDigits(payment.contract.contractNo)} />
                <DetailRow label="وضعیت قرارداد" value={contractStatusLabels[payment.contract.status]} />
                <DetailRow label="نوع مراسم" value={payment.contract.eventTypeName} />
                <DetailRow label="تاریخ مراسم" value={formatJalaliDate(payment.contract.eventDate)} />
                <DetailRow label="تالار" value={payment.contract.hall?.name} />
                <DetailRow label="سالن" value={payment.contract.salon?.name} />
                <div className="md:col-span-2">
                  <Link href={`/dashboard/contracts/${payment.contract.id}`} className="btn-luxury-dark px-5 py-3">مشاهده قرارداد</Link>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-[#c7a15a]/42 bg-[#fff8ea]/70 p-4 text-sm font-bold leading-7 text-[#6d5f49]">این دریافت به قرارداد مشخصی متصل نیست.</p>
            )}
          </InfoSection>


          {payment.installments.length ? (
            <InfoSection icon={CalendarDays} title="برنامه اقساط">
              <div className="overflow-hidden rounded-[1.2rem] border border-[#d8c08b]/52 bg-[#fff8ea]/68">
                <div className="hidden grid-cols-[5rem_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(12rem,1fr)] gap-2 border-b border-[#d8c08b]/42 bg-[#111827]/6 px-3 py-2 text-xs font-black text-[#17483f] lg:grid">
                  <span>شماره</span>
                  <span>مبلغ</span>
                  <span>سررسید</span>
                  <span>وضعیت</span>
                  <span>توضیحات</span>
                </div>
                <div className="grid gap-2 p-3">
                  {payment.installments.map((installment) => (
                    <div key={installment.id} className="grid gap-2 rounded-2xl border border-[#d8c08b]/42 bg-white/55 px-3 py-2 text-xs font-bold leading-6 text-[#6d5f49] lg:grid-cols-[5rem_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(12rem,1fr)] lg:items-center">
                      <span className="font-black text-[#17483f]">قسط {formatPersianNumber(installment.installmentNumber)}</span>
                      <span>{formatIRR(toNumber(installment.amount))}</span>
                      <span>{formatJalaliDate(installment.dueDate)}</span>
                      <span>{getInstallmentStatusLabel(installment.status)}</span>
                      <span>{installment.notes || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </InfoSection>
          ) : null}

          <InfoSection icon={Landmark} title="جزئیات روش و رسید">
            <div className="grid gap-3 md:grid-cols-2">
              <DetailRow label="روش دریافت" value={formatPaymentMethodLabel(payment.paymentMethod)} />
              <DetailRow label="کد پیگیری" value={payment.trackingCode ? toPersianDigits(payment.trackingCode) : undefined} />
              <DetailRow label="مرجع دریافت" value={payment.referenceNumber ? toPersianDigits(payment.referenceNumber) : undefined} />
              <DetailRow label="شماره چک" value={payment.chequeNumber ? toPersianDigits(payment.chequeNumber) : payment.cheques[0]?.chequeNumber ? toPersianDigits(payment.cheques[0].chequeNumber) : undefined} />
              <DetailRow label="سررسید چک" value={payment.cheques[0]?.dueDate ? formatJalaliDate(payment.cheques[0].dueDate) : payment.chequeDueDate ? formatJalaliDate(payment.chequeDueDate) : undefined} />
              <DetailRow label="وضعیت چک" value={payment.cheques[0] ? getChequeStatusLabel(payment.cheques[0].status) : undefined} />
              <DetailRow label="مبلغ چک" value={payment.cheques[0] ? formatIRR(toNumber(payment.cheques[0].amount)) : undefined} />
              <DetailRow label="توضیحات" value={payment.note || payment.reference} wide />
              <div className="md:col-span-2">
                {payment.receiptImageUrl ? (
                  <a href={payment.receiptImageUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#25a46d]/22 bg-[#25a46d]/10 px-4 py-2 text-sm font-black text-[#17483f]"><FileImage size={16} />مشاهده فایل رسید</a>
                ) : (
                  <p className="rounded-2xl border border-dashed border-[#c7a15a]/42 bg-[#fff8ea]/70 p-4 text-sm font-bold leading-7 text-[#6d5f49]">فایل رسید برای این دریافت ثبت نشده است.</p>
                )}
              </div>
            </div>
          </InfoSection>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-28">
          <section className="rounded-[1.6rem] border border-[#c7a15a]/28 bg-[linear-gradient(145deg,rgba(23,31,43,0.98),rgba(11,15,23,0.98))] p-4 text-[#fff8ea] shadow-[0_22px_80px_rgba(17,24,39,0.22)] sm:rounded-[2rem]">
            <h2 className="text-lg font-black">خلاصه مالی قرارداد</h2>
            <div className="mt-4 grid gap-2">
              <DarkRow label="مبلغ دریافتی" value={formatIRR(toNumber(payment.amount))} />
              <DarkRow label="دریافت‌شده قرارداد" value={payment.contract ? formatIRR(contractPaid) : "—"} />
              <DarkRow label="مانده قرارداد" value={payment.contract ? formatIRR(contractRemaining) : "—"} strong />
              <DarkRow label="ثبت" value={formatJalaliDateTime(payment.createdAt)} />
              <DarkRow label="آخرین تغییر" value={formatJalaliDateTime(payment.updatedAt)} />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}


function getChequeStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "CLEARED":
      return "وصول‌شده";
    case "BOUNCED":
      return "برگشتی";
    case "CANCELED":
      return "لغوشده";
    case "TRANSFERRED":
      return "خرج‌شده / واگذار شده";
    default:
      return "در انتظار وصول";
  }
}

function getInstallmentStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "PAID":
      return "دریافت‌شده";
    case "OVERDUE":
      return "سررسید گذشته";
    case "CANCELED":
      return "لغوشده";
    default:
      return "در انتظار دریافت";
  }
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

function Notice({ children, tone }: { children: ReactNode; tone: "success" | "danger" }) {
  return <div className={`rounded-3xl border px-5 py-4 text-sm font-black ${tone === "success" ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#17483f]" : "border-[#b45353]/18 bg-[#fff1f1] text-[#8f2c2c]"}`}>{children}</div>;
}

function SummaryCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <article className="rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-3.5 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-4">
      <span className="flex size-9 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Icon size={17} /></span>
      <p className="mt-3 text-xs font-black leading-6 text-[#7d6841]">{label}</p>
      <p className="mt-2 break-words text-base font-black leading-tight sm:text-lg">{value}</p>
    </article>
  );
}

function InfoSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.6rem] border border-[#d8c08b]/62 bg-[#fff9ee]/96 p-4 text-[#111827] shadow-[0_18px_56px_rgba(17,24,39,0.07)] sm:rounded-[2rem] sm:p-5">
      <div className="mb-4 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#f0dba9]"><Icon size={18} /></span><h2 className="text-lg font-black">{title}</h2></div>
      {children}
    </section>
  );
}

function DetailRow({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  const displayValue = value && value.trim() ? value : "ثبت نشده";
  return (
    <div className={`rounded-2xl border border-[#d8c08b]/52 bg-[#fff8ea]/70 px-4 py-3 ${wide ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 break-words text-sm font-black leading-7 text-[#111827]">{displayValue}</p>
    </div>
  );
}

function DarkRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${strong ? "border-[#f0dba9]/28 bg-[#f0dba9]/12" : "border-white/[0.08] bg-white/[0.05]"}`}>
      <span className="text-sm font-bold text-[#d9caa9]">{label}</span>
      <span className="text-sm font-black text-[#fff9ed]">{value}</span>
    </div>
  );
}
