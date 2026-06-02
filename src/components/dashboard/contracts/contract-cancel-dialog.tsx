"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ShieldX, X } from "lucide-react";
import { cancelContractAction } from "@/lib/actions/contract-actions";
import { formatIRR } from "@/lib/formatters";
import { toPersianDigits } from "@/lib/date/jalali";

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function toEnglishNumberText(value: string) {
  return normalizeDigits(value).replace(/[^0-9]/g, "");
}

function formatGroupedAmount(value: string) {
  const raw = toEnglishNumberText(value);
  if (!raw) return "";
  return new Intl.NumberFormat("fa-IR").format(Number(raw));
}

export function ContractCancelDialog({
  contractId,
  contractNo,
  customerName,
  eventLabel,
  finalTotal,
  paidAmount,
  remainingAmount,
  returnTo,
  triggerLabel = "کنسل قرارداد",
  triggerClassName,
}: {
  contractId: string;
  contractNo: string;
  customerName: string;
  eventLabel: string;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
  returnTo: string;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amountRaw, setAmountRaw] = useState("");
  const [note, setNote] = useState("");

  const amountDisplay = useMemo(() => formatGroupedAmount(amountRaw), [amountRaw]);
  const amountNumber = Number(amountRaw || "0");
  const refundOrDue = Math.max(0, paidAmount - amountNumber);
  const extraDue = Math.max(0, amountNumber - paidAmount);

  function handleAmountChange(value: string) {
    setAmountRaw(toEnglishNumberText(value).slice(0, 15));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!amountRaw) {
      event.preventDefault();
      alert("مبلغ کنسلی را وارد کنید.");
      return;
    }

    const confirmed = window.confirm(
      `کنسل نهایی قرارداد ${contractNo}\nمشتری: ${customerName}\nمبلغ کنسلی: ${amountDisplay} ریال\n\nآیا از کنسل کردن نهایی این قرارداد مطمئن هستید؟`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#b45353]/24 bg-[#fff1f1] px-3 py-2 text-xs font-black text-[#8f2c2c] transition hover:border-[#b45353]/42 hover:bg-[#ffe7e7]"}
      >
        <ShieldX size={15} />
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#06101f]/72 p-3 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl overflow-hidden rounded-[1.65rem] border border-[#f1c4c4] bg-[#fffaf2] text-right text-[#111827] shadow-[0_28px_92px_rgba(0,0,0,0.32)]">
            <div className="flex items-start justify-between gap-4 border-b border-[#eadfc7] bg-[linear-gradient(145deg,#fff8ea,#fff1f1)] px-5 py-4">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#b45353]/18 bg-[#fff1f1] px-3 py-1 text-[11px] font-black text-[#8f2c2c]">
                  <AlertTriangle size={14} />
                  عملیات حساس
                </span>
                <h2 className="mt-3 text-xl font-black leading-8">کنسل قرارداد {toPersianDigits(contractNo)}</h2>
                <p className="mt-1 text-xs font-bold leading-6 text-[#7d6841]">
                  مبلغ کنسلی را وارد کنید و بعد با «کنسل نهایی قرارداد» عملیات را ثبت کنید.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/60 bg-white/75 text-[#7d6841] transition hover:border-[#b45353]/30 hover:text-[#8f2c2c]"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>

            <form action={cancelContractAction} onSubmit={handleSubmit} className="grid gap-4 p-5">
              <input type="hidden" name="contractId" value={contractId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="cancellationAmount" value={amountRaw} />

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="مبلغ قرارداد" value={formatIRR(finalTotal)} />
                <Metric label="دریافت‌شده" value={formatIRR(paidAmount)} />
                <Metric label="مانده فعلی" value={formatIRR(remainingAmount)} />
              </div>

              <div className="rounded-[1.25rem] border border-[#d8c08b]/62 bg-white/70 p-4">
                <p className="text-xs font-black text-[#7d6841]">مشتری و مراسم</p>
                <p className="mt-2 text-sm font-black text-[#111827]">{customerName}</p>
                <p className="mt-1 text-xs font-bold leading-6 text-[#6d5f49]">{eventLabel}</p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-[#111827]">مبلغ کنسلی نهایی</span>
                <div className="relative">
                  <input
                    value={amountDisplay}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    inputMode="numeric"
                    autoFocus
                    placeholder="مثلاً ۲۵,۰۰۰,۰۰۰"
                    className="min-h-14 w-full rounded-[1.25rem] border border-[#d8c08b]/70 bg-white px-4 py-3 pl-16 text-right text-xl font-black text-[#111827] outline-none transition focus:border-[#8f2c2c]/45 focus:ring-4 focus:ring-[#b45353]/10"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#7d6841]">ریال</span>
                </div>
                <span className="text-xs font-bold leading-6 text-[#8b7a5d]">
                  عدد هنگام تایپ سه‌رقمی جدا می‌شود تا مبلغ قرارداد و خسارت اشتباه خوانده نشود.
                </span>
              </label>

              <div className="grid gap-2 rounded-[1.25rem] border border-[#b45353]/18 bg-[#fff1f1]/72 p-4 text-xs font-bold leading-6 text-[#8f2c2c] sm:grid-cols-2">
                <p>قابل استرداد از دریافت‌شده: <strong>{formatIRR(refundOrDue)}</strong></p>
                <p>مازاد قابل پیگیری از مشتری: <strong>{formatIRR(extraDue)}</strong></p>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-[#111827]">یادداشت کنسلی</span>
                <textarea
                  name="cancellationNote"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="دلیل کنسلی، توضیح توافق، یا نکته مالی را بنویسید."
                  className="min-h-28 rounded-[1.25rem] border border-[#d8c08b]/70 bg-white px-4 py-3 text-right text-sm font-bold leading-7 text-[#111827] outline-none transition focus:border-[#8f2c2c]/45 focus:ring-4 focus:ring-[#b45353]/10"
                />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-[#eadfc7] pt-4 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/70 bg-white px-5 py-2 text-sm font-black text-[#7d6841]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#8f2c2c]/20 bg-[#8f2c2c] px-5 py-2 text-sm font-black text-[#fff7f7] shadow-[0_14px_30px_rgba(143,44,44,0.22)] transition hover:bg-[#762424]"
                >
                  <ShieldX size={17} />
                  کنسل نهایی قرارداد
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.15rem] border border-[#d8c08b]/62 bg-white/75 px-4 py-3">
      <p className="text-[11px] font-black text-[#7d6841]">{label}</p>
      <p className="mt-2 text-sm font-black text-[#111827]">{value}</p>
    </div>
  );
}
