export const defaultCustomerSupportPhones = ["09123397977", "09126499877"] as const;

export function normalizeContactPhone(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\s\-()]/g, "")
    .trim();
}

export function splitContactPhones(value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  return String(value)
    .split(/[\r\n،,;؛/|]+|\s+و\s+/g)
    .map((part) => normalizeContactPhone(part))
    .filter(Boolean);
}

export function uniqueContactPhones(values: unknown[]) {
  const numbers = values.flatMap((value) => splitContactPhones(value));
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const number of numbers) {
    if (!seen.has(number)) {
      seen.add(number);
      unique.push(number);
    }
  }

  return unique;
}

export function formatCustomerSupportPhones(value?: unknown) {
  const numbers = uniqueContactPhones([value, ...defaultCustomerSupportPhones]);
  return numbers.length ? numbers.join("، ") : defaultCustomerSupportPhones.join("، ");
}

export function formatHallContactPhones(values: unknown[]) {
  const numbers = uniqueContactPhones([...values, ...defaultCustomerSupportPhones]);
  return numbers.length ? numbers.join("، ") : defaultCustomerSupportPhones.join("، ");
}

export function formatHallAddress(parts: unknown[]) {
  return parts
    .map((part) => String(part ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((part, index, all) => all.indexOf(part) === index)
    .join("، ");
}

export function compactContactLine(input: { phones?: unknown; address?: unknown }) {
  const phones = formatCustomerSupportPhones(input.phones);
  const address = String(input.address ?? "").replace(/\s+/g, " ").trim();

  return address ? `شماره‌های تماس: ${phones}\nآدرس تالار: ${address}` : `شماره‌های تماس: ${phones}`;
}
