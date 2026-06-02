import { ArrowRight, CheckCircle2, CircleAlert, Landmark } from "lucide-react";
import Link from "next/link";
import { getCommercialReadinessData } from "@/lib/owner-control/data";
import { ownerCommercialReadinessStatusLabels } from "@/lib/owner-control/options";

const statusClasses = {
  ready: "border-[#25a46d]/25 bg-[#edfdf4] text-[#17483f]",
  missing: "border-[#b42318]/25 bg-[#fef3f2] text-[#7a271a]",
  review: "border-[#c7a15a]/34 bg-[#fff7e6] text-[#7a4a12]",
} as const;

export default async function CommercialReadinessPage() {
  const data = await getCommercialReadinessData();
  const readyCount = data.items.filter((item) => item.status === "ready").length;
  const readinessPercent = Math.round((readyCount / data.items.length) * 100);

  return (
    <section className="space-y-5 sm:space-y-7" dir="rtl">
      <div className="rounded-[1.75rem] border border-[#d8c08b]/65 bg-[#fff9ee]/95 p-5 text-[#111827] shadow-[0_18px_60px_rgba(17,24,39,0.08)] sm:rounded-[2.25rem] sm:p-7">
        <Link href="/dashboard/owner-control" className="inline-flex items-center gap-2 rounded-full border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-3 py-1.5 text-xs font-black text-[#7d6841]"><ArrowRight size={15} /> بازگشت</Link>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]"><Landmark size={15} /> آماده‌سازی تجاری تالار</span>
        <h1 className="mt-4 text-2xl font-black sm:text-4xl">چک‌لیست فروش‌پذیری جریان کنترل مالک</h1>
        <p className="mt-3 max-w-4xl text-sm font-bold leading-8 text-[#6d5f49]">
          این صفحه نشان می‌دهد تالار برای استفاده حرفه‌ای از مسیر بهره‌برداری، صورتحساب بعد از مراسم، گزارش خارج از فاکتور و تسویه ماهانه مالک آماده است یا هنوز مثل یک میز بدون پایه به دعا نیاز دارد.
        </p>
        <div className="mt-5 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/75 p-4">
          <p className="text-sm font-black text-[#111827]">درصد آمادگی: {readinessPercent.toLocaleString("fa-IR")}٪</p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#ead9b5]"><div className="h-full rounded-full bg-[#17483f]" style={{ width: `${readinessPercent}%` }} /></div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((item) => (
          <div key={item.key} className={`rounded-[1.25rem] border p-4 ${statusClasses[item.status]}`}>
            <div className="flex items-start gap-3">
              {item.status === "ready" ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
              <div>
                <p className="text-sm font-black">{item.title}</p>
                <p className="mt-2 text-xs font-black opacity-80">{ownerCommercialReadinessStatusLabels[item.status]}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <details className="rounded-[1.45rem] border border-[#d8c08b]/62 bg-[#fff9ee]/95 p-4 text-[#111827] sm:rounded-[1.75rem] sm:p-5">
        <summary className="cursor-pointer text-base font-black">راهنمای کوتاه استفاده تجاری</summary>
        <div className="mt-4 grid gap-3 text-sm font-bold leading-8 text-[#6d5f49] lg:grid-cols-2">
          <p>مدل بهره‌برداری مشخص می‌کند مالک از مراسم، کنسلی، خدمات اضافه و گزارش‌های خارج از فاکتور چه سهمی دارد.</p>
          <p>تعیین تکلیف بعد از مراسم اجباری است تا صدور صورتحساب و تسویه ماهانه بر اساس واقعیت انجام شود.</p>
          <p>پرسش‌های خارج از فاکتور برای کنترل مالی محرمانه طراحی شده‌اند و نباید به ابزار فشار روی مشتری تبدیل شوند.</p>
          <p>قفل مالی یعنی عددهای تسویه برای گزارش و پرداخت تثبیت شده‌اند و اصلاحات بعدی باید با سند اصلاحی انجام شود.</p>
        </div>
      </details>
    </section>
  );
}
