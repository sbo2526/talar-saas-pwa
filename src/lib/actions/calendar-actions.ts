"use server";

import type { CalendarActionState } from "@/lib/actions/calendar-state";
import { revalidatePath } from "next/cache";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import {
  calendarDayDateSchema,
  calendarDayNoteSchema,
} from "@/lib/validation/calendar";
import { auditUpdate } from "@/lib/audit/audit-action-helpers";
import { formatJalaliDate } from "@/lib/date/jalali";

function parseCalendarDayNoteForm(formData: FormData) {
  return calendarDayNoteSchema.safeParse({
    date: formData.get("date"),
    status: formData.get("status"),
    title: formData.get("title"),
    note: formData.get("note"),
    color: formData.get("color"),
  });
}

function parseCalendarDayDateForm(formData: FormData) {
  return calendarDayDateSchema.safeParse({
    date: formData.get("date"),
  });
}

function revalidateCalendarPaths() {
  revalidatePath("/dashboard/calendar");
}

export async function saveCalendarDayNoteAction(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const membership = await requireTenantPermission("calendar.manage");
  const parsed = parseCalendarDayNoteForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "اطلاعات روز انتخاب‌شده معتبر نیست. لطفاً ورودی‌ها را بررسی کنید.",
    };
  }

  const db = await getPrisma();

  try {
    const beforeNote = await db.calendarDayNote.findUnique({
      where: {
        tenantId_date: { tenantId: membership.tenantId, date: parsed.data.date },
      },
    });

    const afterNote = await db.calendarDayNote.upsert({
      where: {
        tenantId_date: {
          tenantId: membership.tenantId,
          date: parsed.data.date,
        },
      },
      create: {
        tenantId: membership.tenantId,
        ...parsed.data,
      },
      update: {
        status: parsed.data.status,
        title: parsed.data.title,
        note: parsed.data.note,
        color: parsed.data.color,
      },
    });

    await auditUpdate({
      membership,
      action: beforeNote ? "UPDATE" : "CREATE",
      actionLabel: beforeNote ? "ویرایش" : "ثبت",
      entityType: "CALENDAR_DAY",
      entityLabel: "روز تقویم",
      entityId: afterNote.id,
      recordLabel: formatJalaliDate(afterNote.date),
      title: beforeNote ? "ویرایش روز تقویم" : "ثبت روز تقویم",
      beforeData: beforeNote,
      afterData: afterNote,
      href: "/dashboard/calendar",
    });
  } catch {
    return {
      ok: false,
      message:
        "ذخیره وضعیت روز با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.",
    };
  }

  revalidateCalendarPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "وضعیت روز در تقویم رزرو ذخیره شد.",
  };
}

export async function clearCalendarDayNoteAction(
  _previousState: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const membership = await requireTenantPermission("calendar.manage");
  const parsed = parseCalendarDayDateForm(formData);

  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        "تاریخ انتخاب‌شده برای پاک‌سازی یادداشت معتبر نیست.",
    };
  }

  const db = await getPrisma();

  const beforeNote = await db.calendarDayNote.findUnique({
    where: {
      tenantId_date: { tenantId: membership.tenantId, date: parsed.data.date },
    },
  });

  await db.calendarDayNote.deleteMany({
    where: {
      tenantId: membership.tenantId,
      date: parsed.data.date,
    },
  });

  if (beforeNote) {
    await auditUpdate({
      membership,
      action: "DELETE",
      actionLabel: "حذف",
      entityType: "CALENDAR_DAY",
      entityLabel: "روز تقویم",
      entityId: beforeNote.id,
      recordLabel: formatJalaliDate(beforeNote.date),
      title: "حذف یادداشت روز تقویم",
      beforeData: beforeNote,
      href: "/dashboard/calendar",
    });
  }

  revalidateCalendarPaths();
  revalidatePath("/dashboard/settings/activity");

  return {
    ok: true,
    message: "یادداشت و وضعیت دستی این روز پاک شد.",
  };
}
