const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function toEnglishDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    if (persianIndex >= 0) {
      return String(persianIndex);
    }

    const arabicIndex = arabicDigits.indexOf(digit);
    return arabicIndex >= 0 ? String(arabicIndex) : digit;
  });
}

export function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizeOptionalDigits(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized ? toEnglishDigits(normalized).replace(/[،,٬\s-]/g, "") : undefined;
}

export function normalizeOptionalPhone(value: unknown) {
  const normalized = normalizeOptionalString(value);
  return normalized
    ? toEnglishDigits(normalized).replace(/[\s-]/g, "")
    : undefined;
}

export function normalizeOptionalInteger(value: unknown) {
  const normalized = normalizeOptionalDigits(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function normalizeOptionalDecimal(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  return toEnglishDigits(normalized).replace(/[،,٬\s]/g, "");
}

export function normalizeOptionalPercent(value: unknown) {
  const normalized = normalizeOptionalDecimal(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function normalizeOptionalDate(value: unknown) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return undefined;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
