"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditCreate, auditUpdate } from "@/lib/audit/audit-action-helpers";
import { requireTenantMember } from "@/lib/auth/session";
import { getCurrentLocalDateStart } from "@/lib/post-event-decisions/rules";
import {
  calculatePostEventInvoiceTotals,
  calculateSuggestedPerGuestAmount,
  getPreviousPaymentsAmount,
  parseNonNegativeInt,
  parsePositiveMoney,
  parsePositiveQuantity,
  validatePostEventInvoiceBase,
} from "@/lib/post-event-invoices/rules";
import { getPrisma } from "@/lib/prisma";
import { toNumber } from "@/lib/payments/display";

type DbClient = Awaited<ReturnType<typeof getPrisma>> | Prisma.TransactionClient;

type EditableExtraServiceLine = {
  title: string;
  description: string | null;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
};

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim();
  return value && value.length > 0 ? value : null;
}

function normalizeNote(value: FormDataEntryValue | null) {
  const note = value?.toString().trim();
  return note && note.length > 0 ? note.slice(0, 1000) : null;
}

function normalizeTitle(value: FormDataEntryValue | null) {
  const title = value?.toString().trim();
  return title && title.length > 0 ? title.slice(0, 160) : null;
}

function revalidatePostEventInvoicePaths(contractId?: string | null, invoiceId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/post-event-invoices");

  if (contractId) {
    revalidatePath(`/dashboard/contracts/${contractId}`);
    revalidatePath(`/dashboard/contracts/${contractId}/post-event-invoice`);
  }

  if (invoiceId) {
    revalidatePath(`/dashboard/post-event-invoices/${invoiceId}`);
  }
}

