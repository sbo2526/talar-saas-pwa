import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, LockKeyhole, MessageSquareText, ReceiptText, ShieldCheck, UsersRound, type LucideIcon } from "lucide-react";
import { submitCustomerInvoiceFeedbackAction } from "@/lib/actions/invoice-actions";
import { getPortalLinkByToken } from "@/lib/crm/data";
import { formatJalaliDate, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { invoiceLineSourceLabels } from "@/lib/invoices/display";
import { getMonthlyCloseLockForEventDate } from "@/lib/monthly-close/monthly-close-lock";


type MoneyLike = { toString(): string };

type CustomerInvoicePortalLine = {
  id: string;
  name: string;
  sourceType: string;
  quantity: number;
  unitPrice: MoneyLike;
  totalPrice: MoneyLike;
};

type CustomerInvoicePortalLink = {
  id: string;
  tenantId: string;
  contract: {
    eventDate: Date;
    contractNo: string;
    eventTypeName?: string | null;
    tenant?: { name?: string | null; hallProfile?: { brandName?: string | null } | null } | null;
    customer: { fullName: string; phone?: string | null };
    hall?: { name?: string | null } | null;
    salon?: { name?: string | null } | null;
    invoice?: {
      invoiceNo: string;
      guestCountContracted: number;
      guestCountActual: number;
      minimumPerGuestPrice: MoneyLike;
      payableAmount: MoneyLike;
      contractSubtotal: MoneyLike;
      extraGuestTotal: MoneyLike;
      subtotal: MoneyLike;
      paidAmountAtIssue: MoneyLike;
      customerFeedbacks?: unknown[];
      lines: CustomerInvoicePortalLine[];
    } | null;
  };
};

type CustomerInvoicePortalPageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function CustomerInvoicePortalPage({ params, searchParams }: CustomerInvoicePortalPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const link = (await getPortalLinkByToken(token, "CUSTOMER_INVOICE")) as CustomerInvoicePortalLink | null;
  const invoice = link?.contract?.invoice;

  if (!link || !invoice) {
    return <PortalUnavailable />;
  }

  const contract = link.contract;
  const tenantName = contract.tenant?.hallProfile?.brandName ?? contract.tenant?.name ?? "تالار";
  const monthlyCloseLock = await getMonthlyCloseLockForEventDate({
    tenantId: link.tenantId,
    eventDate: contract.eventDate,
  });
  const feedbackSubmitted = Boolean(query.saved) || invoice.customerFeedbacks?.length > 0;
  const feedbackLocked = monthlyCloseLock.locked;

  return (
    <main dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.18),transparent_22rem),linear-gradient(180deg,#fff8ea,#f7ecd2)] px-3 py-5 text-[#111827] sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="overflow-hidden rounded-[2rem] border border-[#d8c08b]/65 bg-white/84 p-5 shadow-[0_18px_62px_rgba(17,24,39,0.08)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/36 bg-[#fff4d8] px-3 py-1 text-xs font-black text-[#7d6841]">
                <ReceiptText size={15} /> صورتحساب بعد از مراسم
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] sm:text-4xl">{tenantName}</h1>
              <p className="mt-2 text-sm font-bold leading-7 text-[#6d5f49]">
                صورتحساب {toPersianDigits(invoice.invoiceNo)} · قرارداد {toPersianDigits(contract.contractNo)} · {contract.customer.fullName}
              </p>
            </div>
            <div className="rounded-2xl border border-[#17483f]/18 bg-[#f1fbf5] px-4 py-3 text-sm font-black text-[#17483f]">
              این صفحه مخصوص مشتری است و پاسخ‌های محرمانه آن برای مالک/مدیر ارشد قابل بررسی است.
            </div>
          </div>
        </section>

        {query.saved ? <Notice tone="success">نظر شما ثبت شد. ممنون، بالاخره یک نفر وسط این چرخه مالی حرف مستقیم را زد.</Notice> : null}
        {query.error === "monthly-locked" ? <Notice tone="danger">ماه مالی این مراسم بسته شده و ثبت پاسخ جدید روی صورتحساب امکان‌پذیر نیست.</Notice> : query.error ? <Notice tone="danger">لینک یا اطلاعات ارسالی معتبر نبود.</Notice> : null}
        {feedbackLocked ? <Notice tone="danger">دوره مالی {monthlyCloseLock.periodLabel} توسط مالک بسته شده است. این صورتحساب فقط برای مشاهده است و فرم جدید ثبت نمی‌شود.</Notice> : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={UsersRound} label="نفرات قرارداد" value={`${formatPersianNumber(invoice.guestCountContracted)} نفر`} />
          <MetricCard icon={UsersRound} label="نفرات نهایی ثبت‌شده" value={`${formatPersianNumber(invoice.guestCountActual)} نفر`} />
          <MetricCard icon={LockKeyhole} label="حداقل هر نفر اضافه" value={formatIRR(invoice.minimumPerGuestPrice.toString())} />
          <MetricCard icon={ShieldCheck} label="مانده قابل پرداخت" value={formatIRR(invoice.payableAmount.toString())} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-[1.55rem] border border-[#d8c08b]/65 bg-white/86 p-4 shadow-[0_16px_46px_rgba(17,24,39,0.07)] sm:p-5">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#7d6841]" />
              <h2 className="text-lg font-black">جزئیات صورتحساب</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="نوع مراسم" value={contract.eventTypeName ?? "—"} />
              <Info label="تاریخ مراسم" value={formatJalaliDate(contract.eventDate)} />
              <Info label="تالار / سالن" value={`${contract.hall?.name ?? "—"} / ${contract.salon?.name ?? "—"}`} />
              <Info label="مشتری" value={contract.customer.fullName} />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#d8c08b]/58">
              <div className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_8rem] gap-2 bg-[#17483f] px-3 py-2 text-xs font-black text-[#fff8ea]">
                <span>شرح</span>
                <span>تعداد</span>
                <span>واحد</span>
                <span>جمع</span>
              </div>
              {invoice.lines.map((line: CustomerInvoicePortalLine) => (
                <div key={line.id} className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_8rem] gap-2 border-t border-[#d8c08b]/45 bg-white/72 px-3 py-2.5 text-xs font-bold text-[#111827]">
                  <div className="min-w-0">
                    <p className="truncate font-black">{line.name}</p>
                    <p className="mt-1 truncate text-[11px] text-[#7d6841]">{invoiceLineSourceLabels[line.sourceType as keyof typeof invoiceLineSourceLabels] ?? line.sourceType}</p>
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
            <SummaryCard label="مانده قابل پرداخت" value={formatIRR(invoice.payableAmount.toString())} strong />
          </aside>
        </section>

        <section className="rounded-[1.65rem] border border-[#d8c08b]/65 bg-[#fff9ee]/96 p-4 shadow-[0_18px_52px_rgba(17,24,39,0.08)] sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#172033] text-[#fff8ea]"><MessageSquareText size={18} /></span>
            <div>
              <h2 className="text-lg font-black">تأیید، اعتراض یا گزارش محرمانه برای مالک</h2>
              <p className="mt-1 text-sm font-bold leading-7 text-[#6d5f49]">اگر بابت خدمات جانبی، عکاسی، فیلم‌برداری، موزیک، گل‌آرایی یا موردی خارج از این صورتحساب مبلغی پرداخت کرده‌اید، اینجا ثبت کنید. این بخش برای کنترل شفافیت مالی مالک است، نه برای تزئین صفحه با فرم‌های بی‌خاصیت.</p>
            </div>
          </div>

          {feedbackLocked ? (
            <div className="mt-4 rounded-2xl border border-[#b45353]/22 bg-[#fff1f1] p-4 text-sm font-black leading-7 text-[#8f2c2c]">
              ماه مالی این مراسم بسته شده است و ثبت پاسخ جدید روی صورتحساب فعال نیست.
            </div>
          ) : feedbackSubmitted ? (
            <div className="mt-4 rounded-2xl border border-[#25a46d]/24 bg-[#f1fbf5] p-4 text-sm font-black leading-7 text-[#17483f]">
              پاسخ مشتری برای این صورتحساب ثبت شده است. برای جلوگیری از چندبار ثبت و خراب‌شدن گزارش، فرم دوباره نمایش داده نمی‌شود.
            </div>
          ) : (
            <form action={submitCustomerInvoiceFeedbackAction} className="mt-5 grid gap-4">
              <input type="hidden" name="token" value={token} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="fullName" label="نام و نام خانوادگی" defaultValue={contract.customer.fullName} />
                <Input name="mobile" label="شماره تماس" defaultValue={contract.customer.phone ?? ""} />
              </div>
              <Select name="invoiceAccepted" label="آیا مبلغ و ردیف‌های صورتحساب را تأیید می‌کنید؟">
                <option value="YES">بله، تأیید می‌کنم</option>
                <option value="NO">خیر، نیاز به بررسی دارد</option>
              </Select>
              <Textarea name="disputeMessage" label="اگر مبلغ یا ردیفی را قبول ندارید، دقیق بنویسید" />

              <QuestionBlock icon={UsersRound} title="نفرات اضافه">
                <Checkbox name="hadExtraGuests" label="در روز مراسم تعداد مهمان‌ها بیشتر از قرارداد بود" />
                <Input name="actualGuestCount" label="اگر می‌دانید، تعداد واقعی تقریبی مهمان‌ها" />
              </QuestionBlock>

              <QuestionBlock icon={AlertTriangle} title="پرداخت خارج از صورتحساب">
                <Checkbox name="hasExtraPayment" label="غیر از مبلغ این صورتحساب، بابت خدمات تالار مبلغ دیگری پرداخت شده است" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input name="extraPaymentAmount" label="مبلغ پرداختی خارج از صورتحساب" />
                  <Input name="extraPaymentReceiver" label="مبلغ به چه شخص/واحدی پرداخت شد؟" />
                  <Input name="extraPaymentReason" label="بابت چه خدمتی بود؟" />
                  <Select name="extraPaymentMethod" label="روش پرداخت">
                    <option value="">انتخاب نشده</option>
                    <option value="CASH">نقدی</option>
                    <option value="CARD">کارتخوان</option>
                    <option value="CARD_TO_CARD">کارت‌به‌کارت</option>
                    <option value="BANK_TRANSFER">واریز بانکی</option>
                    <option value="UNKNOWN">نامشخص</option>
                  </Select>
                </div>
              </QuestionBlock>

              <QuestionBlock icon={CheckCircle2} title="خدمات جانبی مراسم">
                <div className="grid gap-3 lg:grid-cols-2">
                  <ServiceLine service="photography" title="عکاسی" />
                  <ServiceLine service="videography" title="فیلم‌برداری" />
                  <ServiceLine service="music" title="موزیک / DJ / گروه موسیقی" />
                  <ServiceLine service="decoration" title="گل‌آرایی / دکور" />
                </div>
                <Checkbox name="hadOtherServices" label="خدمات جانبی دیگری هم دریافت شد" />
                <Textarea name="otherServicesDescription" label="شرح خدمات جانبی دیگر" />
                <Input name="otherServicesAmount" label="مبلغ خدمات جانبی دیگر، اگر جداگانه پرداخت شده" />
              </QuestionBlock>

              <Textarea name="confidentialOwnerMessage" label="توضیح محرمانه برای مالک / مدیر ارشد" />
              <button className="min-h-12 rounded-2xl bg-[#172033] px-5 text-sm font-black text-[#fff8ea] shadow-[0_14px_34px_rgba(17,32,51,0.22)]">ثبت پاسخ و ارسال برای مالک</button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function PortalUnavailable() {
  return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#fff8ea] p-6 text-center"><div className="max-w-lg rounded-3xl border border-[#d8c08b]/70 bg-white p-6 shadow-xl"><h1 className="text-xl font-black">لینک صورتحساب معتبر نیست</h1><p className="mt-3 text-sm font-bold leading-7 text-[#7d6841]">لینک ممکن است منقضی، لغوشده یا اشتباه باشد.</p></div></main>;
}

function Notice({ tone, children }: { tone: "success" | "danger"; children: ReactNode }) {
  return <div className={`rounded-2xl border p-4 text-sm font-black leading-7 ${tone === "success" ? "border-[#25a46d]/22 bg-[#f1fbf5] text-[#17483f]" : "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]"}`}>{children}</div>;
}

function MetricCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-[#fff9ee]/95 p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)]"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-[#7d6841]">{label}</p><span className="flex size-9 items-center justify-center rounded-2xl bg-[#c7a15a]/12 text-[#7d6841]"><Icon size={17} /></span></div><p className="mt-3 text-lg font-black text-[#111827]">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#d8c08b]/60 bg-[#fff8ea]/75 p-3"><p className="text-xs font-black text-[#7d6841]">{label}</p><p className="mt-1 text-sm font-black text-[#111827]">{value}</p></div>;
}

function SummaryCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`rounded-[1.25rem] border p-4 shadow-[0_14px_40px_rgba(17,24,39,0.06)] ${strong ? "border-[#17483f]/22 bg-[#f1fbf5] text-[#17483f]" : "border-[#d8c08b]/60 bg-[#fff9ee]/95 text-[#111827]"}`}><p className="text-xs font-black opacity-75">{label}</p><p className="mt-2 text-lg font-black">{value}</p></div>;
}

function Input({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><input name={name} defaultValue={defaultValue} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]" /></label>;
}

function Textarea({ name, label }: { name: string; label: string }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><textarea name={name} rows={4} className="rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 py-2 text-sm font-bold leading-7 text-[#111827]" /></label>;
}

function Select({ name, label, children }: { name: string; label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-xs font-black text-[#7d6841]"><span>{label}</span><select name={name} className="min-h-11 rounded-2xl border border-[#d8c08b]/70 bg-[#fffdf8] px-3 text-sm font-bold text-[#111827]">{children}</select></label>;
}

function Checkbox({ name, label }: { name: string; label: string }) {
  return <label className="flex items-center gap-2 rounded-2xl border border-[#d8c08b]/60 bg-white/72 px-3 py-2 text-xs font-black text-[#6d5f49]"><input type="checkbox" name={name} />{label}</label>;
}

function QuestionBlock({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return <div className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-white/70 p-4"><div className="mb-3 flex items-center gap-2 text-[#111827]"><Icon size={17} className="text-[#7d6841]" /><h3 className="text-sm font-black">{title}</h3></div><div className="grid gap-3">{children}</div></div>;
}

function ServiceLine({ service, title }: { service: "photography" | "videography" | "music" | "decoration"; title: string }) {
  return <div className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff8ea]/62 p-3"><Checkbox name={`had${capitalize(service)}`} label={`${title} داشتیم`} /><Checkbox name={`${service}PaidSeparately`} label="برای این مورد جداگانه مبلغ پرداخت شد" /><div className="mt-2"><Input name={`${service}Amount`} label="مبلغ جداگانه، اگر پرداخت شده" /></div></div>;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
