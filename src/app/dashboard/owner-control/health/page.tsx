import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { formatPersianNumber } from "@/lib/formatters";
import { getOwnerWorkflowHealthData } from "@/lib/owner-control/data";
import { ownerControlSeverityClasses, ownerControlSeverityLabels } from "@/lib/owner-control/options";

export default async function OwnerWorkflowHealthPage() {
  const data = await getOwnerWorkflowHealthData();

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/owner-control" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]"><ArrowRight size={15} /> بازگشت</Link>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><ShieldCheck size={15} /> بررسی سلامت جریان مالی تالار</span>
        <h1 className="mt-4 text-2xl font-black sm:text-4xl">گزارش سلامت جریان مالی تالار</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">این گزارش فقط مشاهده‌ای است و هیچ داده‌ای را اصلاح نمی‌کند. چون auto-fix مالی معمولاً همان جایی است که نرم‌افزارها لباس دلقک می‌پوشند.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {data.healthItems.map((item) => (
          <div key={item.key} className={`rounded-[1.25rem] border p-4 ${ownerControlSeverityClasses[item.severity]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{item.title}</p>
                <p className="mt-2 text-xs font-black opacity-80">{ownerControlSeverityLabels[item.severity]}</p>
              </div>
              <span className="rounded-full bg-white/70 px-3 py-1 text-sm font-black">{formatPersianNumber(item.count)}</span>
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
