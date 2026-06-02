"use server";

import type { Prisma } from "@prisma/client";
import type { ExpenseActionState } from "@/lib/actions/expense-state";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { getPrisma } from "@/lib/prisma";
import { expenseFormSchema, expenseIdSchema } from "@/lib/validation/expense";
import { buildExpenseNotificationVariables } from "@/lib/notifications/event-variables";
import { dispatchOwnerNotification } from "@/lib/notifications/owner-notification-dispatcher";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { buildAuditMessage, buildExpenseMessage, getAuditActorName } from "@/lib/audit/audit-log-messages";

const receiptMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
]);
const maxReceiptBytes = 5 * 1024 * 1024;

async function fetchExpenseForNotification(
  db: Awaited<ReturnType<typeof getPrisma>>,
  tenantId: string,
  expenseId: string,
) {
  return db.expense.findFirst({
    where: { id: expenseId, tenantId },
    select: {
      id: true,
      contractId: true,
      customerId: true,
      title: true,
      amount: true,
      status: true,
      occurredAt: true,
      vendorName: true,
      referenceNumber: true,
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
      customer: {
        select: {
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      contract: {
        select: {
          id: true,
          customerId: true,
          contractNo: true,
          status: true,
          eventTypeName: true,
          eventDate: true,
          eventStartTime: true,
          eventEndTime: true,
          guestCount: true,
          finalTotal: true,
          depositAmount: true,
          remainingAmount: true,
          customer: {
            select: {
              fullName: true,
              phone: true,
              nationalCode: true,
              nationalId: true,
            },
          },
          hall: { select: { name: true } },
          salon: { select: { name: true } },
        },
      },
    },
  });
}

async function dispatchExpenseTelegramNotificationSafely(input: {
  db: Awaited<ReturnType<typeof getPrisma>>;
  tenantId: string;
  tenant: { name?: string | null };
  expenseId: string;
  eventType: "EXPENSE_CREATED" | "EXPENSE_UPDATED" | "EXPENSE_CANCELED";
  actorName?: string;
}) {
  try {
    const expense = await fetchExpenseForNotification(input.db, input.tenantId, input.expenseId);

    if (!expense) {
      return;
    }

    const variables = {
      ...buildExpenseNotificationVariables(expense, expense.contract, expense.customer, input.tenant),
      operatorName: input.actorName ?? "سامانه",
      userName: input.actorName ?? "سامانه",
    };

    await dispatchOwnerNotification({
      tenantId: input.tenantId,
      eventType: input.eventType,
      variables,
      relatedExpenseId: expense.id,
      relatedContractId: expense.contractId,
      relatedCustomerId: expense.customerId,
    });
  } catch {
    // اعلان مدیریتی best-effort است و نباید عملیات اصلی هزینه را شکست دهد.
  }
}

function parseExpenseForm(formData: FormData) {
  return expenseFormSchema.safeParse({
    expenseId: formData.get("expenseId"),
    title: formData.get("title"),
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
    status: formData.get("status"),
    financialCategoryId: formData.get("financialCategoryId"),
    paymentMethodId: formData.get("paymentMethodId"),
    contractId: formData.get("contractId"),
    customerId: formData.get("customerId"),
    hallId: formData.get("hallId"),
    salonId: formData.get("salonId"),
    vendorName: formData.get("vendorName"),
    referenceNumber: formData.get("referenceNumber"),
    chequeNumber: formData.get("chequeNumber"),
    chequeDueDate: formData.get("chequeDueDate"),
    chequeBankName: formData.get("chequeBankName"),
    chequeBranchName: formData.get("chequeBranchName"),
    chequeRecipientName: formData.get("chequeRecipientName"),
    chequeAmount: formData.get("chequeAmount"),
    chequeStatus: formData.get("chequeStatus"),
    note: formData.get("note"),
  });
}

function revalidateExpensePaths(contractId?: string | null) {
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/base");

  if (contractId) {
    revalidatePath(`/dashboard/contracts/${contractId}`);
  }
}

function isReceiptFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

async function saveReceiptFile(file: File) {
  const extension = receiptMimeTypes.get(file.type);

  if (!extension || file.size > maxReceiptBytes) {
    throw new Error("INVALID_RECEIPT_FILE");
  }

  const directory = path.join(process.cwd(), "public", "uploads", "expense-receipts");
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const key = `expense-receipts/${filename}`;
  const publicUrl = `/uploads/${key}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);

  return { key, publicUrl };
}

async function ensureCategory(tx: Prisma.TransactionClient, tenantId: string, id: string | undefined) {
  if (!id) return null;

  const category = await tx.financialCategory.findFirst({
    where: { id, tenantId, type: "EXPENSE" },
    select: { id: true, isActive: true, type: true },
  });

  if (!category) throw new Error("INVALID_CATEGORY");
  return category.id;
}

async function ensurePaymentMethod(tx: Prisma.TransactionClient, tenantId: string, id: string | undefined, options?: { existingExpenseId?: string }) {
  if (!id) return null;

  const method = await tx.paymentMethod.findFirst({
    where: { id, tenantId },
    select: { id: true, isActive: true, type: true },
  });

  if (!method) throw new Error("INVALID_PAYMENT_METHOD");

  if (method.isActive) return method;

  if (options?.existingExpenseId) {
    const current = await tx.expense.findFirst({
      where: { id: options.existingExpenseId, tenantId, paymentMethodId: id },
      select: { id: true },
    });

    if (current) return method;
  }

  throw new Error("INVALID_PAYMENT_METHOD");
}

async function resolveRelations(
  tx: Prisma.TransactionClient,
  tenantId: string,
  input: {
    contractId?: string;
    customerId?: string;
    hallId?: string;
    salonId?: string;
  },
) {
  let contractId: string | null = null;
  let customerId: string | null = input.customerId ?? null;
  let hallId: string | null = input.hallId ?? null;
  let salonId: string | null = input.salonId ?? null;

  if (input.contractId) {
    const contract = await tx.contract.findFirst({
      where: { id: input.contractId, tenantId },
      select: { id: true, customerId: true, hallId: true, salonId: true },
    });

    if (!contract) throw new Error("INVALID_CONTRACT");

    contractId = contract.id;
    customerId = contract.customerId;
    // وقتی هزینه به قرارداد وصل می‌شود، تالار و سالن فقط از خود قرارداد گرفته می‌شود.
    // مقدارهای ارسالی client برای hallId/salonId قابل اعتماد نیستند و override نمی‌شوند.
    hallId = contract.hallId;
    salonId = contract.salonId;
  }

  if (customerId) {
    const customer = await tx.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
    if (!customer) throw new Error("INVALID_CUSTOMER");
    customerId = customer.id;
  }

  if (hallId) {
    const hall = await tx.hall.findFirst({ where: { id: hallId, tenantId }, select: { id: true } });
    if (!hall) throw new Error("INVALID_HALL");
    hallId = hall.id;
  }

  if (salonId) {
    const salon = await tx.salon.findFirst({ where: { id: salonId, tenantId }, select: { id: true, hallId: true } });
    if (!salon) throw new Error("INVALID_SALON");
    if (hallId && salon.hallId !== hallId) throw new Error("INVALID_SALON");
    salonId = salon.id;
    hallId = hallId ?? salon.hallId;
  }

  return { contractId, customerId, hallId, salonId };
}

function validateExpenseChequeInput(input: {
  chequeNumber?: string;
  chequeDueDate?: Date | null;
  chequeAmount?: number;
}) {
  if (!input.chequeNumber || !input.chequeDueDate || !input.chequeAmount || input.chequeAmount <= 0) {
    throw new Error("INVALID_CHEQUE");
  }
}

function getExpenseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "ثبت هزینه با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
  }

  const messages: Record<string, string> = {
    INVALID_CATEGORY: "دسته‌بندی انتخاب‌شده معتبر نیست.",
    INVALID_PAYMENT_METHOD: "روش پرداخت انتخاب‌شده معتبر نیست.",
    INVALID_CONTRACT: "قرارداد انتخاب‌شده معتبر نیست.",
    INVALID_CUSTOMER: "مشتری انتخاب‌شده معتبر نیست.",
    INVALID_HALL: "تالار انتخاب‌شده معتبر نیست.",
    INVALID_SALON: "سالن انتخاب‌شده معتبر نیست.",
    INVALID_RECEIPT_FILE: "فایل رسید معتبر نیست. فقط JPG، PNG، WebP یا PDF تا ۵ مگابایت مجاز است.",
    INVALID_CHEQUE: "اطلاعات چک هزینه را کامل و معتبر وارد کنید.",
    EXPENSE_NOT_FOUND: "هزینه مورد نظر پیدا نشد یا به فضای کاری فعلی شما تعلق ندارد.",
  };

  return messages[error.message] ?? "ثبت هزینه با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

export async function createExpenseAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const membership = await requireTenantPermission("expenses.create");
  const parsed = parseExpenseForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات هزینه معتبر نیست." };
  }

  const db = await getPrisma();
  const receiptFile = formData.get("receiptFile");
  let createdExpenseId = "";
  let linkedContractId: string | null = null;

  try {
    const receipt = isReceiptFile(receiptFile) ? await saveReceiptFile(receiptFile) : null;

    await db.$transaction(async (tx) => {
      const financialCategoryId = await ensureCategory(tx, membership.tenantId, parsed.data.financialCategoryId);
      const paymentMethod = await ensurePaymentMethod(tx, membership.tenantId, parsed.data.paymentMethodId);
      const paymentMethodId = paymentMethod?.id ?? null;
      const relations = await resolveRelations(tx, membership.tenantId, parsed.data);
      linkedContractId = relations.contractId;

      if (paymentMethod?.type === "CHECK") {
        validateExpenseChequeInput(parsed.data);
      }

      const expense = await tx.expense.create({
        data: {
          tenantId: membership.tenantId,
          ...relations,
          financialCategoryId,
          paymentMethodId,
          title: parsed.data.title,
          amount: parsed.data.amount,
          occurredAt: parsed.data.occurredAt,
          status: parsed.data.status,
          description: parsed.data.note ?? parsed.data.title,
          vendorName: parsed.data.vendorName,
          referenceNumber: parsed.data.referenceNumber,
          receiptImageUrl: receipt?.publicUrl,
          receiptImageKey: receipt?.key,
          note: parsed.data.note,
        },
        select: { id: true },
      });
      createdExpenseId = expense.id;

      if (paymentMethod?.type === "CHECK") {
        await tx.expenseCheque.create({
          data: {
            tenantId: membership.tenantId,
            expenseId: expense.id,
            chequeNumber: parsed.data.chequeNumber ?? "",
            bankName: parsed.data.chequeBankName,
            branchName: parsed.data.chequeBranchName,
            recipientName: parsed.data.chequeRecipientName ?? parsed.data.vendorName,
            amount: String(parsed.data.chequeAmount ?? parsed.data.amount),
            dueDate: parsed.data.chequeDueDate ?? parsed.data.occurredAt,
            status: parsed.data.chequeStatus ?? "PENDING",
            notes: parsed.data.note,
          },
        });
      }
    });
  } catch (error) {
    return { ok: false, message: getExpenseErrorMessage(error) };
  }

  const createdExpenseForAudit = await db.expense.findFirst({
    where: { id: createdExpenseId, tenantId: membership.tenantId },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
  });

  if (createdExpenseForAudit) {
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPENSE_CREATED",
      entityType: "EXPENSE",
      entityId: createdExpenseForAudit.id,
      title: "ثبت هزینه",
      message: buildExpenseMessage({
        title: createdExpenseForAudit.title,
        amount: createdExpenseForAudit.amount,
        actionLabel: "ثبت",
        userName: getAuditActorName(membership.user),
      }),
      afterData: createdExpenseForAudit,
      href: `/dashboard/expenses/${createdExpenseForAudit.id}`,
    });
  }

  await dispatchExpenseTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    expenseId: createdExpenseId,
    actorName: getAuditActorName(membership.user),
    eventType: "EXPENSE_CREATED",
  });

  revalidateExpensePaths(linkedContractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/expenses/${createdExpenseId}?created=1`);
}

export async function updateExpenseAction(
  _previousState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const membership = await requireTenantPermission("expenses.edit");
  const parsed = parseExpenseForm(formData);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "اطلاعات هزینه معتبر نیست." };
  }

  if (!parsed.data.expenseId) {
    return { ok: false, message: "شناسه هزینه معتبر نیست." };
  }

  const db = await getPrisma();
  const receiptFile = formData.get("receiptFile");
  let linkedContractId: string | null = null;
  let previousContractId: string | null = null;
  let beforeExpenseForAudit: unknown = null;

  try {
    const receipt = isReceiptFile(receiptFile) ? await saveReceiptFile(receiptFile) : null;

    await db.$transaction(async (tx) => {
      const current = await tx.expense.findFirst({
        where: { id: parsed.data.expenseId, tenantId: membership.tenantId },
        include: {
          contract: { select: { id: true, contractNo: true } },
          customer: { select: { fullName: true, phone: true } },
          financialCategory: { select: { title: true } },
          paymentMethod: { select: { title: true, type: true } },
        },
      });

      if (!current) throw new Error("EXPENSE_NOT_FOUND");
      beforeExpenseForAudit = current;
      previousContractId = current.contractId;

      const financialCategoryId = await ensureCategory(tx, membership.tenantId, parsed.data.financialCategoryId);
      const paymentMethod = await ensurePaymentMethod(tx, membership.tenantId, parsed.data.paymentMethodId, {
        existingExpenseId: current.id,
      });
      const paymentMethodId = paymentMethod?.id ?? null;
      const relations = await resolveRelations(tx, membership.tenantId, parsed.data);
      linkedContractId = relations.contractId;

      if (paymentMethod?.type === "CHECK") {
        validateExpenseChequeInput(parsed.data);
      }

      await tx.expense.update({
        where: { id: current.id },
        data: {
          ...relations,
          financialCategoryId,
          paymentMethodId,
          title: parsed.data.title,
          amount: parsed.data.amount,
          occurredAt: parsed.data.occurredAt,
          status: parsed.data.status,
          description: parsed.data.note ?? parsed.data.title,
          vendorName: parsed.data.vendorName,
          referenceNumber: parsed.data.referenceNumber,
          ...(receipt ? { receiptImageUrl: receipt.publicUrl, receiptImageKey: receipt.key } : {}),
          note: parsed.data.note,
        },
      });

      await tx.expenseCheque.deleteMany({ where: { expenseId: current.id, tenantId: membership.tenantId } });
      if (paymentMethod?.type === "CHECK") {
        await tx.expenseCheque.create({
          data: {
            tenantId: membership.tenantId,
            expenseId: current.id,
            chequeNumber: parsed.data.chequeNumber ?? "",
            bankName: parsed.data.chequeBankName,
            branchName: parsed.data.chequeBranchName,
            recipientName: parsed.data.chequeRecipientName ?? parsed.data.vendorName,
            amount: String(parsed.data.chequeAmount ?? parsed.data.amount),
            dueDate: parsed.data.chequeDueDate ?? parsed.data.occurredAt,
            status: parsed.data.chequeStatus ?? "PENDING",
            notes: parsed.data.note,
          },
        });
      }
    });
  } catch (error) {
    return { ok: false, message: getExpenseErrorMessage(error) };
  }

  const updatedExpenseForAudit = await db.expense.findFirst({
    where: { id: parsed.data.expenseId, tenantId: membership.tenantId },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
  });

  if (updatedExpenseForAudit) {
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "EXPENSE_UPDATED",
      entityType: "EXPENSE",
      entityId: updatedExpenseForAudit.id,
      title: "ویرایش هزینه",
      message: buildExpenseMessage({
        title: updatedExpenseForAudit.title,
        amount: updatedExpenseForAudit.amount,
        actionLabel: "ویرایش",
        userName: getAuditActorName(membership.user),
      }),
      beforeData: beforeExpenseForAudit,
      afterData: updatedExpenseForAudit,
      href: `/dashboard/expenses/${updatedExpenseForAudit.id}`,
    });
  }

  await dispatchExpenseTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    expenseId: parsed.data.expenseId,
    actorName: getAuditActorName(membership.user),
    eventType: "EXPENSE_UPDATED",
  });

  revalidateExpensePaths(linkedContractId ?? previousContractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`/dashboard/expenses/${parsed.data.expenseId}?updated=1`);
}

