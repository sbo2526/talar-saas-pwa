"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Edit3,
  Eraser,
  MessageSquareText,
  Save,
} from "lucide-react";
import { useActionState, useState } from "react";
import {
  clearCalendarDayNoteAction,
  saveCalendarDayNoteAction,
} from "@/lib/actions/calendar-actions";
import { initialCalendarActionState } from "@/lib/actions/calendar-state";
import {
  calendarDayStatusOptions,
  type CalendarDayStatusValue,
} from "@/lib/calendar-status-options";

type CalendarNoteFormProps = {
  dateIso: string;
  canEdit: boolean;
  defaultValues?: {
    status: CalendarDayStatusValue;
    title: string;
    note: string;
    color: string;
  } | null;
};

export function CalendarNoteForm({
  dateIso,
  canEdit,
  defaultValues,
}: CalendarNoteFormProps) {
  const [saveState, saveAction, isSaving] = useActionState(
    saveCalendarDayNoteAction,
    initialCalendarActionState,
  );
  const [clearState, clearAction, isClearing] = useActionState(
    clearCalendarDayNoteAction,
    initialCalendarActionState,
  );
  const values = defaultValues ?? {
    status: "NOTE" as const,
    title: "",
    note: "",
    color: "#C7A15A",
  };
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draftStatus, setDraftStatus] =
    useState<CalendarDayStatusValue>(values.status);

  const openFormWith = (status: CalendarDayStatusValue) => {
    setDraftStatus(status);
    setIsFormOpen(true);
  };

  return (
    <div className="grid gap-3">
      {!canEdit ? (
        <Alert tone="warning">
          فقط مالک یا مدیر فضای کاری می‌تواند وضعیت روز را تغییر دهد.
        </Alert>
      ) : null}

      {saveState.message ? (
        <Alert tone={saveState.ok ? "success" : "error"}>
          {saveState.message}
        </Alert>
      ) : null}

      {clearState.message ? (
        <Alert tone={clearState.ok ? "success" : "error"}>
          {clearState.message}
        </Alert>
      ) : null}

      <div className="grid gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => openFormWith("NOTE")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#d8c08b]/62 bg-[#fff8ea]/82 px-4 py-2.5 text-sm font-black text-[#7d6841] transition hover:border-[#c7a15a]/70 hover:bg-[#fff3d2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageSquareText size={16} />
            ثبت یادداشت مدیریتی
          </button>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => openFormWith("BLOCKED")}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#6b7280]/22 bg-[#f8fafc] px-4 py-2.5 text-sm font-black text-[#374151] transition hover:border-[#6b7280]/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Ban size={16} />
            مسدود کردن روز
          </button>
        </div>

        {defaultValues ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => openFormWith(values.status)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#111827]/14 bg-white/[0.68] px-4 py-2.5 text-sm font-black text-[#111827] transition hover:border-[#c7a15a]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Edit3 size={16} />
              ویرایش وضعیت
            </button>
            <form action={clearAction}>
              <input type="hidden" name="date" value={dateIso} />
              <button
                type="submit"
                disabled={!canEdit || isClearing}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#b45353]/20 bg-[#fff7f4] px-4 py-2.5 text-sm font-black text-[#8f2c2c] transition hover:border-[#b45353]/38 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Eraser size={16} />
                {isClearing ? "در حال پاک‌سازی..." : "پاک کردن وضعیت روز"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {isFormOpen ? (
        <form
          key={`${dateIso}-${draftStatus}`}
          action={saveAction}
          className="grid gap-3 rounded-2xl border border-[#d8c08b]/58 bg-[#fff8ea]/62 p-3"
        >
          <input type="hidden" name="date" value={dateIso} />

          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>وضعیت روز</span>
            <select
              name="status"
              defaultValue={draftStatus}
              disabled={!canEdit}
              className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
            >
              {calendarDayStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>عنوان کوتاه</span>
            <input
              name="title"
              defaultValue={values.title}
              disabled={!canEdit}
              placeholder="مثلاً بازدید مشتری یا تعطیلی داخلی"
              className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>یادداشت مدیریتی</span>
            <textarea
              name="note"
              defaultValue={values.note}
              disabled={!canEdit}
              placeholder="توضیح کوتاه برای تیم فروش، پذیرایی یا مدیریت"
              className="input-luxury min-h-24 resize-y disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="grid gap-2 text-sm font-black text-[#172033]">
            <span>رنگ نشانگر</span>
            <input
              name="color"
              defaultValue={values.color}
              disabled={!canEdit}
              placeholder="#C7A15A"
              dir="ltr"
              className="input-luxury disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <button
            type="submit"
            disabled={!canEdit || isSaving}
            className="btn-luxury-dark min-h-12 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={17} />
            {isSaving ? "در حال ذخیره..." : "ذخیره وضعیت روز"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function Alert({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "error" | "warning";
}) {
  const className =
    tone === "success"
      ? "border-[#25a46d]/22 bg-[#ecfff5] text-[#126141]"
      : tone === "warning"
        ? "border-[#c7a15a]/28 bg-[#fff8ea] text-[#7d6841]"
        : "border-[#b45353]/25 bg-[#fff1f1] text-[#8f2c2c]";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold leading-7 ${className}`}
    >
      {tone === "success" ? (
        <CheckCircle2 className="mt-1 shrink-0" size={18} />
      ) : (
        <AlertCircle className="mt-1 shrink-0" size={18} />
      )}
      <span>{children}</span>
    </div>
  );
}
