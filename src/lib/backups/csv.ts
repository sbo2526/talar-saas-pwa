export type CsvHeader<T extends Record<string, unknown>> = {
  key: keyof T;
  label: string;
};

export function csvEscape(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');

  if (/[",\r\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  headers: CsvHeader<T>[],
) {
  const headerLine = headers.map((header) => csvEscape(header.label)).join(",");
  const rowLines = rows.map((row) =>
    headers.map((header) => csvEscape(row[header.key])).join(","),
  );

  return [headerLine, ...rowLines].join("\r\n");
}

export function withUtf8Bom(content: string) {
  return `\uFEFF${content}`;
}
