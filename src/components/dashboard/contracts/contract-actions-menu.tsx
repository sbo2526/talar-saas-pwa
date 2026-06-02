"use client";

import type { ContractStatus } from "@prisma/client";
import type { ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  MoreHorizontal,
  Pencil,
  Printer,
  ReceiptText,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { ConfirmSubmitButton } from "@/components/dashboard/confirm-submit-button";
import { ContractCancelDialog } from "@/components/dashboard/contracts/contract-cancel-dialog";
import {
  deleteContractAction,
  finalizeContractSettlementAction,
  updateContractStatusAction,
} from "@/lib/actions/contract-actions";
import { confirmPostEventAction } from "@/lib/actions/post-event-confirmation-actions";
import { contractStatusLabels } from "@/lib/contracts/display";

const contractStatuses: ContractStatus[] = [
  "DRAFT",
  "RESERVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
];

type ContractActionsMenuProps = {
  contractId: string;
  contractNo: string;
  customerName: string;
  currentStatus: ContractStatus;
  returnTo: string;
  canEdit: boolean;
  isLegacyContract: boolean;
  isFinalSettled: boolean;
  canRegisterHeldForInvoice: boolean;
  invoiceActionHref: string;
  invoiceActionLabel: string;
  finalSettlementConfirmMessage: string;
  postEventInvoiceConfirmMessage: string;
  deleteConfirmMessage: string;
  cancellationEventLabel: string;
  finalTotal: number;
  paidAmount: number;
  remainingAmount: number;
};

export function ContractActionsMenu({
  contractId,
  contractNo,
  customerName,
  currentStatus,
  returnTo,
  canEdit,
  isLegacyContract,
  isFinalSettled,
  canRegisterHeldForInvoice,
  invoiceActionHref,
  invoiceActionLabel,
  finalSettlementConfirmMessage,
  postEventInvoiceConfirmMessage,
  deleteConfirmMessage,
  cancellationEventLabel,
  finalTotal,
  paidAmount,
  remainingAmount,
}: ContractActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);
  const canSettle = canEdit && !isLegacyContract && !isFinalSettled;
  const canCancel =
    canEdit &&
    !isLegacyContract &&
    !isFinalSettled &&
    currentStatus !== "CANCELED";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[8500] bg-[#06101f]/62 px-2 py-3 text-right text-[#111827] backdrop-blur-sm sm:px-4 sm:py-5"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div className="flex min-h-full items-end justify-center sm:items-center xl:justify-end">
              <section
                aria-describedby={descriptionId}
                aria-labelledby={titleId}
                aria-modal="true"
                className="max-h-[calc(100dvh-1.5rem)] w-full max-w-[24rem] overflow-hidden rounded-[1.35rem] border border-[#d8c08b]/62 bg-[#fffaf0] shadow-[0_32px_120px_rgba(0,0,0,0.34)] ring-1 ring-white/70 sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[1.65rem] xl:ml-4"
                dir="rtl"
                role="dialog"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="sticky top-0 z-10 border-b border-[#d8c08b]/34 bg-[#fffaf0]/96 p-3 backdrop-blur sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        id={titleId}
                        className="text-sm font-black leading-6 text-[#111827] sm:text-base"
                      >
                        اقدامات قرارداد
                      </p>
                      <p
                        id={descriptionId}
                        className="mt-1 truncate text-[11px] font-bold leading-5 text-[#7d6841]"
                      >
                        قرارداد {contractNo} · {customerName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-[#d8c08b]/55 bg-white/78 text-[#7d6841] transition hover:border-[#c7a15a]/80 hover:text-[#111827]"
                      aria-label="بستن منوی اقدامات"
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>

                <div className="max-h-[calc(100dvh-7.5rem)] overflow-y-auto p-3 sm:max-h-[calc(100dvh-9rem)] sm:p-4">
                  <MenuSection title="اقدامات تکمیلی">
                    <MenuLink
                      href={`/dashboard/contracts/${contractId}`}
                      onNavigate={() => setOpen(false)}
                      icon={<Eye size={14} />}
                    >
                      مشاهده جزئیات
                    </MenuLink>
                    {canEdit ? (
                      <MenuLink
                        href={`/dashboard/contracts/${contractId}/edit`}
                        onNavigate={() => setOpen(false)}
                        icon={<Pencil size={14} />}
                      >
                        ویرایش قرارداد
                      </MenuLink>
                    ) : null}
                    <MenuLink
                      href={`/dashboard/contracts/${contractId}/print`}
                      onNavigate={() => setOpen(false)}
                      icon={<Printer size={14} />}
                    >
                      چاپ قرارداد
                    </MenuLink>
                    {!isLegacyContract ? (
                      <MenuLink
                        href={`/dashboard/payments?contractId=${contractId}`}
                        onNavigate={() => setOpen(false)}
                        icon={<CreditCard size={14} />}
                      >
                        دریافت‌ها
                      </MenuLink>
                    ) : null}
                    {!isLegacyContract ? (
                      <MenuLink
                        href={invoiceActionHref}
                        onNavigate={() => setOpen(false)}
                        icon={<ReceiptText size={14} />}
                        tone="important"
                      >
                        {invoiceActionLabel}
                      </MenuLink>
                    ) : null}
                  </MenuSection>

                  {canSettle || canRegisterHeldForInvoice ? (
                    <MenuSection title="اقدامات مالی و مراسم">
                      {canSettle ? (
                        <form
                          action={finalizeContractSettlementAction}
                          className="grid"
                        >
                          <input
                            type="hidden"
                            name="contractId"
                            value={contractId}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />
                          <ConfirmSubmitButton
                            confirmTitle="تأیید تسویه نهایی قرارداد"
                            confirmLabel="تأیید تسویه نهایی"
                            confirmTone="success"
                            confirmMessage={finalSettlementConfirmMessage}
                            className={`${menuItemClass} border-[#17483f]/18 bg-[#25a46d]/10 text-[#17483f] hover:border-[#17483f]/34 hover:bg-white`}
                          >
                            <CheckCircle2 size={14} />
                            تسویه نهایی
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                      {canRegisterHeldForInvoice ? (
                        <form action={confirmPostEventAction} className="grid">
                          <input
                            type="hidden"
                            name="contractId"
                            value={contractId}
                          />
                          <input type="hidden" name="decision" value="HELD" />
                          <input
                            type="hidden"
                            name="note"
                            value="ثبت برگزاری از فهرست قراردادها برای صدور فاکتور بعد از مراسم."
                          />
                          <ConfirmSubmitButton
                            confirmTitle="ثبت برگزاری و ادامه صدور فاکتور"
                            confirmLabel="ثبت و رفتن به فاکتور"
                            confirmTone="success"
                            confirmMessage={postEventInvoiceConfirmMessage}
                            className={`${menuItemClass} border-[#17483f]/18 bg-[#17483f]/10 text-[#17483f] hover:border-[#17483f]/34 hover:bg-white`}
                          >
                            <CheckCircle2 size={14} />
                            ثبت برگزاری برای فاکتور
                          </ConfirmSubmitButton>
                        </form>
                      ) : null}
                    </MenuSection>
                  ) : null}

                  {canEdit || !isLegacyContract ? (
                    <MenuSection title="عملیات مدیریتی">
                      {canEdit ? (
                        <details className="rounded-xl border border-[#d8c08b]/32 bg-white/50 p-1">
                          <summary
                            className={`${compactPanelSummaryClass} border-[#d8c08b]/48 bg-[#fff8ea]/82 text-[#7d6841] hover:border-[#c7a15a]/70 hover:bg-white`}
                          >
                            <span className="inline-flex items-center gap-2">
                              <Pencil size={14} />
                              تغییر وضعیت
                            </span>
                            <ChevronDown size={13} />
                          </summary>
                          <form
                            action={updateContractStatusAction}
                            className="mt-2 grid gap-2 rounded-xl border border-[#d8c08b]/24 bg-white/80 p-2"
                          >
                            <input
                              type="hidden"
                              name="contractId"
                              value={contractId}
                            />
                            <input
                              type="hidden"
                              name="returnTo"
                              value={returnTo}
                            />
                            <select
                              name="status"
                              defaultValue={currentStatus}
                              className="input-luxury min-h-10 py-2 text-xs"
                            >
                              {contractStatuses.map((item) => (
                                <option key={item} value={item}>
                                  {contractStatusLabels[item]}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#111827]/16 bg-[#111827] px-3 py-2 text-[11px] font-black text-[#fff8ea] transition hover:border-[#c7a15a]/60"
                            >
                              ثبت وضعیت
                            </button>
                          </form>
                        </details>
                      ) : null}

                      {canCancel ? (
                        <ContractCancelDialog
                          contractId={contractId}
                          contractNo={contractNo}
                          customerName={customerName}
                          eventLabel={cancellationEventLabel}
                          finalTotal={finalTotal}
                          paidAmount={paidAmount}
                          remainingAmount={remainingAmount}
                          returnTo={returnTo}
                          triggerLabel="کنسل قرارداد"
                          triggerClassName={`${menuItemClass} ${dangerItemClass}`}
                        />
                      ) : !isLegacyContract ? (
                        <span className="inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-xl border border-[#d8c08b]/38 bg-[#fff8ea]/56 px-3 py-2 text-[11px] font-black text-[#7d6841]">
                          <ShieldCheck size={14} />
                          کنسلی برای این وضعیت فعال نیست
                        </span>
                      ) : null}
                    </MenuSection>
                  ) : null}

                  <MenuSection title="ناحیه خطرناک" danger>
                    {canEdit ? (
                      <details className="rounded-xl border border-[#b45353]/14 bg-[#fff7f7]/50 p-1">
                        <summary
                          className={`${compactPanelSummaryClass} border-[#b45353]/16 bg-[#fff7f7]/86 text-[#8f2c2c] hover:border-[#b45353]/34 hover:bg-[#fff1f1]`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Trash2 size={14} />
                            حذف قرارداد
                          </span>
                          <ChevronDown size={13} />
                        </summary>
                        <form
                          action={deleteContractAction}
                          className="mt-2 grid rounded-xl border border-[#b45353]/12 bg-white/78 p-2"
                        >
                          <input
                            type="hidden"
                            name="contractId"
                            value={contractId}
                          />
                          <input
                            type="hidden"
                            name="returnTo"
                            value={returnTo}
                          />
                          <ConfirmSubmitButton
                            confirmMessage={deleteConfirmMessage}
                            reasonFieldName="deleteReason"
                            reasonLabel="دلیل حذف قرارداد"
                            reasonPlaceholder="اختیاری؛ دلیل حذف برای تاریخچه غیرقابل حذف ثبت می‌شود."
                            className={`${menuItemClass} ${dangerItemClass}`}
                          >
                            <Trash2 size={14} />
                            تأیید حذف قرارداد
                          </ConfirmSubmitButton>
                        </form>
                      </details>
                    ) : (
                      <span className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-[#d8c08b]/38 bg-[#fff8ea]/56 px-3 text-[11px] font-black text-[#7d6841]">
                        حذف مجاز نیست
                      </span>
                    )}
                  </MenuSection>
                </div>
              </section>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-8 w-full items-center justify-between gap-2 rounded-lg border border-[#d8c08b]/36 bg-[#fff8ea]/54 px-2.5 py-1.5 text-[11px] font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 hover:bg-white hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#c7a15a]/42 focus:ring-offset-2 focus:ring-offset-[#fff8ea]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? titleId : undefined}
      >
        <span className="inline-flex items-center gap-1.5">
          <MoreHorizontal size={14} />
          بیشتر
        </span>
        <ChevronDown
          size={15}
          className={`text-[#9f7131] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {modal}
    </>
  );
}

const menuItemClass =
  "inline-flex min-h-10 w-full items-center justify-start gap-2 rounded-xl border px-3 py-2 text-[11px] font-black leading-5 transition";
const subtleItemClass =
  "border-[#d8c08b]/44 bg-[#fff9ee]/88 text-[#7d6841] hover:border-[#c7a15a]/72 hover:bg-white";
const importantItemClass =
  "border-[#b8860b]/20 bg-[#fff6df]/90 text-[#7a4a12] hover:border-[#b8860b]/42 hover:bg-white";
const dangerItemClass =
  "border-[#b45353]/18 bg-[#fff7f7]/90 text-[#8f2c2c] hover:border-[#b45353]/34 hover:bg-[#fff1f1]";
const compactPanelSummaryClass =
  "flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[11px] font-black leading-5 transition focus:outline-none focus:ring-2 focus:ring-[#c7a15a]/42 focus:ring-offset-2 focus:ring-offset-[#fff8ea]";

function MenuSection({
  title,
  danger = false,
  children,
}: {
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <p
        className={`mb-1.5 px-1 text-[10px] font-black leading-5 ${danger ? "text-[#8f2c2c]" : "text-[#9f7131]"}`}
      >
        {title}
      </p>
      <div
        className={`grid gap-1.5 rounded-[1rem] border p-2 ${danger ? "border-[#b45353]/14 bg-[#fff7f7]/36" : "border-[#d8c08b]/22 bg-white/35"}`}
      >
        {children}
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  tone = "subtle",
  onNavigate,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  tone?: "subtle" | "important";
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`${menuItemClass} ${tone === "important" ? importantItemClass : subtleItemClass}`}
    >
      {icon}
      {children}
    </Link>
  );
}
