import { ArrowRight, Calculator } from "lucide-react";
import Link from "next/link";
import { calculateOwnerMonthlySettlementAction } from "@/lib/actions/owner-settlement-actions";
import { getOwnerSettlementCreateContext } from "@/lib/owner-settlements/data";
import { getOwnerSettlementOperationModelLabel } from "@/lib/owner-settlements/options";

export default async function NewOwnerSettlementPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { agreements } = await getOwnerSettlementCreateContext();
  const query = await searchParams;
  const now = new Date();

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/owner-settlements" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]">
          <ArrowRight size={15} />
          بازگشت
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-black sm:text-4xl"><Calculator size={28} /> محاسبه تسویه ماهانه</h1>
        <p className="mt-3 text-sm font-bold leading-8 text-[#6d5f49]">دوره داخلی بر اساس ماه میلادی ذخیره می‌شود و در UI با تاریخ جلالی نمایش داده می‌شود. مبنای درآمد مراسم، تاریخ مراسم قرارداد است.</p>
      </div>

      {query.error ? <div className="rounded-2xl border border-[#b42318]/25 bg-[#fef3f2] p-4 text-sm font-black text-[#7a271a]">اطلاعات تسویه معتبر نیست یا توافق فعالی برای این دوره پیدا نشد.</div> : null}

      <form action={calculateOwnerMonthlySettlementAction} className="grid gap-4 rounded-[1.55rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-5 sm:rounded-[2rem] sm:p-6">
        <label className="grid gap-2 text-sm font-black text-[#111827]">
          توافق بهره‌برداری فعال
          <select name="operationAgreementId" required className="input-luxury">
            <option value="">انتخاب کنید</option>
            {agreements.map((agreement) => (
              <option key={agreement.id} value={agreement.id}>
                {(agreement.hall?.name ?? "همه تالارها") + " · " + getOwnerSettlementOperationModelLabel(agreement.operationModel) + " · " + agreement.ownerName}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            سال تسویه
            <input name="settlementYear" required defaultValue={now.getUTCFullYear()} className="input-luxury" inputMode="numeric" />
          </label>
          <label className="grid gap-2 text-sm font-black text-[#111827]">
            ماه تسویه
            <input name="settlementMonth" required defaultValue={now.getUTCMonth() + 1} className="input-luxury" inputMode="numeric" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-black text-[#111827]">
          یادداشت داخلی
          <textarea name="notes" rows={3} className="input-luxury" placeholder="اختیاری" />
        </label>
        <button type="submit" className="btn-luxury-primary justify-center">محاسبه تسویه ماهانه مالک</button>
      </form>
    </section>
  );
}
