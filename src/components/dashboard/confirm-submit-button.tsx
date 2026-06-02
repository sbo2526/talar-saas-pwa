"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  confirmMessage: string;
  disabledMessage?: string;
  confirmTitle?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "danger" | "success";
  reasonFieldName?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  children: ReactNode;
};

export function ConfirmSubmitButton({
  confirmMessage,
  disabledMessage,
  confirmTitle = "تأیید عملیات حذف",
  confirmLabel = "بله، حذف شود",
  cancelLabel = "انصراف",
  confirmTone = "danger",
  reasonFieldName,
  reasonLabel = "دلیل یا توضیح عملیات",
  reasonPlaceholder = "در صورت نیاز، دلیل این عملیات را بنویسید.",
  children,
  disabled,
  onClick,
  title,
  ...props
}: ConfirmSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const messageLines = confirmMessage.split("\n").filter(Boolean);
  const isDanger = confirmTone === "danger";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const modal = isOpen && mounted ? createPortal(
    <div
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      className="fixed inset-0 z-[9999] overflow-y-auto bg-[#111827]/76 px-3 py-4 backdrop-blur-md sm:px-6 sm:py-8"
      role="dialog"
    >
      <div className="flex min-h-full items-start justify-center py-3 sm:items-center">
        <div className="w-full max-w-2xl overflow-hidden rounded-[1.45rem] border border-white/18 bg-[#fff9ee] text-right text-[#111827] shadow-[0_32px_120px_rgba(0,0,0,0.38)] sm:rounded-[1.75rem]">
          <div className="max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-3 sm:max-h-[calc(100dvh-4rem)] sm:p-5">
            <div className={`rounded-[1.2rem] border p-4 sm:rounded-[1.35rem] sm:p-5 ${isDanger ? "border-[#b45353]/24 bg-[#fff1f1]/86" : "border-[#25a46d]/24 bg-[#edfdf4]/86"}`}>
              <p id={titleId} className={`text-base font-black leading-7 sm:text-xl ${isDanger ? "text-[#8f2c2c]" : "text-[#17483f]"}`}>
                {confirmTitle}
              </p>
              <div id={descriptionId} className={`mt-3 space-y-2 text-xs font-bold leading-6 sm:text-sm sm:leading-7 ${isDanger ? "text-[#6d4b4b]" : "text-[#285f52]"}`}>
                {messageLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p className={`mt-3 text-xs font-black leading-6 ${isDanger ? "text-[#8f2c2c]" : "text-[#17483f]"}`}>
                عملیات فقط بعد از تأیید صریح شما انجام می‌شود.
              </p>
            </div>

            {reasonFieldName ? (
              <label className="mt-4 grid gap-2 text-xs font-black text-[#172033]">
                <span>{reasonLabel}</span>
                <textarea
                  name={reasonFieldName}
                  rows={3}
                  placeholder={reasonPlaceholder}
                  className="input-luxury min-h-20 resize-y border-[#d8c08b] bg-white text-sm font-bold sm:min-h-24"
                />
              </label>
            ) : null}

            <div className="sticky bottom-0 -mx-3 mt-4 grid gap-2 border-t border-[#d8c08b]/42 bg-[#fff9ee]/96 px-3 pb-1 pt-3 backdrop-blur sm:-mx-5 sm:grid-cols-2 sm:px-5 sm:pb-0">
              <button
                type="button"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea] px-4 py-2 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70"
                onClick={() => setIsOpen(false)}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-black text-white transition ${isDanger ? "border-[#b45353]/34 bg-[#8f2c2c] hover:bg-[#7f2525]" : "border-[#17483f]/22 bg-[#17483f] hover:bg-[#0f3a32]"}`}
                onClick={() => {
                  const submitter = buttonRef.current;
                  setIsOpen(false);
                  submitter?.form?.requestSubmit(submitter);
                }}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        {...props}
        ref={buttonRef}
        type={props.type ?? "submit"}
        disabled={disabled}
        title={disabled ? disabledMessage ?? title : title}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          event.preventDefault();
          setIsOpen(true);
        }}
      >
        {children}
      </button>

      {modal}
    </>
  );
}
