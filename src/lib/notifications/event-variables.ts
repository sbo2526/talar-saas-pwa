import "server-only";

import { contractStatusLabels, formatContractTime, formatContractTimeRange, lineItemTypeLabels } from "@/lib/contracts/display";
import { formatJalaliDate, formatJalaliDateTime, formatJalaliWeekday } from "@/lib/date/jalali";
import { getExpenseStatusLabel } from "@/lib/expenses/display";
import { formatIRR } from "@/lib/formatters";
import { formatCustomerSupportPhones, formatHallAddress } from "@/lib/notifications/support-contact";
import { formatPaymentMethodLabel, getPaymentRecordStatusLabel, getPaymentTypeLabel } from "@/lib/payments/display";

type DecimalLike = { toString(): string } | string | number | null | undefined;

type TenantLike = {
  name?: string | null;
  hallProfile?: {
    province?: string | null;
    city?: string | null;
    address?: string | null;
    phone?: string | null;
    mobile?: string | null;
  } | null;
} | null | undefined;

type CustomerLike = {
  fullName?: string | null;
  phone?: string | null;
  nationalCode?: string | null;
  nationalId?: string | null;
} | null | undefined;

type ContractLike = {
  id?: string | null;
  contractNo?: string | null;
  status?: string | null;
  eventTypeName?: string | null;
  eventDate?: Date | string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  guestCount?: number | null;
  finalTotal?: DecimalLike;
  depositAmount?: DecimalLike;
  remainingAmount?: DecimalLike;
  payments?: Array<{ amount?: DecimalLike; type?: string | null; status?: string | null }> | null;
  customer?: CustomerLike;
  hall?: { name?: string | null; city?: string | null; address?: string | null; phone?: string | null } | null;
  salon?: { name?: string | null } | null;
  packageName?: string | null;
  notes?: string | null;
  lineItems?: Array<{
    type?: string | null;
    name?: string | null;
    quantity?: number | null;
    unitLabel?: string | null;
    totalPrice?: DecimalLike;
    note?: string | null;
  }> | null;
} | null | undefined;

type PaymentLike = {
  amount?: DecimalLike;
  type?: string | null;
  status?: string | null;
  paidAt?: Date | string | null;
  trackingCode?: string | null;
  referenceNumber?: string | null;
  reference?: string | null;
  paymentMethod?: {
    title?: string | null;
    type?: "CASH" | "CARD" | "BANK_TRANSFER" | "CARD_TO_CARD" | "CHECK" | "ONLINE" | "OTHER" | null;
  } | null;
  contract?: ContractLike;
  customer?: CustomerLike;
} | null | undefined;

type ExpenseLike = {
  title?: string | null;
  amount?: DecimalLike;
  status?: string | null;
  occurredAt?: Date | string | null;
  vendorName?: string | null;
  referenceNumber?: string | null;
  contract?: ContractLike;
  customer?: CustomerLike;
  financialCategory?: { title?: string | null } | null;
  paymentMethod?: {
    title?: string | null;
    type?: "CASH" | "CARD" | "BANK_TRANSFER" | "CARD_TO_CARD" | "CHECK" | "ONLINE" | "OTHER" | null;
  } | null;
} | null | undefined;

const emptyValue = "ثبت نشده";

function text(value: unknown, fallback = emptyValue) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const normalized = String(value).trim();
  return normalized || fallback;
}

function numberText(value: number | null | undefined) {
  return value === null || value === undefined ? emptyValue : new Intl.NumberFormat("fa-IR").format(value);
}

function toNumber(value: DecimalLike) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: DecimalLike) {
  return formatIRR(toNumber(value));
}

function getTenantName(tenant: TenantLike) {
  return text(tenant?.name, "تالار");
}

