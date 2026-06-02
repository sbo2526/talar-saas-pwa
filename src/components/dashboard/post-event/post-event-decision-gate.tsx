import { AlertTriangle, ArrowLeft, CalendarCheck2 } from "lucide-react";
import Link from "next/link";
import { formatPersianNumber } from "@/lib/formatters";

export function PostEventDecisionGate({
  unresolvedCount,
  lateRescheduleOwnerReviewCount,
}: {
  unresolvedCount: number;
  lateRescheduleOwnerReviewCount: number;
}) {
  if (unresolvedCount <= 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-[#08111d]/82 px-3 py-6 backdrop-blur-md print:hidden" role="dialog" aria-modal="true" aria-label="تعیین تکلیف مراسم‌های گذشته">
      <section className="w-full max-w-3xl overflow-hidden rounded-[2rem] border border-[#e8c478]/42 bg-[radial-gradient(circle_at_12%_0%,rgba(199,161,90,0.22),transparent_18rem),linear-gradient(145deg,rgba(255,249,238,0.99),rgba(247,236,211,0.98))] p-5 text-[#111827] shadow-[0_30px_120px_rgba(0,0,0,0.35)] sm:p-7" dir="rtl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-3xl bg-[#111827] text-[#f0dba9] shadow-[0_18px_50px_rgba(17,24,39,0.18)]">
            <CalendarCheck2 size={26} />
          </span>
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c7a15a]/34 bg-[#c7a15a]/10 px-3 py-1.5 text-xs font-black text-[#17483f]">
              <AlertTriangle size={15} />
              اقدام الزامی
            </span>
            <h2 className="mt-3 text-2xl font-black leading-tight sm:text-3xl">
              تعیین تکلیف مراسم‌های گذشته
            </h2>
            <p className="mt-3 text-sm font-bold leading-8 text-[#6d5f49]">
              {formatPersianNumber(unresolvedCount)} قرارداد از تاریخ مراسم عبور کرده و هنوز مشخص نشده که مراسم برگزار شده یا برگزار نشده است. ادامه کارهای عملیاتی داشبورد بعد از ثبت این تصمیم‌ها آزاد می‌شود.
            </p>
            {lateRescheduleOwnerReviewCount > 0 ? (
              <p className="mt-2 rounded-2xl border border-[#c7a15a]/38 bg-[#fff7e6] px-4 py-3 text-sm font-black leading-7 text-[#7a4a12]">
                {formatPersianNumber(lateRescheduleOwnerReviewCount)} انتقال دیرهنگام قبلاً ثبت شده و برای فاز بررسی مالک باقی مانده است.
              </p>
            ) : null}
            <Link href="/dashboard/post-event-decisions" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#111827] px-5 py-3 text-sm font-black text-[#fff8ea] shadow-[0_16px_42px_rgba(17,24,39,0.20)]">
              شروع تعیین تکلیف
              <ArrowLeft size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
