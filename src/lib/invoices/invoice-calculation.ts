import type { Prisma } from "@prisma/client";

export type DecimalLike = { toString(): string } | string | number | null | undefined;

export type ContractInvoiceLineInput = {
  id: string;
  type: string;
  pricingType: string | null;
  category: string | null;
  name: string;
  quantity: number;
  unitLabel: string | null;
  unitPrice: DecimalLike;
  totalPrice: DecimalLike;
  note: string | null;
};

export type ContractPaymentInput = {
  amount: DecimalLike;
  type?: string | null;
  status?: string | null;
};

export type ContractInvoiceInput = {
  id: string;
  tenantId: string;
  contractNo: string;
  title: string;
  status: string;
  eventTypeName: string | null;
  eventDate: Date;
  eventStartTime: string | null;
  eventEndTime: string | null;
  guestCount: number;
  packageName: string | null;
  packageTotal: DecimalLike;
  servicesTotal: DecimalLike;
  menuTotal: DecimalLike;
  discountAmount: DecimalLike;
  depositAmount: DecimalLike;
  finalTotal: DecimalLike;
  remainingAmount: DecimalLike;
  totalAmount: DecimalLike;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    nationalCode?: string | null;
    nationalId?: string | null;
  };
  hall?: { name: string | null } | null;
  salon?: { name: string | null } | null;
  lineItems: ContractInvoiceLineInput[];
  payments: ContractPaymentInput[];
};

export type InvoiceCalculationResult = {
  invoiceNo: string;
  guestCountContracted: number;
  guestCountActual: number;
  extraGuestCount: number;
  minimumPerGuestPrice: number;
  contractSubtotal: number;
  extraGuestTotal: number;
  subtotal: number;
  discountAmount: number;
  paidAmountAtIssue: number;
  payableAmount: number;
  lines: Array<{
    contractLineItemId: string | null;
    sourceType: "CONTRACT_LINE" | "EXTRA_GUEST";
    name: string;
    description: string | null;
    quantity: number;
    unitLabel: string | null;
    unitPrice: number;
    minUnitPrice: number;
    totalPrice: number;
    isLocked: boolean;
    sortOrder: number;
    metadata: Prisma.InputJsonValue;
  }>;
  snapshot: Prisma.InputJsonValue;
};

export function toMoneyNumber(value: DecimalLike) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function getInvoicePaidAmount(payments: ContractPaymentInput[] | undefined, depositAmount: DecimalLike) {
  const paymentsTotal = (payments ?? []).reduce((sum, payment) => {
    if (payment.status === "CANCELED" || payment.status === "RETURNED" || payment.status === "PENDING") {
      return sum;
    }

    const amount = toMoneyNumber(payment.amount);
    return sum + (payment.type === "REFUND" ? -amount : amount);
  }, 0);

  return paymentsTotal > 0 ? Math.max(0, paymentsTotal) : toMoneyNumber(depositAmount);
}

export function calculateMinimumPerGuestPrice(finalTotal: DecimalLike, contractedGuestCount: number) {
  const guestCount = Number.isFinite(contractedGuestCount) ? Math.max(0, contractedGuestCount) : 0;
  const total = toMoneyNumber(finalTotal);

  if (guestCount <= 0 || total <= 0) {
    return 0;
  }

  return Math.ceil(total / guestCount);
}

export function buildInvoiceNo(contractNo: string) {
  return `INV-${contractNo}`.replace(/\s+/g, "-");
}

