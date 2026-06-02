import type { Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getEffectivePaidAmount, toNumber, type PaymentAmountLike } from "@/lib/payments/display";

export type ContractFinancialStateCode = "POSITIVE" | "SETTLED" | "NEGATIVE" | "NEUTRAL" | "CANCELED";

export type ContractFinancialState = {
  contract: {
    id: string;
    contractNo: string;
    status: string;
  };
  finalTotal: number;
  receivedTotal: number;
  remainingAmount: number;
  state: ContractFinancialStateCode;
  label: string;
  canReceive: boolean;
  blockReason?: string;
};

type DecimalLike = { toString(): string } | string | number | null | undefined;

type ContractFinancialSource = {
  id: string;
  contractNo: string;
  status: string;
  finalTotal: DecimalLike;
  depositAmount?: DecimalLike;
  payments?: PaymentAmountLike[];
};

type ContractFinancialClient = Prisma.TransactionClient | Awaited<ReturnType<typeof getPrisma>>;

export function calculateContractFinancialState(contract: ContractFinancialSource): ContractFinancialState {
  const paymentsTotal = getEffectivePaidAmount(contract.payments ?? []);
  const receivedTotal = paymentsTotal > 0 ? paymentsTotal : toNumber(contract.depositAmount);
  const finalTotal = toNumber(contract.finalTotal);
  const rawRemainingAmount = finalTotal - receivedTotal;
  const remainingAmount = contract.status === "CANCELED" ? 0 : rawRemainingAmount;

  const state: ContractFinancialStateCode = contract.status === "CANCELED"
    ? "CANCELED"
    : finalTotal <= 0
      ? "NEUTRAL"
      : remainingAmount > 0
        ? "POSITIVE"
        : remainingAmount === 0
          ? "SETTLED"
          : "NEGATIVE";

  const label = getContractFinancialStateLabel(state);
  const blockReason = getContractFinancialBlockReason(state);

  return {
    contract: {
      id: contract.id,
      contractNo: contract.contractNo,
      status: contract.status,
    },
    finalTotal,
    receivedTotal,
    remainingAmount,
    state,
    label,
    canReceive: state === "POSITIVE" && remainingAmount > 0,
    blockReason,
  };
}

export async function getContractFinancialState(
  tenantId: string,
  contractId: string,
  client?: ContractFinancialClient,
): Promise<ContractFinancialState> {
  const db = client ?? await getPrisma();
  const contract = await db.contract.findFirst({
    where: { id: contractId, tenantId },
    select: {
      id: true,
      contractNo: true,
      status: true,
      finalTotal: true,
      depositAmount: true,
      payments: {
        select: {
          amount: true,
          type: true,
          status: true,
        },
      },
    },
  });

  if (!contract) {
    throw new Error("INVALID_CONTRACT");
  }

  return calculateContractFinancialState(contract);
}

export function getContractFinancialStateLabel(state: ContractFinancialStateCode) {
  const labels: Record<ContractFinancialStateCode, string> = {
    POSITIVE: "مانده قابل دریافت",
    SETTLED: "تسویه‌شده",
    NEGATIVE: "اضافه دریافت / بستانکاری مشتری",
    NEUTRAL: "وضعیت مالی خنثی",
    CANCELED: "لغوشده",
  };

  return labels[state];
}

function getContractFinancialBlockReason(state: ContractFinancialStateCode) {
  if (state === "CANCELED") {
    return "این قرارداد لغو شده است و امکان ثبت دریافت برای آن وجود ندارد.";
  }

  if (state === "SETTLED") {
    return "این قرارداد قبلاً تسویه شده است و امکان ثبت دریافت جدید برای آن وجود ندارد.";
  }

  if (state === "NEGATIVE") {
    return "این قرارداد اضافه دریافت دارد و امکان ثبت دریافت جدید برای آن وجود ندارد.";
  }

  if (state === "NEUTRAL") {
    return "این قرارداد مبلغ نهایی قابل دریافت ندارد و امکان ثبت دریافت برای آن وجود ندارد.";
  }

  return undefined;
}
