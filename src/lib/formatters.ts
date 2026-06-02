import { toPersianDigits } from "@/lib/date/jalali";

function isEmpty(value: number | string | null | undefined) {
  return value === null || value === undefined || value === "";
}

export function formatPersianNumber(
  value: number | string | null | undefined,
): string {
  if (isEmpty(value)) {
    return "—";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return toPersianDigits(String(value));
  }

  return new Intl.NumberFormat("fa-IR").format(numericValue);
}

export function formatIRR(value: number | string | null | undefined): string {
  if (isEmpty(value)) {
    return "—";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "—";
  }

  return `${new Intl.NumberFormat("fa-IR").format(numericValue)} ریال`;
}