export async function cancelExpenseAction(formData: FormData) {
  const membership = await requireTenantPermission("expenses.delete");
  const parsed = expenseIdSchema.safeParse({ expenseId: formData.get("expenseId") });
  const rawReturnTo = typeof formData.get("returnTo") === "string" ? String(formData.get("returnTo")) : "/dashboard/expenses";
  const returnTo = rawReturnTo.startsWith("/dashboard/") ? rawReturnTo : "/dashboard/expenses";

  if (!parsed.success) {
    redirect(`${returnTo}?expenseError=invalid`);
  }

  const db = await getPrisma();
  const expense = await db.expense.findFirst({
    where: { id: parsed.data.expenseId, tenantId: membership.tenantId },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
  });

  if (!expense) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}expenseError=not-found`);
  }

  const canceledExpense = await db.expense.update({
    where: { id: expense.id },
    data: { status: "CANCELED" },
    include: {
      contract: { select: { id: true, contractNo: true } },
      customer: { select: { fullName: true, phone: true } },
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
  });

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "CANCEL",
    entityType: "EXPENSE",
    entityId: canceledExpense.id,
    title: "لغو هزینه",
    message: buildAuditMessage({
      entityLabel: "هزینه",
      recordLabel: canceledExpense.title,
      actionLabel: "لغو",
      userName: getAuditActorName(membership.user),
    }),
    beforeData: expense,
    afterData: canceledExpense,
    href: `/dashboard/expenses/${canceledExpense.id}`,
  });

  await dispatchExpenseTelegramNotificationSafely({
    db,
    tenantId: membership.tenantId,
    tenant: membership.tenant,
    expenseId: expense.id,
    actorName: getAuditActorName(membership.user),
    eventType: "EXPENSE_CANCELED",
  });

  revalidateExpensePaths(expense.contractId);
  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notification-logs");
  revalidatePath("/dashboard/settings/telegram");
  revalidatePath("/dashboard/settings/sms");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}canceled=1`);
}
