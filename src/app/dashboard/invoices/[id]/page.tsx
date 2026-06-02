import {
  ArrowRight,
  ExternalLink,
  FilePenLine,
  FileSignature,
  LockKeyhole,
  MessageSquareWarning,
  ReceiptText,
  Send,
  ShieldCheck,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { sendInvoiceToCustomerAction } from "@/lib/actions/invoice-actions";
import { requireTenantMember } from "@/lib/auth/session";
import { formatJalaliDate, formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { getInvoiceStatusStyle, invoiceLineSourceLabels, invoiceStatusLabels } from "@/lib/invoices/display";
import { getMonthlyCloseLockForEventDate } from "@/lib/monthly-close/monthly-close-lock";
import { getPrisma } from "@/lib/prisma";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ invoice?: string; delivery?: string; adjustment?: string; send?: string; "monthly-locked"?: string }>;
};

export default async function InvoiceDetailPage({ params, searchParams }: InvoiceDetailPageProps) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const { id } = await params;
  const query = await searchParams;

  const invoice = await db.invoice.findFirst({
    where: { id, tenantId: membership.tenantId },
    include: {
      contract: {
        include: {
          customer: { select: { fullName: true, phone: true } },
          hall: { select: { name: true } },
          salon: { select: { name: true } },
          accessLinks: {
            where: { kind: "CUSTOMER_INVOICE", revokedAt: null },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      },
      issuedBy: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      lines: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      customerFeedbacks: { orderBy: { createdAt: "desc" } },
      adjustmentRequests: {
        select: { id: true, status: true, totalPrice: true, title: true, createdAt: true },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!invoice) {
    return <NotFound />;
  }

  const canViewOwnerFinancialControl = membership.role === "OWNER" || membership.role === "ADMIN";
  const monthlyCloseLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: invoice.contract.eventDate,
  });
  const isMonthlyLocked = monthlyCloseLock.locked;

  const deliveryLogs = await db.notificationLog.findMany({
    where: {
      tenantId: membership.tenantId,
      relatedContractId: invoice.contractId,
      eventType: {
        in: [
          "POST_EVENT_INVOICE_LINK_READY",
          "POST_EVENT_INVOICE_DELIVERY_CUSTOMER",
          "POST_EVENT_INVOICE_DELIVERY_MANAGER",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return (
    <section className="space-y-5 sm:space-y-7">
      {query.invoice === "issued" ? <Notice tone="success">صورتحساب بعد از مراسم با موفقیت صادر شد.</Notice> : null}
      {query.invoice === "already-created" ? <Notice tone="success">این صورتحساب قبلاً برای همین قرارداد صادر شده بود.</Notice> : null}
      {query.invoice === "sent" ? <Notice tone="success">لینک امن مشتری ساخته و کانال‌های ارسال فعال بررسی شد. برای امنیت، توکن خام در آدرس داشبورد یا لاگ مدیریتی نمایش داده نمی‌شود.</Notice> : null}
      {query.delivery === "CUSTOMER_SENT" ? <Notice tone="success">پیامک مشتری از کانال فعال ارسال شد و اعلان مدیر/مالک هم در مسیرهای فعال ثبت شد.</Notice> : null}
      {query.delivery === "REVIEW_REQUIRED" ? <Notice tone="danger">بخشی از ارسال صورتحساب ناموفق بود. لاگ ارسال را پایین همین صفحه یا در تنظیمات اعلان‌ها بررسی کنید.</Notice> : null}
      {query.delivery === "NO_CUSTOMER_CHANNEL" ? <Notice tone="danger">لینک ساخته شد، اما کانال ارسال مستقیم به مشتری فعال نبود. لینک را دستی ارسال کنید یا تنظیمات پیامک مشتری را فعال کنید.</Notice> : null}
      {query.send === "monthly-locked" ? <Notice tone="danger">این دوره مالی بسته شده و ارسال/تغییر وضعیت صورتحساب برای آن مجاز نیست.</Notice> : null}
      {isMonthlyLocked ? <Notice tone="danger">ماه مالی {monthlyCloseLock.periodLabel} قفل شده است. تغییرات مالی این فاکتور فقط از مسیر بازگشایی یا فرآیند مجاز مالک امکان‌پذیر خواهد بود.</Notice> : null}

      <div className="overflow-hidden rounded-[1.55rem] border border-[#d8c08b]/65 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_17rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(17,24,39,0.10)] sm:rounded-[2rem] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#17483f]/20 bg-[#25a46d]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
                <ReceiptText size={15} />
                صورتحساب بعد از مراسم
              </span>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${getInvoiceStatusStyle(invoice.status)}`}>
                {invoiceStatusLabels[invoice.status]}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">
              صورتحساب {toPersianDigits(invoice.invoiceNo)}
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49] sm:text-base sm:leading-8">
              قرارداد {toPersianDigits(invoice.contract.contractNo)} · {invoice.contract.customer.fullName} · {formatJalaliDate(invoice.contract.eventDate)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/invoices" className="inline-flex items-center gap-2 rounded-2xl border border-[#d8c08b]/65 bg-white/70 px-4 py-2.5 text-xs font-black text-[#7d6841] transition hover:border-[#c7a15a] sm:text-sm">
              <ArrowRight size={16} />
              صورتحساب‌ها
            </Link>
            {canViewOwnerFinancialControl ? (
              <Link href="/dashboard/owner-financial-audit" className="inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/18 bg-[#fff1f1] px-4 py-2.5 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/34 sm:text-sm">
                <MessageSquareWarning size={16} />
                کنترل مالی مالک
              </Link>
            ) : null}
            {isMonthlyLocked ? (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/20 bg-[#fff1f1] px-4 py-2.5 text-xs font-black text-[#8f2c2c] sm:text-sm">
                <LockKeyhole size={16} /> اصلاح قفل شده
              </span>
            ) : (
              <Link href={`/dashboard/invoices/${invoice.id}/adjustments`} className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-white/80 px-4 py-2.5 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/34 sm:text-sm">
                <FilePenLine size={16} />
                اصلاح فاکتور
                {invoice.adjustmentRequests.some((request) => request.status === "PENDING") ? " · در انتظار مالک" : ""}
              </Link>
            )}
            <Link href={`/dashboard/contracts/${invoice.contract.id}`} className="inline-flex items-center gap-2 rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 py-2.5 text-xs font-black text-[#17483f] transition hover:border-[#17483f]/34 sm:text-sm">
              <FileSignature size={16} />
              قرارداد
            </Link>
          </div>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={UsersRound} label="نفرات قرارداد" value={`${formatPersianNumber(invoice.guestCountContracted)} نفر`} />
        <MetricCard icon={UserRound} label="نفرات واقعی" value={`${formatPersianNumber(invoice.guestCountActual)} نفر`} />
        <MetricCard icon={LockKeyhole} label="حداقل هر نفر اضافه" value={formatIRR(invoice.minimumPerGuestPrice.toString())} />
        <MetricCard icon={ShieldCheck} label="مانده قابل دریافت" value={formatIRR(invoice.payableAmount.toString())} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-[1.35rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-[#17483f]" />
            <h2 className="text-lg font-black text-[#17483f]">ارسال صورتحساب به مشتری</h2>
          </div>
          <p className="mt-2 text-sm font-bold leading-7 text-[#315d52]">
            لینک امن مشتری برای مشاهده صورتحساب و ثبت گزارش محرمانه ساخته می‌شود. مشتری می‌تواند اعلام کند پولی خارج از فاکتور بابت عکاسی، فیلم‌برداری، موزیک، گل‌آرایی یا خدمات دیگر پرداخت کرده است.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isMonthlyLocked ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] px-4 text-sm font-black text-[#8f2c2c]">
                <LockKeyhole size={16} /> ارسال در ماه بسته‌شده غیرفعال است
              </span>
            ) : (
              <form action={sendInvoiceToCustomerAction}>
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <button className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#172033] px-4 text-sm font-black text-[#fff8ea] shadow-[0_12px_30px_rgba(17,32,51,0.22)]">
                  <Send size={16} /> ساخت لینک و ارسال کانال‌های فعال
                </button>
              </form>
            )}
            {invoice.contract.accessLinks[0] ? (
              <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[#17483f]/20 bg-white/70 px-4 text-xs font-black text-[#17483f]">
                <ExternalLink size={15} /> لینک فعال مشتری وجود دارد. فقط پیش‌نمایش توکن قابل مشاهده است: {invoice.contract.accessLinks[0].tokenPreview}
              </span>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
          <div className="flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-[#7d6841]" />
            <h2 className="text-lg font-black text-[#111827]">پاسخ‌های مشتری</h2>
          </div>
          <div className="mt-4 space-y-3">
            {invoice.customerFeedbacks.length > 0 ? invoice.customerFeedbacks.map((feedback) => (
              <div key={feedback.id} className={`rounded-2xl border p-3 text-xs font-bold leading-6 ${feedback.hasExtraPayment || !feedback.invoiceAccepted ? "border-[#b45353]/22 bg-[#fff1f1] text-[#8f2c2c]" : "border-[#25a46d]/24 bg-[#f1fbf5] text-[#17483f]"}`}>
                <p className="font-black">{feedback.invoiceAccepted ? "صورتحساب تأیید شده" : "نیازمند بررسی"}</p>
                {canViewOwnerFinancialControl ? (
                  <>
                    <p>پرداخت خارج از فاکتور: {feedback.hasExtraPayment ? "گزارش شده" : "گزارش نشده"}</p>
                    {feedback.extraPaymentAmount ? <p>مبلغ خارج از فاکتور: {formatIRR(feedback.extraPaymentAmount.toString())}</p> : null}
                    {feedback.extraPaymentReason ? <p>شرح: {feedback.extraPaymentReason}</p> : null}
                    {feedback.confidentialOwnerMessage ? <p>پیام محرمانه: {feedback.confidentialOwnerMessage}</p> : null}
                  </>
                ) : (
                  <p>جزئیات مالی و پیام محرمانه مشتری فقط برای مالک/مدیر قابل مشاهده است.</p>
                )}
                <p className="mt-1 text-[11px] opacity-75">ثبت: {formatJalaliDateTime(feedback.createdAt)}</p>
              </div>
            )) : (
              <p className="rounded-2xl border border-dashed border-[#d8c08b]/65 bg-white/65 p-4 text-sm font-bold leading-7 text-[#6d5f49]">هنوز پاسخی از مشتری ثبت نشده است.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="rounded-[1.35rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:rounded-[1.65rem] sm:p-5">
          <div className="flex items-center gap-2">
            <ReceiptText size={18} className="text-[#7d6841]" />
            <h2 className="text-lg font-black text-[#111827]">ردیف‌های صورتحساب</h2>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#d8c08b]/58">
            <div className="grid grid-cols-[minmax(0,1fr)_6rem_8rem_9rem] gap-2 bg-[#17483f] px-3 py-2 text-xs font-black text-[#fff8ea]">
              <span>شرح</span>
              <span>تعداد</span>
              <span>واحد</span>
              <span>جمع</span>
            </div>
            {invoice.lines.map((line) => (
              <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_6rem_8rem_9rem] gap-2 border-t border-[#d8c08b]/45 bg-white/72 px-3 py-2.5 text-xs font-bold text-[#111827]">
                <div className="min-w-0">
                  <p className="truncate font-black">{line.name}</p>
                  <p className="mt-1 truncate text-[11px] text-[#7d6841]">
                    {invoiceLineSourceLabels[line.sourceType]}{line.isLocked ? " · قفل‌شده" : ""}
                  </p>
                </div>
                <span>{formatPersianNumber(line.quantity)}</span>
                <span>{formatIRR(line.unitPrice.toString())}</span>
                <span className="font-black">{formatIRR(line.totalPrice.toString())}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-3">
          <SummaryCard label="جمع قرارداد" value={formatIRR(invoice.contractSubtotal.toString())} />
          <SummaryCard label="نفرات اضافه" value={formatIRR(invoice.extraGuestTotal.toString())} />
          <SummaryCard label="جمع صورتحساب" value={formatIRR(invoice.subtotal.toString())} strong />
          <SummaryCard label="دریافت‌شده تا زمان صدور" value={formatIRR(invoice.paidAmountAtIssue.toString())} />
          <SummaryCard label="مانده قابل دریافت" value={formatIRR(invoice.payableAmount.toString())} strong />
          <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="font-black text-[#111827]">اطلاعات صدور</p>
            <p className="mt-2">صادرکننده: {invoice.issuedBy.name || invoice.issuedBy.email}</p>
            <p>زمان صدور: {formatJalaliDateTime(invoice.issuedAt)}</p>
            <p>تأییدکننده: {invoice.approvedBy?.name || invoice.approvedBy?.email || "—"}</p>
          </div>
          <div className="rounded-[1.25rem] border border-[#17483f]/20 bg-[#f1fbf5]/95 p-4 text-xs font-bold leading-6 text-[#17483f] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            اصلاح فاکتور فقط از مسیر درخواست و تأیید مالک انجام می‌شود. اصلاح مستقیم، کاهش مبلغ و حذف ردیف قرارداد مجاز نیست.
          </div>
          <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 text-xs font-bold leading-6 text-[#6d5f49] shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
            <p className="font-black text-[#111827]">لاگ ارسال صورتحساب</p>
            <div className="mt-3 space-y-2">
              {deliveryLogs.length > 0 ? deliveryLogs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-[#d8c08b]/50 bg-white/70 p-3">
                  <p className="font-black text-[#111827]">{log.title || log.eventType}</p>
                  <p>کانال: {log.channel} · وضعیت: {log.status}</p>
                  {log.errorMessage ? <p className="text-[#8f2c2c]">خطا: {log.errorMessage}</p> : null}
                  <p className="text-[11px] opacity-75">{formatJalaliDateTime(log.createdAt)}</p>
                </div>
              )) : <p>هنوز لاگ ارسال برای این صورتحساب ثبت نشده است.</p>}
            </div>
          </div>
        </aside>
      </section>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-[#7d6841]">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={17} /></span>
      </div>
      <p className="mt-3 text-lg font-black text-[#111827]">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#17483f]/22 bg-[#f1fbf5] text-[#17483f]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"}`}>
      <p className="text-xs font-black opacity-75">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
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
      <h1 className="text-xl font-black">صورتحساب پیدا نشد.</h1>
      <Link href="/dashboard/invoices" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/22 bg-white px-4 py-2 text-sm font-black">
        <ArrowRight size={16} />
        بازگشت به صورتحساب‌ها
      </Link>
    </section>
  );
}
