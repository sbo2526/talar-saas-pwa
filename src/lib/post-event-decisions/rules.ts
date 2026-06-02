import { getTodayJalali, jalaliToDate } from "@/lib/date/jalali";

const dayInMilliseconds = 24 * 60 * 60 * 1000;
const requiredRescheduleLeadDays = 10;

export function getCurrentLocalDateStart() {
  const today = getTodayJalali();
  return jalaliToDate(today.year, today.month, today.day);
}

export function getValidRescheduleRegistrationDeadline(originalEventDate: Date) {
  return new Date(originalEventDate.getTime() - requiredRescheduleLeadDays * dayInMilliseconds);
}

export function isValidRescheduleRegistration(input: {
  originalEventDate: Date;
  rescheduleRegisteredAt: Date | null | undefined;
}) {
  if (!input.rescheduleRegisteredAt) {
    return false;
  }

  return input.rescheduleRegisteredAt.getTime() <= getValidRescheduleRegistrationDeadline(input.originalEventDate).getTime();
}

export function isPastEventDate(eventDate: Date, currentLocalDateStart = getCurrentLocalDateStart()) {
  return eventDate.getTime() < currentLocalDateStart.getTime();
}

export function getRescheduleRulePersianText() {
  return "انتقال تاریخ فقط وقتی معتبر است که ثبت انتقال حداقل ۱۰ روز قبل از تاریخ اصلی مراسم انجام شده باشد.";
}
