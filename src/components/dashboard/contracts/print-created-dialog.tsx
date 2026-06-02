"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function PrintCreatedDialog({
  contractId,
  open,
}: {
  contractId: string;
  open: boolean;
}) {
  const router = useRouter();

  if (!open) {
    return null;
  }

  function closeDialog() {
    router.replace(`/dashboard/contracts/${contractId}`, { scroll: false });
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#080d14]/58 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contract-created-title"
        className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-[#d8c08b]/72 bg-[#fff9ee] text-[#111827] shadow-[0_30px_100px_rgba(7,11,17,0.34)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d8c08b]/46 bg-[linear-gradient(135deg,rgba(255,248,234,0.98),rgba(247,236,211,0.96))] p-5">
          <div>
            <p className="text-xs font-black text-[#17483f]">ثبت قرارداد</p>
            <h2 id="contract-created-title" className="mt-2 text-xl font-black">
              قرارداد با موفقیت ثبت شد
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] text-[#7d6841]"
            aria-label="بستن"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-bold leading-8 text-[#6d5f49]">
            آیا می‌خواهید نسخه چاپی قرارداد را مشاهده یا چاپ کنید؟
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href={`/dashboard/contracts/${contractId}/print`}
              className="btn-luxury-dark justify-center px-5 py-3"
            >
              مشاهده و چاپ قرارداد
            </Link>
            <button
              type="button"
              onClick={closeDialog}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#d8c08b]/64 bg-[#fff8ea]/82 px-5 py-3 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
            >
              بعداً انجام می‌دهم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
