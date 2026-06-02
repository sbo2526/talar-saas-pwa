"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { parseDateLikeToDate, toLatinDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { getEffectivePaidAmount, toNumber } from "@/lib/payments/display";

const bulkSettlementPath = "/dashboard/settings/bulk-contract-settlement";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function buildRedirect(status: string, cutoff?: string): never {
  const params = new URLSearchParams({ status });
  if (cutoff) params.set("cutoff", cutoff);
  redirect(`${bulkSettlementPath}?${params.toString()}`);
}

function endOfDate(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function normalizeCutoffDate(value: string) {
  const normalized = toLatinDigits(value).replace(/[/.]/g, "-");
  const parsed = parseDateLikeToDate(normalized);
  return parsed ? endOfDate(parsed) : null;
}

export async function bulkSettleHistoricalContractsAction(formData: FormData) {
  const membership = await requireTenantMember();

  if (membership.role !== "OWNER") {
    buildRedirect("owner-only");
  }

  const cutoffInput = readString(formData, "cutoffDate");
  const confirmation = readString(formData, "confirmation");
  const note = readString(formData, "note").slice(0, 500);
  const cutoffDate = normalizeCutoffDate(cutoffInput);

  if (!cutoffDate) {
    buildRedirect("invalid-date", cutoffInput);
  }

  if (confirmation !== "تسویه گروهی") {
    buildRedirect("confirm-required", cutoffInput);
  }

  const now = new Date();

  if (cutoffDate.getTime() > now.getTime()) {
    buildRedirect("future-date", cutoffInput);
  }

  const db = await getPrisma();

  const contracts = await db.contract.findMany({
    where: {
      tenantId: membership.tenantId,
      eventDate: { lte: cutoffDate },
      status: { not: "CANCELED" },
    },
    select: {
      id: true,
      contractNo: true,
      status: true,
      eventDate: true,
      finalTotal: true,
      depositAmount: true,
      remainingAmount: true,
      remainingAmountManual: true,
      customerId: true,
      customer: { select: { fullName: true, phone: true } },
      payments: { select: { amount: true, type: true, status: true } },
      invoice: { select: { id: true, status: true } },
    },
    orderBy: [{ eventDate: "asc" }, { contractNo: "asc" }],
  });

  if (contracts.length === 0) {
    buildRedirect("empty", cutoffInput);
  }

  let paymentCreatedCount = 0;
  let completedCount = 0;
  let invoiceSettledCount = 0;
  let skippedAlreadySettled = 0;
  let totalAutoSettlementAmount = 0;
  const affectedContractNumbers: string[] = [];

  await db.$transaction(async (tx) => {
    for (const contract of contracts) {
      const paidAmount = getEffectivePaidAmount(contract.payments);
      const computedRemaining = Math.max(0, toNumber(contract.finalTotal) - paidAmount);
      const storedRemaining = Math.max(0, toNumber(contract.remainingAmount));
      const wasAlreadySettled = contract.status === "COMPLETED" && storedRemaining <= 0;
      const remainingAmount = wasAlreadySettled
        ? 0
        : contract.remainingAmountManual
          ? storedRemaining
          : Math.max(computedRemaining, storedRemaining);
      const safeRemaining = Math.max(0, Math.round(remainingAmount));

      if (wasAlreadySettled) {
        skippedAlreadySettled += 1;
        continue;
      }

      if (safeRemaining > 0) {
        const payment = await tx.payment.create({
          data: {
            tenantId: membership.tenantId,
            contractId: contract.id,
            customerId: contract.customerId,
            paymentMethodId: null,
            type: "FINAL_SETTLEMENT",
            status: "RECORDED",
            amount: safeRemaining,
            paidAt: cutoffDate,
            reference: "BULK_HISTORICAL_SETTLEMENT",
            referenceNumber: "BULK_HISTORICAL_SETTLEMENT",
            trackingCode: null,
            note: [
              "تسویه گروهی قراردادهای قدیمی توسط مالک",
              note || null,
            ].filter(Boolean).join(" - "),
          },
          select: { id: true },
        });

        paymentCreatedCount += 1;
        totalAutoSettlementAmount += safeRemaining;

        await tx.auditLog.create({
          data: {
            tenantId: membership.tenantId,
            userId: membership.userId,
            action: "BULK_HISTORICAL_CONTRACT_SETTLEMENT_PAYMENT_CREATED",
            entityType: "PAYMENT",
            entityId: payment.id,
            title: "ثبت تسویه گروهی قرارداد قدیمی",
            message: `برای قرارداد ${contract.contractNo} دریافت تسویه گروهی ثبت شد.`,
            beforeData: {
              contractId: contract.id,
              contractNo: contract.contractNo,
              status: contract.status,
              remainingAmount: contract.remainingAmount.toString(),
            } satisfies Prisma.InputJsonValue,
            afterData: {
              paymentId: payment.id,
              amount: safeRemaining,
              paidAt: cutoffDate.toISOString(),
              source: "BULK_HISTORICAL_SETTLEMENT",
            } satisfies Prisma.InputJsonValue,
            metadata: {
              taskId: "TALAR_BULK_HISTORICAL_CONTRACT_SETTLEMENT_95",
              cutoffDate: cutoffDate.toISOString(),
              ownerOnly: true,
              customerName: contract.customer.fullName,
              customerPhone: contract.customer.phone,
            } satisfies Prisma.InputJsonValue,
            href: `/dashboard/contracts/${contract.id}`,
          },
        });
      }

      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: "COMPLETED",
          remainingAmount: "0",
          remainingAmountManual: false,
        },
      });
      completedCount += 1;
      affectedContractNumbers.push(contract.contractNo);

      if (contract.invoice && contract.invoice.status !== "CANCELED" && contract.invoice.status !== "SETTLED") {
        await tx.invoice.update({
          where: { id: contract.invoice.id },
          data: { status: "SETTLED" },
        });
        invoiceSettledCount += 1;
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "BULK_HISTORICAL_CONTRACT_SETTLEMENT_COMPLETED",
        entityType: "CONTRACT",
        entityId: null,
        title: "تسویه گروهی قراردادهای قدیمی",
        message: `${completedCount} قرارداد تا تاریخ انتخاب‌شده توسط مالک تسویه/تکمیل شد.`,
        afterData: {
          cutoffDate: cutoffDate.toISOString(),
          contractsFound: contracts.length,
          completedCount,
          paymentCreatedCount,
          invoiceSettledCount,
          skippedAlreadySettled,
          totalAutoSettlementAmount,
          affectedContractNumbers: affectedContractNumbers.slice(0, 120),
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_BULK_HISTORICAL_CONTRACT_SETTLEMENT_95",
          ownerOnly: true,
          operation: "mark_old_contracts_as_settled_until_cutoff",
          note: note || null,
        } satisfies Prisma.InputJsonValue,
        href: bulkSettlementPath,
      },
    });
  }, { timeout: 30000 });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/owner-financial-overview");
  revalidatePath("/dashboard/owner-settlements");
  revalidatePath("/dashboard/settings/activity");
  revalidatePath(bulkSettlementPath);

  buildRedirect("settled", cutoffInput);
}