function getInvoiceIssuePrefix(now = new Date()) {
  return `PEI-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function generatePostEventInvoiceNumber(tx: Prisma.TransactionClient, tenantId: string) {
  const prefix = getInvoiceIssuePrefix();
  const existing = await tx.postEventInvoice.findMany({
    where: { tenantId, invoiceNumber: { startsWith: `${prefix}-` } },
    select: { invoiceNumber: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const maxSequence = existing.reduce((max, item) => {
    const sequence = Number(item.invoiceNumber.split("-").at(-1));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  return `${prefix}-${String(maxSequence + 1).padStart(4, "0")}`;
}

async function resolveHeldEligibleContract(db: DbClient, input: { tenantId: string; contractId: string }) {
  return db.contract.findFirst({
    where: {
      id: input.contractId,
      tenantId: input.tenantId,
      status: { not: "CANCELED" },
      eventDate: { lt: getCurrentLocalDateStart() },
      postEventDecision: { is: { decisionStatus: "HELD" } },
    },
    include: {
      customer: { select: { fullName: true } },
      postEventDecision: true,
      postEventInvoice: true,
      lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      payments: { select: { amount: true, type: true, status: true } },
    },
  });
}

function parseExtraServiceLines(formData: FormData) {
  const titles = formData.getAll("extraServiceTitle");
  const descriptions = formData.getAll("extraServiceDescription");
  const quantities = formData.getAll("extraServiceQuantity");
  const unitAmounts = formData.getAll("extraServiceUnitAmount");
  const lines: EditableExtraServiceLine[] = [];

  for (let index = 0; index < titles.length; index += 1) {
    const title = normalizeTitle(titles[index] ?? null);
    const description = normalizeNote(descriptions[index] ?? null);
    const quantity = parsePositiveQuantity(quantities[index] ?? null);
    const unitAmount = parsePositiveMoney(unitAmounts[index] ?? null);
    const hasAnyValue = Boolean(title || description || quantities[index]?.toString().trim() || unitAmounts[index]?.toString().trim());

    if (!hasAnyValue) continue;

    if (!title || quantity === null || unitAmount === null) {
      throw new Error("INVALID_EXTRA_SERVICE_LINE");
    }

    lines.push({
      title,
      description,
      quantity,
      unitAmount,
      totalAmount: quantity * unitAmount,
    });
  }

  return lines;
}

async function recalculateAndPersistDraft(input: {
  db: DbClient;
  invoiceId: string;
  tenantId: string;
  formData: FormData;
  requireActualGuestCount: boolean;
}) {
  const invoice = await input.db.postEventInvoice.findFirst({
    where: { id: input.invoiceId, tenantId: input.tenantId },
    include: { lines: true, contract: { select: { id: true, contractNo: true } } },
  });

  if (!invoice || invoice.status !== "DRAFT") {
    throw new Error("INVOICE_NOT_EDITABLE");
  }

  const actualGuestCount = parseNonNegativeInt(input.formData.get("actualGuestCount"));

  if (input.requireActualGuestCount && actualGuestCount === null) {
    throw new Error("ACTUAL_GUEST_REQUIRED");
  }

  const suggestedPerGuestAmount = toNumber(invoice.suggestedPerGuestAmount);
  const finalPerGuestAmount = parsePositiveMoney(input.formData.get("finalPerGuestAmount")) ?? suggestedPerGuestAmount;

  if (finalPerGuestAmount < suggestedPerGuestAmount) {
    throw new Error("PER_GUEST_BELOW_SUGGESTED");
  }

  const extraServiceLines = parseExtraServiceLines(input.formData);
  const extraServiceAmount = extraServiceLines.reduce((sum, line) => sum + line.totalAmount, 0);
  const safeActualGuestCount = actualGuestCount ?? invoice.contractGuestCountSnapshot;
  const totals = calculatePostEventInvoiceTotals({
    contractFinalAmountSnapshot: toNumber(invoice.contractFinalAmountSnapshot),
    contractGuestCountSnapshot: invoice.contractGuestCountSnapshot,
    finalPerGuestAmount,
    actualGuestCount: safeActualGuestCount,
    extraServiceAmount,
    managerApprovedDeductionAmount: 0,
    previousPaymentsAmount: toNumber(invoice.previousPaymentsAmount),
  });

  await input.db.postEventInvoiceLine.deleteMany({
    where: {
      tenantId: input.tenantId,
      invoiceId: invoice.id,
      lineType: { in: ["EXTRA_GUEST", "EXTRA_SERVICE"] },
      isLockedFromContract: false,
    },
  });

  if (totals.extraGuestCount > 0) {
    await input.db.postEventInvoiceLine.create({
      data: {
        tenantId: input.tenantId,
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        lineType: "EXTRA_GUEST",
        title: "نفرات اضافه",
        description: "محاسبه خودکار بر اساس تعداد واقعی مهمان بعد از مراسم",
        quantity: totals.extraGuestCount,
        unitAmount: finalPerGuestAmount,
        totalAmount: totals.extraGuestAmount,
        isLockedFromContract: false,
      },
    });
  }

  if (extraServiceLines.length > 0) {
    await input.db.postEventInvoiceLine.createMany({
      data: extraServiceLines.map((line) => ({
        tenantId: input.tenantId,
        invoiceId: invoice.id,
        contractId: invoice.contractId,
        lineType: "EXTRA_SERVICE" as const,
        title: line.title,
        description: line.description,
        quantity: line.quantity,
        unitAmount: line.unitAmount,
        totalAmount: line.totalAmount,
        isLockedFromContract: false,
      })),
    });
  }

  return input.db.postEventInvoice.update({
    where: { id: invoice.id },
    data: {
      actualGuestCount,
      finalPerGuestAmount,
      extraGuestCount: totals.extraGuestCount,
      extraGuestAmount: totals.extraGuestAmount,
      extraServiceAmount: totals.extraServiceAmount,
      managerApprovedDeductionAmount: 0,
      invoiceTotalAmount: totals.invoiceTotalAmount,
      finalBalanceAmount: totals.finalBalanceAmount,
      operatorNote: normalizeNote(input.formData.get("operatorNote")),
    },
  });
}

export async function createPostEventInvoiceDraftAction(formData: FormData) {
  const membership = await requireTenantMember();
  const contractId = getRequiredString(formData, "contractId");

  if (!contractId) {
    redirect("/dashboard/post-event-invoices?error=invalid-request");
  }

  const db = await getPrisma();
  let invoiceId: string | null = null;

  try {
    const invoice = await db.$transaction(async (tx) => {
      const contract = await resolveHeldEligibleContract(tx, { tenantId: membership.tenantId, contractId });

      if (!contract) {
        throw new Error("HELD_DECISION_REQUIRED");
      }

      if (contract.postEventInvoice) {
        return contract.postEventInvoice;
      }

      const contractFinalAmountSnapshot = toNumber(contract.finalTotal);
      const contractGuestCountSnapshot = contract.guestCount;
      const baseValidationError = validatePostEventInvoiceBase({
        contractFinalAmountSnapshot,
        contractGuestCountSnapshot,
      });

      if (baseValidationError) {
        throw new Error(baseValidationError.includes("تعداد") ? "INVALID_GUEST_COUNT" : "INVALID_FINAL_AMOUNT");
      }

      const suggestedPerGuestAmount = calculateSuggestedPerGuestAmount({
        contractFinalAmountSnapshot,
        contractGuestCountSnapshot,
      });
      const previousPaymentsAmount = getPreviousPaymentsAmount(contract.payments);
      const invoiceNumber = await generatePostEventInvoiceNumber(tx, membership.tenantId);
      const created = await tx.postEventInvoice.create({
        data: {
          tenantId: membership.tenantId,
          contractId: contract.id,
          hallId: contract.hallId,
          invoiceNumber,
          status: "DRAFT",
          contractFinalAmountSnapshot,
          contractGuestCountSnapshot,
          suggestedPerGuestAmount,
          finalPerGuestAmount: suggestedPerGuestAmount,
          previousPaymentsAmount,
          invoiceTotalAmount: contractFinalAmountSnapshot,
          finalBalanceAmount: contractFinalAmountSnapshot - previousPaymentsAmount,
          operatorNote: normalizeNote(formData.get("operatorNote")),
        },
      });

      if (contract.lineItems.length > 0) {
        await tx.postEventInvoiceLine.createMany({
          data: contract.lineItems.map((line) => ({
            tenantId: membership.tenantId,
            invoiceId: created.id,
            contractId: contract.id,
            lineType: "CONTRACT_ITEM" as const,
            title: line.name,
            description: line.note,
            quantity: line.quantity,
            unitAmount: line.unitPrice,
            totalAmount: line.totalPrice,
            sourceContractLineItemId: line.id,
            isLockedFromContract: true,
          })),
        });
      }

      await auditCreate({
        membership,
        entityType: "POST_EVENT_INVOICE",
        entityLabel: "صورتحساب بعد از مراسم",
        entityId: created.id,
        recordLabel: `قرارداد ${contract.contractNo}`,
        title: "ایجاد پیش‌نویس صورتحساب بعد از مراسم",
        afterData: created,
        href: `/dashboard/post-event-invoices/${created.id}`,
      });

      return created;
    });

    invoiceId = invoice.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    if (reason === "HELD_DECISION_REQUIRED") {
      redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=held-required`);
    }
    if (reason === "INVALID_GUEST_COUNT") {
      redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=invalid-guest-count`);
    }
    if (reason === "INVALID_FINAL_AMOUNT") {
      redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=invalid-final-amount`);
    }
    redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=create-failed`);
  }

  revalidatePostEventInvoicePaths(contractId, invoiceId);
  redirect(`/dashboard/contracts/${contractId}/post-event-invoice?created=1`);
}

export async function savePostEventInvoiceDraftAction(formData: FormData) {
  const membership = await requireTenantMember();
  const invoiceId = getRequiredString(formData, "invoiceId");
  const contractId = getRequiredString(formData, "contractId");

  if (!invoiceId || !contractId) {
    redirect("/dashboard/post-event-invoices?error=invalid-request");
  }

  const db = await getPrisma();

  let updatedInvoiceId: string | null = null;

  try {
    const invoice = await recalculateAndPersistDraft({
      db,
      invoiceId,
      tenantId: membership.tenantId,
      formData,
      requireActualGuestCount: false,
    });
    updatedInvoiceId = invoice.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=${encodeURIComponent(reason)}`);
  }

  revalidatePostEventInvoicePaths(contractId, updatedInvoiceId);
  redirect(`/dashboard/contracts/${contractId}/post-event-invoice?saved=1`);
}