function getCurrentVariables(tenant: TenantLike) {
  const now = new Date();

  return {
    tenantName: getTenantName(tenant),
    customerSupportPhone: formatCustomerSupportPhones([tenant?.hallProfile?.phone, tenant?.hallProfile?.mobile].filter(Boolean).join("، ")),
    supportPhone: formatCustomerSupportPhones([tenant?.hallProfile?.phone, tenant?.hallProfile?.mobile].filter(Boolean).join("، ")),
    hallAddress: formatHallAddress([tenant?.hallProfile?.province, tenant?.hallProfile?.city, tenant?.hallProfile?.address]),
    tenantAddress: formatHallAddress([tenant?.hallProfile?.province, tenant?.hallProfile?.city, tenant?.hallProfile?.address]),
    currentDate: formatJalaliDate(now),
    currentDateTime: formatJalaliDateTime(now),
    operatorName: "سامانه",
    userName: "سامانه",
    userEmail: "ثبت نشده",
  };
}

function isContractCanceled(contract: ContractLike) {
  return String(contract?.status ?? "").toUpperCase() === "CANCELED";
}

function getEffectiveRemainingAmount(contract: ContractLike) {
  return isContractCanceled(contract) ? 0 : toNumber(contract?.remainingAmount);
}

function isActiveReceiptStatus(status: string | null | undefined) {
  const normalized = String(status ?? "RECORDED").toUpperCase();
  return normalized !== "CANCELED" && normalized !== "CANCELLED" && normalized !== "RETURNED" && normalized !== "VOID" && normalized !== "PENDING";
}

function getContractPaidAmount(contract: ContractLike) {
  const paymentsTotal = (contract?.payments ?? []).reduce((sum, payment) => {
    if (!isActiveReceiptStatus(payment.status)) {
      return sum;
    }

    const amount = toNumber(payment.amount);
    return sum + (payment.type === "REFUND" ? -amount : amount);
  }, 0);

  if (paymentsTotal > 0) {
    return paymentsTotal;
  }

  const depositAmount = toNumber(contract?.depositAmount);

  if (depositAmount > 0) {
    return depositAmount;
  }

  const finalTotal = toNumber(contract?.finalTotal);
  const remainingAmount = getEffectiveRemainingAmount(contract);

  if (finalTotal > 0) {
    return Math.max(0, finalTotal - remainingAmount);
  }

  return 0;
}

function getContractStatusLabel(status: string | null | undefined) {
  return status && status in contractStatusLabels
    ? contractStatusLabels[status as keyof typeof contractStatusLabels]
    : emptyValue;
}

function getLineItemTypeLabel(type: string | null | undefined) {
  return type && type in lineItemTypeLabels
    ? lineItemTypeLabels[type as keyof typeof lineItemTypeLabels]
    : "آیتم مراسم";
}

function buildLineItemsSummary(lineItems: Array<{ type?: string | null; name?: string | null; quantity?: number | null; unitLabel?: string | null; totalPrice?: DecimalLike; note?: string | null }> | null | undefined) {
  if (!lineItems?.length) {
    return emptyValue;
  }

  const rows = lineItems.slice(0, 12).map((item, index) => {
    const quantity = item.quantity ? numberText(item.quantity) : "۱";
    const unitLabel = text(item.unitLabel, "عدد");
    const total = money(item.totalPrice);
    return `${numberText(index + 1)}) ${getLineItemTypeLabel(item.type)}: ${text(item.name)} - ${quantity} ${unitLabel} - ${total}`;
  });

  if (lineItems.length > 12) {
    rows.push(`+ ${numberText(lineItems.length - 12)} آیتم دیگر`);
  }

  return rows.join("\n");
}

