export const calendarDayStatusValues = [
  "NOTE",
  "BLOCKED",
  "CLOSED",
  "HOLIDAY",
  "FOLLOW_UP",
] as const;

export type CalendarDayStatusValue = (typeof calendarDayStatusValues)[number];

export const calendarDayStatusOptions = [
  { value: "NOTE", label: "یادداشت مدیریتی" },
  { value: "BLOCKED", label: "مسدود" },
  { value: "CLOSED", label: "تعطیل" },
  { value: "HOLIDAY", label: "تعطیل رسمی" },
  { value: "FOLLOW_UP", label: "در انتظار پیگیری" },
] as const satisfies ReadonlyArray<{
  value: CalendarDayStatusValue;
  label: string;
}>;

export const calendarDayStatusLabels = Object.fromEntries(
  calendarDayStatusOptions.map((option) => [option.value, option.label]),
) as Record<CalendarDayStatusValue, string>;

export function isCalendarDayStatusValue(
  value: string | undefined,
): value is CalendarDayStatusValue {
  return calendarDayStatusValues.includes(value as CalendarDayStatusValue);
}
