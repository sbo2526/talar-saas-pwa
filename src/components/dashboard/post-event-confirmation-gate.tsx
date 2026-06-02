import Link from "next/link";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, FileWarning, XCircle } from "lucide-react";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { formatJalaliDate } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";

type PostEventConfirmationGateItem = {
  id: string;
  contractNo: string;
  customerName: string;
  eventTypeName: string | null;
  eventDate: Date;
  eventStartTime: string | null;
  guestCount: number;
  finalTotal: unknown;
  hallName: string | null;
  salonName: string | null;
  daysOverdue: number;
};

export function PostEventConfirmationGate({
  items,
  totalCount,
  startDate,
}: {
  items: PostEventConfirmationGateItem[];
  totalCount: number;
  startDate: Date;
}) {
  if (totalCount === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.55rem] border border-[#b45353]/28 bg-[linear-gradient(145deg,rgba(255,241,241,0.98),rgba(255,249,238,0.96))] p-4 text-[#111827] shadow-[0_22px_70px_rgba(180,83,83,0.14)] sm:rounded-[2rem] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#b45353]/24 bg-[#b45353]/10 px-3 py-1.5 text-xs font-black text-[#8f2c2c]">
            <AlertTriangle size={15} />
            تعیین تکلیف اجباری بعد از مراسم
          </span>
          <h2 className="mt-3 text-xl font-black leading-8 text-[#111827] sm:text-2xl">
            {formatPersianNumber(totalCount)} قراردادِ گذشته هنوز وضعیت برگزاری ندارد.
          </h2>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-[#6d5f49]">
            برای کنترل مالی تالار، فقط مراسم از {formatJalaliDate(startDate)} به بعد در این اجبار نمایش داده می‌شود. مراسم گذشته باید فقط با یکی از دو مسیر قطعی ثبت شود: برگزار شده یا برگزار نشده. مسیر انتقال تاریخ فقط وقتی فعال می‌شود که درخواست معتبر از قبل و حداقل ۱۰ روز پیش از مراسم ثبت و تأیید شده باشد؛ در این نسخه مسیر معتبر انتقال در پروژه پیدا نشد و دکمه‌ای برای آن نمایش داده نمی‌شود.
          </p>
        </div>
        <Link href="/dashboard/contracts" className="inline-flex items-center gap-2 rounded-2xl border border-[#b45353]/18 bg-white/70 px-4 py-2.5 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/36 sm:text-sm">
          مشاهده قراردادها
          <ArrowLeft size={16} />
        </Link>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-[1.25rem] border border-[#d8c08b]/60 bg-white/76 p-3.5 shadow-[0_14px_40px_rgba(17,24,39,0.06)] sm:rounded-[1.55rem] sm:p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#111827]/12 bg-[#111827]/7 px-2.5 py-1 text-[11px] font-black text-[#172033]">
                    <CalendarClock size={13} />
                    {formatJalaliDate(item.eventDate)}
                    {item.eventStartTime ? ` · ${item.eventStartTime}` : ""}
                  </span>
                  <span className="inline-flex rounded-full border border-[#b45353]/20 bg-[#fff1f1] px-2.5 py-1 text-[11px] font-black text-[#8f2c2c]">
                    {formatPersianNumber(item.daysOverdue)} روز گذشته
                  </span>
                </div>
                <h3 className="mt-2 text-base font-black leading-7 text-[#111827] sm:text-lg">
                  قرارداد {item.contractNo} · {item.customerName}
                </h3>
                <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49] sm:text-sm">
                  {item.eventTypeName || "نوع مراسم ثبت نشده"}
                  {item.hallName ? ` · ${item.hallName}` : ""}
                  {item.salonName ? ` · ${item.salonName}` : ""}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <MiniFact label="تعداد مهمان قرارداد" value={`${formatPersianNumber(item.guestCount)} نفر`} />
                  <MiniFact label="مبلغ قرارداد" value={formatIRR(String(item.finalTotal ?? ""))} />
                  <MiniFact label="مسیر بعدی" value="ثبت قطعی وضعیت" />
                </div>
              </div>

              <div className="grid gap-2">
                <form action={confirmPostEventAction} className="rounded-2xl border border-[#25a46d]/22 bg-[#eefaf3]/78 p-3">
                  <input type="hidden" name="contractId" value={item.id} />
                  <input type="hidden" name="decision" value="HELD" />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#17483f] px-4 py-2 text-sm font-black text-[#f7fff9] transition hover:bg-[#10372f]">
                    <CheckCircle2 size={17} />
                    بله، برگزار شده
                  </button>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[#17483f]">
                    بعد از تأیید، سیستم مستقیم صفحه صدور صورتحساب از روی داده‌های قرارداد را باز می‌کند.
                  </p>
                </form>

                <form action={confirmPostEventAction} className="rounded-2xl border border-[#b45353]/22 bg-[#fff1f1]/78 p-3">
                  <input type="hidden" name="contractId" value={item.id} />
                  <input type="hidden" name="decision" value="NOT_HELD" />
                  <label className="mb-2 grid gap-1.5 text-[11px] font-black text-[#8f2c2c]">
                    مبلغ دستی کنسلی / خسارت
                    <input name="cancellationAmount" inputMode="numeric" placeholder="اختیاری، مثلاً 50000000" className="min-h-10 rounded-xl border border-[#b45353]/24 bg-white/85 px-3 py-2 text-right text-xs font-black text-[#111827] outline-none transition focus:border-[#8f2c2c]/50" />
                  </label>
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#8f2c2c] px-4 py-2 text-sm font-black text-[#fff7f7] transition hover:bg-[#762424]">
                    <XCircle size={17} />
                    خیر، برگزار نشده
                  </button>
                  <p className="mt-2 text-[11px] font-bold leading-5 text-[#8f2c2c]">
                    اگر مبلغ دستی وارد شود، همان مبلغ مبنای کنسلی و گزارش مالک می‌شود؛ در غیر این صورت محاسبه سیاست کنسلی استفاده می‌شود.
                  </p>
                </form>

                <Link href={`/dashboard/contracts/${item.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#d8b76a] bg-[#fff7e6] px-3 py-2 text-xs font-black text-[#4a3514] transition hover:border-[#c7a15a]">
                  <FileWarning size={15} />
                  مشاهده جزئیات قرارداد
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d8c08b]/55 bg-[#fff9ee]/80 p-3">
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className="mt-1 text-sm font-black leading-6 text-[#111827]">{value}</p>
    </div>
  );
}