export function buildContractNotificationVariables(contract: ContractLike, tenant?: TenantLike) {
  const customer = contract?.customer;
  const paidAmount = getContractPaidAmount(contract);
  const remainingAmount = getEffectiveRemainingAmount(contract);
  const paymentStatus = isContractCanceled(contract)
    ? "بسته‌شده / کنسلی"
    : remainingAmount <= 0
      ? "تسویه‌شده"
      : "دارای مانده";

  return {
    ...getCurrentVariables(tenant),
    contractNumber: text(contract?.contractNo),
    customerName: text(customer?.fullName),
    customerMobile: text(customer?.phone),
    customerNationalCode: text(customer?.nationalCode ?? customer?.nationalId),
    eventType: text(contract?.eventTypeName, "مراسم"),
    eventDate: formatJalaliDate(contract?.eventDate),
    eventDay: formatJalaliWeekday(contract?.eventDate),
    eventDateFull: `${formatJalaliWeekday(contract?.eventDate)} ${formatJalaliDate(contract?.eventDate)}`,
    eventTime: formatContractTime(contract?.eventStartTime),
    eventTimeRange: formatContractTimeRange(contract?.eventStartTime, contract?.eventEndTime),
    guestCount: numberText(contract?.guestCount),
    finalTotal: money(contract?.finalTotal),
    depositAmount: money(contract?.depositAmount),
    paidAmount: formatIRR(paidAmount),
    remainingAmount: formatIRR(remainingAmount),
    contractStatus: getContractStatusLabel(contract?.status),
    contractStatusCode: text(contract?.status),
    paymentStatus,
    contractPaymentStatus: paymentStatus,
    hallName: text(contract?.hall?.name),
    hallAddress: formatHallAddress([contract?.hall?.city, contract?.hall?.address]) || formatHallAddress([tenant?.hallProfile?.province, tenant?.hallProfile?.city, tenant?.hallProfile?.address]),
    tenantAddress: formatHallAddress([contract?.hall?.city, contract?.hall?.address]) || formatHallAddress([tenant?.hallProfile?.province, tenant?.hallProfile?.city, tenant?.hallProfile?.address]),
    salonName: text(contract?.salon?.name),
    packageName: text(contract?.packageName),
    contractNotes: text(contract?.notes),
    lineItemsSummary: buildLineItemsSummary(contract?.lineItems),
  };
}

export function buildPaymentNotificationVariables(
  payment: PaymentLike,
  contract?: ContractLike,
  customer?: CustomerLike,
  tenant?: TenantLike,
) {
  const resolvedContract = contract ?? payment?.contract;
  const resolvedCustomer = customer ?? payment?.customer ?? resolvedContract?.customer;

  return {
    ...buildContractNotificationVariables(
      resolvedContract ? { ...resolvedContract, customer: resolvedCustomer } : null,
      tenant,
    ),
    paymentAmount: money(payment?.amount),
    paymentType: getPaymentTypeLabel(payment?.type),
    paymentStatus: getPaymentRecordStatusLabel(payment?.status),
    paymentMethod: formatPaymentMethodLabel(payment?.paymentMethod),
    paidAt: formatJalaliDate(payment?.paidAt),
    trackingCode: text(payment?.trackingCode),
    referenceNumber: text(payment?.referenceNumber ?? payment?.reference),
  };
}

export function buildExpenseNotificationVariables(
  expense: ExpenseLike,
  contract?: ContractLike,
  customer?: CustomerLike,
  tenant?: TenantLike,
) {
  const resolvedContract = contract ?? expense?.contract;
  const resolvedCustomer = customer ?? expense?.customer ?? resolvedContract?.customer;

  return {
    ...buildContractNotificationVariables(
      resolvedContract ? { ...resolvedContract, customer: resolvedCustomer } : null,
      tenant,
    ),
    expenseTitle: text(expense?.title),
    expenseAmount: money(expense?.amount),
    expenseCategory: text(expense?.financialCategory?.title),
    expenseStatus: getExpenseStatusLabel(expense?.status),
    occurredAt: formatJalaliDate(expense?.occurredAt),
    vendorName: text(expense?.vendorName),
    referenceNumber: text(expense?.referenceNumber),
    paymentMethod: formatPaymentMethodLabel(expense?.paymentMethod),
  };
}

export function buildCustomerNotificationVariables(customer: CustomerLike, tenant?: TenantLike) {
  return {
    ...getCurrentVariables(tenant),
    customerName: text(customer?.fullName),
    customerMobile: text(customer?.phone),
    customerNationalCode: text(customer?.nationalCode ?? customer?.nationalId),
  };
}
