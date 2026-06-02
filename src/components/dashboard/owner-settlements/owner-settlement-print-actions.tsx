"use client";

import { ArrowRight, Download, FileJson, Printer } from "lucide-react";
import Link from "next/link";

export function OwnerSettlementPrintActions({ settlementId }: { settlementId: string }) {
  return (
    <div className="owner-settlement-print-actions no-print mx-auto mb-4 flex w-full max-w-[210mm] flex-col gap-2 rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fff9ee]/94 p-3 text-[#111827] shadow-[0_18px_52px_rgba(17,24,39,0.10)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-[#111827]">نسخه چاپی تسویه مالک</p>
        <p className="mt-1 text-xs font-bold text-[#7d6841]">
          برای چاپ کاغذی یا ذخیره PDF از دکمه چاپ استفاده کنید. خروجی‌های CSV و JSON از گزارش ذخیره‌شده ساخته می‌شوند.
        </p>
      </div>
      <div className="grid gap-2 sm:flex sm:items-center">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#111827]/14 bg-[#111827] px-4 py-2 text-sm font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60"
        >
          <Printer size={16} />
          چاپ / ذخیره PDF
        </button>
        <Link
          href={`/api/dashboard/owner-settlements/${settlementId}/export/csv`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
        >
          <Download size={16} />
          CSV
        </Link>
        <Link
          href={`/api/dashboard/owner-settlements/${settlementId}/export/json`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
        >
          <FileJson size={16} />
          JSON
        </Link>
        <Link
          href={`/dashboard/owner-settlements/${settlementId}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/64 bg-white/70 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
        >
          <ArrowRight size={16} />
          بازگشت
        </Link>
      </div>
    </div>
  );
}