export async function issuePostEventInvoiceAction(formData: FormData) {
  const membership = await requireTenantMember();
  const invoiceId = getRequiredString(formData, "invoiceId");
  const contractId = getRequiredString(formData, "contractId");

  if (!invoiceId || !contractId) {
    redirect("/dashboard/post-event-invoices?error=invalid-request");
  }

  const db = await getPrisma();

  let issuedInvoiceId: string | null = null;

  try {
    const issued = await db.$transaction(async (tx) => {
      const invoice = await tx.postEventInvoice.findFirst({
        where: { id: invoiceId, tenantId: membership.tenantId },
        include: { contract: { include: { postEventDecision: true } } },
      });

      if (!invoice || invoice.status !== "DRAFT") {
        throw new Error("INVOICE_NOT_EDITABLE");
      }

      if (invoice.contract.postEventDecision?.decisionStatus !== "HELD") {
        throw new Error("HELD_DECISION_REQUIRED");
      }

      const recalculated = await recalculateAndPersistDraft({
        db: tx,
        invoiceId: invoice.id,
        tenantId: membership.tenantId,
        formData,
        requireActualGuestCount: true,
      });

      const updated = await tx.postEventInvoice.update({
        where: { id: recalculated.id },
        data: {
          status: "ISSUED",
          issuedAt: new Date(),
          issuedByUserId: membership.userId,
        },
      });

      await auditUpdate({
        membership,
        action: "ISSUE",
        entityType: "POST_EVENT_INVOICE",
        entityLabel: "صورتحساب بعد از مراسم",
        entityId: updated.id,
        recordLabel: `قرارداد ${invoice.contract.contractNo}`,
        title: "صدور صورتحساب بعد از مراسم",
        actionLabel: "صدور",
        beforeData: invoice,
        afterData: updated,
        href: `/dashboard/post-event-invoices/${updated.id}`,
      });

      return updated;
    });

    issuedInvoiceId = issued.id;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    redirect(`/dashboard/contracts/${contractId}/post-event-invoice?error=${encodeURIComponent(reason)}`);
  }

  revalidatePostEventInvoicePaths(contractId, issuedInvoiceId);
  redirect(`/dashboard/post-event-invoices/${issuedInvoiceId}?issued=1`);
}
