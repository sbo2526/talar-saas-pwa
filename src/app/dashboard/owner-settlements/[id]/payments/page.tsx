import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { registerOwnerSettlementPaymentAction } from "@/lib/actions/owner-settlement-actions";
import { getOwnerSettlementPaymentContext } from "@/lib/owner-settlements/data";
import { formatIRR } from "@/lib/formatters";
import { toNumber } from "@/lib/owner-settlements/rules";

export default async function OwnerSettlementPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { settlement } = await getOwnerSettlementPaymentContext(id);
  if (!settlement) notFound();
  const blocked = settlement.status === "LOCKED" || settlement.status === "CANCELLED";

  return (
    <section className="space-y-5" dir="rtl">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2.25rem] sm:p-7">
        <Link href={`/dashboard/owner-settlements/${settlement.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]"><ArrowRight size={15} /> بازگشت</Link>
        <h1 className="mt-4 text-2xl font-black sm:text-4xl">ثبت پرداخت به مالک</h1>
        <p className="mt-3 text-sm font-bold leading-8 text-[#6d5f49]">مبلغ قابل پرداخت: {formatIRR(toNumber(settlement.finalPayableToOwnerAmount))} · مانده: {formatIRR(toNumber(settlement.remainingPayableAmount))}</p>
      </div>

      {blocked ? <div className="rounded-2xl border border-[#b42318]/25 bg-[#fef3f2] p-4 text-sm font-black text-[#7a271a]">برای تسویه قفل‌شده یا لغوشده، ثبت پرداخت جدید مجاز نیست.</div> : (
        <form action={registerOwnerSettlementPaymentAction} className="grid gap-4 rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-5 sm:rounded-[2rem] sm:p-6">
          <input type="hidden" name="settlementId" value={settlement.id} />
          <label className="grid gap-2 text-sm font-black text-[#111827]">مبلغ پرداختی<input name="paidAmount" required className="input-luxury" inputMode="numeric" /></label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">تاریخ پرداخت<input name="paymentDate" required type="date" className="input-luxury" /></label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">روش پرداخت<input name="paymentMethod" required className="input-luxury" placeholder="کارت به کارت، نقدی، حواله..." /></label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">شماره پیگیری<input name="referenceNumber" className="input-luxury" /></label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">یادداشت<textarea name="note" rows={3} className="input-luxury" /></label>
          <p className="rounded-2xl border border-[#c7a15a]/34 bg-[#fff7e6] p-3 text-xs font-black leading-6 text-[#7a4a12]">آپلود رسید در فاز ۳۲ فقط به صورت placeholder نگه داشته شده و به خزانه/بانک/سند حسابداری وصل نمی‌شود.</p>
          <button type="submit" className="btn-luxury-primary justify-center">ثبت پرداخت به مالک</button>
        </form>
      )}
    </section>
  );
}
