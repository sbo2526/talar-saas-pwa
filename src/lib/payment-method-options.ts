export const paymentTypeValues = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "CARD_TO_CARD",
  "CHECK",
  "ONLINE",
  "OTHER",
] as const;

export type PaymentTypeValue = (typeof paymentTypeValues)[number];

export const paymentTypeOptions = [
  { value: "CASH", label: "نقدی" },
  { value: "CARD", label: "کارت‌خوان" },
  { value: "CARD_TO_CARD", label: "کارت‌به‌کارت" },
  { value: "BANK_TRANSFER", label: "حواله بانکی" },
  { value: "CHECK", label: "چک" },
  { value: "ONLINE", label: "درگاه آنلاین" },
  { value: "OTHER", label: "سایر" },
] as const satisfies ReadonlyArray<{
  value: PaymentTypeValue;
  label: string;
}>;

export const paymentTypeLabels = Object.fromEntries(
  paymentTypeOptions.map((option) => [option.value, option.label]),
) as Record<PaymentTypeValue, string>;

export function isPaymentTypeValue(
  value: string | undefined,
): value is PaymentTypeValue {
  return paymentTypeValues.includes(value as PaymentTypeValue);
}

export type PaymentMethodLabelSource = {
  title?: string | null;
  type?: PaymentTypeValue | null;
};

export type PaymentMethodCompletenessSource = {
  title?: string | null;
  type: PaymentTypeValue;
  description?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  accountNumber?: string | null;
  cardNumber?: string | null;
  iban?: string | null;
  posTerminalId?: string | null;
  gatewayName?: string | null;
  isActive?: boolean | null;
};

function compact(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getPaymentTypeLabel(type: PaymentTypeValue | null | undefined) {
  return type ? paymentTypeLabels[type] : "روش دریافت";
}

export function formatPaymentMethodLabel(
  method: PaymentMethodLabelSource | null | undefined,
) {
  if (!method) {
    return "ثبت نشده";
  }

  const title = compact(method.title);
  const typeLabel = method.type ? paymentTypeLabels[method.type] : undefined;

  if (!title) {
    return typeLabel ?? "ثبت نشده";
  }

  if (!typeLabel || normalizeComparable(title) === normalizeComparable(typeLabel)) {
    return title;
  }

  return `${title} — ${typeLabel}`;
}

function onlyDigits(value: string | null | undefined) {
  return compact(value).replace(/\D/g, "");
}

export function maskCardNumber(value: string | null | undefined) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "ثبت نشده";
  }

  if (digits.length <= 8) {
    return `••••${digits.slice(-4)}`;
  }

  return `${digits.slice(0, 4)}••••••••${digits.slice(-4)}`;
}

export function maskAccountNumber(value: string | null | undefined) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "ثبت نشده";
  }

  return `••••${digits.slice(-4)}`;
}

export function maskIban(value: string | null | undefined) {
  const normalized = compact(value).replace(/\s|-/g, "").toUpperCase();

  if (!normalized) {
    return "ثبت نشده";
  }

  return `IR••••${normalized.slice(-4)}`;
}

export function hasPaymentMethodImportantInfo(method: PaymentMethodCompletenessSource) {
  switch (method.type) {
    case "CASH":
    case "CHECK":
      return Boolean(compact(method.title));
    case "CARD":
      return Boolean(compact(method.posTerminalId));
    case "CARD_TO_CARD":
      return Boolean(compact(method.cardNumber));
    case "BANK_TRANSFER":
      return Boolean(compact(method.bankName) && (compact(method.accountNumber) || compact(method.iban)));
    case "ONLINE":
      return Boolean(compact(method.gatewayName) && compact(method.posTerminalId));
    case "OTHER":
      return Boolean(compact(method.description));
    default:
      return false;
  }
}

export function isPaymentMethodIncomplete(method: PaymentMethodCompletenessSource) {
  return Boolean(method.isActive) && !hasPaymentMethodImportantInfo(method);
}

export function getPaymentMethodReadinessLabel(method: PaymentMethodCompletenessSource) {
  return isPaymentMethodIncomplete(method) ? "نیازمند تکمیل" : "آماده استفاده";
}

export function getPaymentMethodPrimaryDetail(method: PaymentMethodCompletenessSource) {
  switch (method.type) {
    case "CASH":
      return "دریافت نقدی";
    case "CARD":
      return compact(method.posTerminalId)
        ? `شناسه کارت‌خوان: ${method.posTerminalId}`
        : "شناسه کارت‌خوان ثبت نشده";
    case "CARD_TO_CARD":
      return maskCardNumber(method.cardNumber);
    case "BANK_TRANSFER":
      return compact(method.iban)
        ? maskIban(method.iban)
        : maskAccountNumber(method.accountNumber);
    case "CHECK":
      return "دریافت چک";
    case "ONLINE":
      return compact(method.gatewayName) || "نام درگاه ثبت نشده";
    case "OTHER":
      return compact(method.description) || "توضیح ثبت نشده";
    default:
      return "ثبت نشده";
  }
}