export function calculatePostEventInvoice(contract: ContractInvoiceInput, actualGuestCount: number): InvoiceCalculationResult {
  const guestCountContracted = Math.max(0, contract.guestCount || 0);
  const guestCountActual = Math.max(guestCountContracted, Math.floor(actualGuestCount || guestCountContracted));
  const extraGuestCount = Math.max(0, guestCountActual - guestCountContracted);
  const minimumPerGuestPrice = calculateMinimumPerGuestPrice(contract.finalTotal, guestCountContracted);
  const extraGuestTotal = extraGuestCount * minimumPerGuestPrice;
  const contractSubtotal = toMoneyNumber(contract.finalTotal);
  const discountAmount = toMoneyNumber(contract.discountAmount);
  const paidAmountAtIssue = getInvoicePaidAmount(contract.payments, contract.depositAmount);
  const subtotal = contractSubtotal + extraGuestTotal;
  const payableAmount = Math.max(0, subtotal - paidAmountAtIssue);

  const contractLines = contract.lineItems.map((item, index) => ({
    contractLineItemId: item.id,
    sourceType: "CONTRACT_LINE" as const,
    name: item.name,
    description: item.note || item.category || null,
    quantity: Math.max(1, item.quantity || 1),
    unitLabel: item.unitLabel,
    unitPrice: toMoneyNumber(item.unitPrice),
    minUnitPrice: toMoneyNumber(item.unitPrice),
    totalPrice: toMoneyNumber(item.totalPrice),
    isLocked: true,
    sortOrder: index + 1,
    metadata: {
      contractLineType: item.type,
      pricingType: item.pricingType,
      category: item.category,
      source: "contract_line_snapshot",
    } satisfies Prisma.InputJsonValue,
  }));

  const lines: InvoiceCalculationResult["lines"] = [...contractLines];

  if (extraGuestCount > 0) {
    lines.push({
      contractLineItemId: null,
      sourceType: "EXTRA_GUEST" as const,
      name: "نفرات اضافه بعد از مراسم",
      description: "حداقل مبلغ هر نفر اضافه از میانگین مبلغ قرارداد محاسبه و برای اپراتور قفل شده است.",
      quantity: extraGuestCount,
      unitLabel: "نفر",
      unitPrice: minimumPerGuestPrice,
      minUnitPrice: minimumPerGuestPrice,
      totalPrice: extraGuestTotal,
      isLocked: true,
      sortOrder: 900,
      metadata: {
        contractedGuestCount: guestCountContracted,
        actualGuestCount: guestCountActual,
        minimumPerGuestPrice,
        source: "phase_30_extra_guest_lock",
      } satisfies Prisma.InputJsonValue,
    });
  }

  const snapshot = {
    source: "TALAR_CONTRACT_TO_INVOICE_GENERATION_30",
    contractId: contract.id,
    contractNo: contract.contractNo,
    title: contract.title,
    status: contract.status,
    eventTypeName: contract.eventTypeName,
    eventDate: contract.eventDate.toISOString(),
    eventStartTime: contract.eventStartTime,
    eventEndTime: contract.eventEndTime,
    guestCount: contract.guestCount,
    customer: {
      id: contract.customer.id,
      fullName: contract.customer.fullName,
      phone: contract.customer.phone,
      nationalCode: contract.customer.nationalCode ?? null,
      nationalId: contract.customer.nationalId ?? null,
    },
    hallName: contract.hall?.name ?? null,
    salonName: contract.salon?.name ?? null,
    packageName: contract.packageName,
    packageTotal: toMoneyNumber(contract.packageTotal),
    servicesTotal: toMoneyNumber(contract.servicesTotal),
    menuTotal: toMoneyNumber(contract.menuTotal),
    discountAmount,
    depositAmount: toMoneyNumber(contract.depositAmount),
    finalTotal: contractSubtotal,
    remainingAmount: toMoneyNumber(contract.remainingAmount),
    totalAmount: toMoneyNumber(contract.totalAmount),
    issuedRules: {
      noAfterReviewOption: true,
      extraGuestPriceCanOnlyIncrease: true,
      operatorCannotReduceMinimumPerGuestPrice: true,
      invoiceRequiresHeldPostEventConfirmation: true,
    },
  } satisfies Prisma.InputJsonValue;

  return {
    invoiceNo: buildInvoiceNo(contract.contractNo),
    guestCountContracted,
    guestCountActual,
    extraGuestCount,
    minimumPerGuestPrice,
    contractSubtotal,
    extraGuestTotal,
    subtotal,
    discountAmount,
    paidAmountAtIssue,
    payableAmount,
    lines,
    snapshot,
  };
}
