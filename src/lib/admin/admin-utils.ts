import { formatIRR } from "@/lib/formatters";

export function decimalToNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (typeof value === "object" && "toString" in value) return Number(value.toString()) || 0;
  return 0;
}

export function formatNullableIRR(value: unknown) {
  return formatIRR(decimalToNumber(value));
}

export function getRemainingDays(date: Date | null | undefined) {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function normalizeSearchParam(value: string | undefined) {
  return value?.trim() || undefined;
}
