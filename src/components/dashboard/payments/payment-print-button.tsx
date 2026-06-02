"use client";

import { Printer } from "lucide-react";

export function PaymentPrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className || "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/76 px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"}
    >
      <Printer size={16} />
      چاپ رسید
    </button>
  );
}
