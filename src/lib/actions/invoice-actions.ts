"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { toLatinDigits } from "@/lib/date/jalali";
import { calculatePostEventInvoice, getInvoicePaidAmount, toMoneyNumber } from "@/lib/invoices/invoice-calculation";
import { addMonths, createPortalToken, hashPortalToken, previewPortalToken } from "@/lib/crm/security";
import { getPortalLinkByToken } from "@/lib/crm/data";
import { buildPublicInvoiceUrl, deliverCustomerInvoiceNotifications } from "@/lib/invoices/invoice-notification-delivery";
import { getMonthlyCloseLockForEventDate, getMonthlyCloseRedirectSuffix, recordMonthlyCloseBlockedAttempt } from "@/lib/monthly-close/monthly-close-lock";
import { getOwnerOperationStartDateForTenant, isLegacyContractEventDate } from "@/lib/post-event/post-event-decision-gate";
import { getPrisma } from "@/lib/prisma";


type CustomerInvoicePortalLink = {
  id: string;
  tenantId: string;
  contractId: string;
  contract: {
    eventDate: Date;
    customer?: { id?: string | null; fullName?: string | null; phone?: string | null } | null;
    invoice?: { id: string; invoiceNo: string } | null;
  };
};

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readGuestCount(formData: FormData, contractedGuestCount: number) {
  const raw = toLatinDigits(readRequiredString(formData, "guestCountActual"));
  const parsed = Number(raw.replace(/[,،\s]/g, ""));

  if (!Number.isFinite(parsed)) {
    return contractedGuestCount;
  }

  return Math.floor(parsed);
}

function safeNote(formData: FormData) {
  return readRequiredString(formData, "note").slice(0, 700) || null;
}

function readManualMoney(formData: FormData, key: string) {
  const raw = toLatinDigits(readRequiredString(formData, key)).replace(/[,،\s]/g, "");
  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return Number.NaN;
  }

  return Math.round(parsed);
}

function asMoney(value: number) {
  return Math.max(0, Math.round(value)).toFixed(2);
}

export async function createPostEventInvoiceAction(formData: FormData) {
  const membership = await requireTenantMember();
  const db = await getPrisma();
  const contractId = readRequiredString(formData, "contractId");

  if (!contractId) {
    redirect("/dashboard/contracts?invoice=invalid");
  }

  const contract = await db.contract.findFirst({
    where: {
      id: contractId,
      tenantId: membership.tenantId,
    },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
      lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      payments: { select: { amount: true, type: true, status: true } },
      postEventConfirmation: { select: { id: true, status: true, invoiceRequired: true } },
      invoice: { select: { id: true } },
    },
  });

  if (!contract) {
    redirect("/dashboard/contracts?invoice=not-found");
  }

  const ownerOperationStartDate = await getOwnerOperationStartDateForTenant(membership.tenantId);

  if (isLegacyContractEventDate(contract.eventDate, ownerOperationStartDate)) {
    redirect(`/dashboard/contracts/${contract.id}?invoice=legacy-archived`);
  }

  if (contract.invoice) {
    redirect(`/dashboard/invoices/${contract.invoice.id}?invoice=already-created`);
  }

  if (contract.postEventConfirmation?.status !== "HELD" || !contract.postEventConfirmation.invoiceRequired) {
    redirect(`/dashboard/contracts/${contract.id}?invoice=requires-held-confirmation`);
  }

  const closeLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: contract.eventDate,
  });

  if (closeLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: membership.tenantId,
      userId: membership.userId,
      lock: closeLock,
      action: "MONTHLY_CLOSE_BLOCKED_POST_EVENT_INVOICE",
      entityType: "INVOICE",
      entityId: contract.id,
      title: "جلوگیری از صدور صورتحساب در ماه بسته‌شده",
      message: `صدور صورتحساب برای قرارداد ${contract.contractNo} متوقف شد، چون دوره ${closeLock.periodLabel} قفل شده است.`,
      href: `/dashboard/contracts/${contract.id}`,
      metadata: { sourceAction: "createPostEventInvoiceAction" },
    });
    redirect(`/dashboard/contracts/${contract.id}/invoice?${getMonthlyCloseRedirectSuffix(closeLock)}`);
  }

  const guestCountActual = readGuestCount(formData, contract.guestCount);

  if (guestCountActual < contract.guestCount) {
    redirect(`/dashboard/contracts/${contract.id}/invoice?invoice=guest-count-below-contract`);
  }

  const manualInvoiceAmount = readManualMoney(formData, "manualInvoiceAmount");

  if (!Number.isFinite(manualInvoiceAmount) || manualInvoiceAmount <= 0) {
    redirect(`/dashboard/contracts/${contract.id}/invoice?invoice=manual-amount-required`);
  }

  const note = safeNote(formData);
  const calculation = calculatePostEventInvoice(contract, guestCountActual);
  const paidAmountAtIssue = getInvoicePaidAmount(contract.payments, contract.depositAmount);
  const payableAmount = Math.max(0, manualInvoiceAmount - paidAmountAtIssue);
  const now = new Date();
  const manualInvoiceSnapshot = {
    ...(calculation.snapshot as Record<string, unknown>),
    manualInvoiceAmount,
    paidAmountAtIssue,
    payableAmount,
    issuedRules: {
      ...(calculation.snapshot as { issuedRules?: Record<string, unknown> }).issuedRules,
      manualInvoiceAmountRequired: true,
      automaticContractPricingDisabled: true,
      extraGuestAutoPricingDisabled: true,
    },
  } satisfies Prisma.InputJsonValue;

  const invoice = await db.$transaction(async (tx) => {
    const createdInvoice = await tx.invoice.create({
      data: {
        tenantId: membership.tenantId,
        contractId: contract.id,
        invoiceNo: calculation.invoiceNo,
        status: "ISSUED",
        guestCountContracted: calculation.guestCountContracted,
        guestCountActual: calculation.guestCountActual,
        extraGuestCount: calculation.extraGuestCount,
        minimumPerGuestPrice: calculation.minimumPerGuestPrice,
        contractSubtotal: asMoney(manualInvoiceAmount),
        extraGuestTotal: asMoney(0),
        subtotal: asMoney(manualInvoiceAmount),
        discountAmount: calculation.discountAmount,
        paidAmountAtIssue: asMoney(paidAmountAtIssue),
        payableAmount: asMoney(payableAmount),
        note,
        contractSnapshot: manualInvoiceSnapshot,
        issuedByUserId: membership.userId,
        issuedAt: now,
        approvedByUserId: membership.userId,
        approvedAt: now,
        lines: {
          create: [{
            tenantId: membership.tenantId,
            contractLineItemId: null,
            sourceType: "OWNER_ADJUSTMENT",
            name: "مبلغ نهایی دستی فاکتور",
            description: "این مبلغ هنگام صدور فاکتور به صورت دستی ثبت شده و از محاسبه خودکار قرارداد یا نفرات اضافه ساخته نشده است.",
            quantity: 1,
            unitLabel: "فاکتور",
            unitPrice: asMoney(manualInvoiceAmount),
            minUnitPrice: asMoney(0),
            totalPrice: asMoney(manualInvoiceAmount),
            isLocked: true,
            sortOrder: 1,
            metadata: {
              source: "manual_post_event_invoice_amount",
              contractCalculatedSubtotal: toMoneyNumber(contract.finalTotal),
              automaticContractPricingDisabled: true,
              extraGuestAutoPricingDisabled: true,
              guestCountActual,
            } satisfies Prisma.InputJsonValue,
          }],
        },
      },
      select: {
        id: true,
        invoiceNo: true,
        payableAmount: true,
        subtotal: true,
        extraGuestCount: true,
        minimumPerGuestPrice: true,
      },
    });

    await tx.postEventConfirmation.update({
      where: { contractId: contract.id },
      data: { invoiceRequired: false },
    });

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "POST_EVENT_INVOICE_ISSUED",
        entityType: "INVOICE",
        entityId: createdInvoice.id,
        title: "صدور صورتحساب بعد از مراسم",
        message: `صورتحساب ${createdInvoice.invoiceNo} برای قرارداد ${contract.contractNo} صادر شد.`,
        beforeData: {
          contractId: contract.id,
          contractNo: contract.contractNo,
          postEventConfirmationId: contract.postEventConfirmation?.id ?? null,
        },
        afterData: {
          invoiceId: createdInvoice.id,
          invoiceNo: createdInvoice.invoiceNo,
          subtotal: manualInvoiceAmount,
          payableAmount,
          guestCountContracted: calculation.guestCountContracted,
          guestCountActual: calculation.guestCountActual,
          extraGuestCount: calculation.extraGuestCount,
          manualInvoiceAmount,
          paidAmountAtIssue,
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_MANUAL_INVOICE_AND_CANCELLATION_AMOUNT_72",
          manualInvoiceAmountRequired: true,
          automaticContractPricingDisabled: true,
          customerNotificationDeferredToPhase31: true,
          issuedAt: now.toISOString(),
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${createdInvoice.id}`,
      },
    });

    const managementMembers = await tx.tenantMember.findMany({
      where: {
        tenantId: membership.tenantId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true },
    });

    if (managementMembers.length > 0) {
      await tx.inAppNotification.createMany({
        data: managementMembers.map((member) => ({
          tenantId: membership.tenantId,
          userId: member.userId,
          type: "POST_EVENT_INVOICE",
          severity: "SUCCESS",
          title: "صورتحساب بعد از مراسم صادر شد",
          message: `صورتحساب ${createdInvoice.invoiceNo} برای قرارداد ${contract.contractNo} آماده بررسی است.`,
          href: `/dashboard/invoices/${createdInvoice.id}`,
          entityType: "INVOICE",
          entityId: createdInvoice.id,
          fingerprint: `post-event-invoice-${createdInvoice.id}-${member.userId}`,
        })),
        skipDuplicates: true,
      });
    }

    return createdInvoice;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contracts");
  revalidatePath(`/dashboard/contracts/${contract.id}`);
  revalidatePath("/dashboard/invoices");
  revalidatePath("/dashboard/owner-financial-overview");
  revalidatePath("/dashboard/owner-settlements");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  const autoDeliveryStatus = await sendIssuedInvoiceToCustomerBestEffort({
    tenantId: membership.tenantId,
    actorUserId: membership.userId,
    invoiceId: invoice.id,
  });

  revalidatePath("/dashboard/settings/activity");
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/notification-logs");

  redirect(`/dashboard/invoices/${invoice.id}?invoice=issued&delivery=${autoDeliveryStatus}`);
}

async function sendIssuedInvoiceToCustomerBestEffort(input: {
  tenantId: string;
  actorUserId: string;
  invoiceId: string;
}) {
  try {
    const db = await getPrisma();
    const invoice = await db.invoice.findFirst({
      where: { id: input.invoiceId, tenantId: input.tenantId },
      include: {
        contract: {
          include: {
            customer: { select: { id: true, fullName: true, phone: true } },
            tenant: { include: { hallProfile: true } },
          },
        },
      },
    });

    if (!invoice) {
      return "REVIEW_REQUIRED" as const;
    }

    const token = createPortalToken();
    const expiresAt = addMonths(new Date(), 6);
    const portalPath = `/portal/invoices/${encodeURIComponent(token)}`;
    const portalUrl = buildPublicInvoiceUrl(portalPath);
    const tenantName = invoice.contract.tenant.hallProfile?.brandName ?? invoice.contract.tenant.name ?? "تالار";

    await db.$transaction(async (tx) => {
      const link = await tx.contractAccessLink.create({
        data: {
          tenantId: input.tenantId,
          contractId: invoice.contractId,
          kind: "CUSTOMER_INVOICE",
          tokenHash: hashPortalToken(token),
          tokenPreview: previewPortalToken(token),
          expiresAt,
          createdByUserId: input.actorUserId,
          notes: `Auto invoice ${invoice.invoiceNo} customer portal`,
        },
        select: { id: true },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT", sentAt: new Date() },
      });

      await tx.notificationLog.create({
        data: {
          tenantId: input.tenantId,
          channel: "CUSTOMER_PORTAL",
          eventType: "POST_EVENT_INVOICE_LINK_READY",
          recipient: invoice.contract.customer.phone,
          recipientLabel: invoice.contract.customer.fullName,
          title: "ساخت خودکار لینک امن صورتحساب مشتری",
          message: `${tenantName}: لینک امن صورتحساب ${invoice.invoiceNo} همزمان با صدور ساخته شد. لینک خام برای امنیت در لاگ مدیریتی ذخیره نمی‌شود. پیش‌نمایش توکن: ${previewPortalToken(token)}`,
          status: "SENT",
          sentAt: new Date(),
          relatedContractId: invoice.contractId,
          relatedCustomerId: invoice.contract.customer.id,
        },
      });

      const managementMembers = await tx.tenantMember.findMany({
        where: { tenantId: input.tenantId, role: { in: ["OWNER", "ADMIN"] } },
        select: { userId: true },
      });

      if (managementMembers.length > 0) {
        await tx.inAppNotification.createMany({
          data: managementMembers.map((member) => ({
            tenantId: input.tenantId,
            userId: member.userId,
            type: "CUSTOMER_INVOICE_PORTAL",
            severity: "INFO",
            title: "صورتحساب خودکار برای مشتری آماده ارسال شد",
            message: `لینک صورتحساب ${invoice.invoiceNo} برای ${invoice.contract.customer.fullName} همزمان با صدور ساخته شد.`,
            href: `/dashboard/invoices/${invoice.id}`,
            entityType: "INVOICE",
            entityId: invoice.id,
            fingerprint: `customer-invoice-auto-link-${link.id}-${member.userId}`,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.actorUserId,
          action: "CUSTOMER_INVOICE_LINK_CREATED",
          entityType: "INVOICE",
          entityId: invoice.id,
          title: "ساخت خودکار لینک مشتری برای صورتحساب",
          message: `لینک مشتری برای صورتحساب ${invoice.invoiceNo} همزمان با صدور ساخته شد.`,
          afterData: {
            invoiceId: invoice.id,
            invoiceNo: invoice.invoiceNo,
            linkKind: "CUSTOMER_INVOICE",
            tokenPreview: previewPortalToken(token),
            expiresAt: expiresAt.toISOString(),
          } satisfies Prisma.InputJsonValue,
          metadata: {
            taskId: "TALAR_CUSTOMER_SMS_LIFECYCLE_NOTIFICATIONS_74",
            previousTaskId: "TALAR_CUSTOMER_NOTIFICATION_DELIVERY_36",
            autoDeliveryOnInvoiceIssue: true,
            rawTokenStored: false,
            customerNotificationLogRawTokenRedacted: true,
          } satisfies Prisma.InputJsonValue,
          href: `/dashboard/invoices/${invoice.id}`,
        },
      });
    });

    const delivery = await deliverCustomerInvoiceNotifications({
      tenantId: input.tenantId,
      invoiceId: invoice.id,
      actorUserId: input.actorUserId,
      portalPath,
      portalUrl,
    });

    return delivery.status;
  } catch {
    return "REVIEW_REQUIRED" as const;
  }
}

function readOptionalString(formData: FormData, key: string, max = 900) {
  const value = readRequiredString(formData, key);
  return value ? value.slice(0, max) : null;
}

function readBoolean(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "on" || value === "true" || value === "1" || value === "YES";
}

function readOptionalInt(formData: FormData, key: string) {
  const raw = toLatinDigits(readRequiredString(formData, key));
  const parsed = Number(raw.replace(/[,،\s]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
}

function readOptionalMoney(formData: FormData, key: string) {
  const raw = toLatinDigits(readRequiredString(formData, key)).replace(/[,،\s]/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

export async function sendInvoiceToCustomerAction(formData: FormData) {
  const membership = await requireTenantPermission("invoices.create");
  const db = await getPrisma();
  const invoiceId = readRequiredString(formData, "invoiceId");

  if (!invoiceId) {
    redirect("/dashboard/invoices?send=invalid");
  }

  const invoice = await db.invoice.findFirst({
    where: { id: invoiceId, tenantId: membership.tenantId },
    include: {
      contract: {
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          tenant: { include: { hallProfile: true } },
        },
      },
      customerFeedbacks: { select: { id: true }, take: 1 },
    },
  });

  if (!invoice) {
    redirect("/dashboard/invoices?send=not-found");
  }

  const sendCloseLock = await getMonthlyCloseLockForEventDate({
    tenantId: membership.tenantId,
    eventDate: invoice.contract.eventDate,
  });

  if (sendCloseLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: membership.tenantId,
      userId: membership.userId,
      lock: sendCloseLock,
      action: "MONTHLY_CLOSE_BLOCKED_INVOICE_SEND",
      entityType: "INVOICE",
      entityId: invoice.id,
      title: "جلوگیری از ارسال صورتحساب در ماه بسته‌شده",
      message: `ارسال مجدد صورتحساب ${invoice.invoiceNo} متوقف شد، چون دوره ${sendCloseLock.periodLabel} قفل شده است.`,
      href: `/dashboard/invoices/${invoice.id}`,
      metadata: { sourceAction: "sendInvoiceToCustomerAction" },
    });
    redirect(`/dashboard/invoices/${invoice.id}?send=monthly-locked&${getMonthlyCloseRedirectSuffix(sendCloseLock)}`);
  }

  const token = createPortalToken();
  const expiresAt = addMonths(new Date(), 6);
  const portalPath = `/portal/invoices/${encodeURIComponent(token)}`;
  const tenantName = invoice.contract.tenant.hallProfile?.brandName ?? invoice.contract.tenant.name ?? "تالار";
  const portalUrl = buildPublicInvoiceUrl(portalPath);

  await db.$transaction(async (tx) => {
    const link = await tx.contractAccessLink.create({
      data: {
        tenantId: membership.tenantId,
        contractId: invoice.contractId,
        kind: "CUSTOMER_INVOICE",
        tokenHash: hashPortalToken(token),
        tokenPreview: previewPortalToken(token),
        expiresAt,
        createdByUserId: membership.userId,
        notes: `Invoice ${invoice.invoiceNo} customer portal`,
      },
      select: { id: true },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    await tx.notificationLog.create({
      data: {
        tenantId: membership.tenantId,
        channel: "CUSTOMER_PORTAL",
        eventType: "POST_EVENT_INVOICE_LINK_READY",
        recipient: invoice.contract.customer.phone,
        recipientLabel: invoice.contract.customer.fullName,
        title: "ساخت لینک امن صورتحساب مشتری",
        message: `${tenantName}: لینک امن صورتحساب ${invoice.invoiceNo} ساخته شد. لینک خام برای امنیت در لاگ مدیریتی ذخیره نمی‌شود. پیش‌نمایش توکن: ${previewPortalToken(token)}`,
        status: "SENT",
        sentAt: new Date(),
        relatedContractId: invoice.contractId,
        relatedCustomerId: invoice.contract.customer.id,
      },
    });

    const managementMembers = await tx.tenantMember.findMany({
      where: { tenantId: membership.tenantId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });

    if (managementMembers.length > 0) {
      await tx.inAppNotification.createMany({
        data: managementMembers.map((member) => ({
          tenantId: membership.tenantId,
          userId: member.userId,
          type: "CUSTOMER_INVOICE_PORTAL",
          severity: "INFO",
          title: "صورتحساب برای مشتری آماده ارسال شد",
          message: `لینک صورتحساب ${invoice.invoiceNo} برای ${invoice.contract.customer.fullName} ساخته شد و ارسال کانال‌های فعال بررسی می‌شود.`,
          href: `/dashboard/invoices/${invoice.id}`,
          entityType: "INVOICE",
          entityId: invoice.id,
          fingerprint: `customer-invoice-link-${link.id}-${member.userId}`,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: membership.tenantId,
        userId: membership.userId,
        action: "CUSTOMER_INVOICE_LINK_CREATED",
        entityType: "INVOICE",
        entityId: invoice.id,
        title: "ساخت لینک مشتری برای صورتحساب",
        message: `لینک مشتری برای صورتحساب ${invoice.invoiceNo} ساخته شد.`,
        afterData: {
          invoiceId: invoice.id,
          invoiceNo: invoice.invoiceNo,
          linkKind: "CUSTOMER_INVOICE",
          tokenPreview: previewPortalToken(token),
          expiresAt: expiresAt.toISOString(),
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_POST_EVENT_INVOICE_FINAL_HARDENING_40",
          previousTaskId: "TALAR_CUSTOMER_INVOICE_FEEDBACK_PORTAL_31",
          customerCanReportExtraPayment: true,
          rawTokenStored: false,
          rawTokenRemovedFromDashboardRedirect: true,
          deliveryHandledByPhase36: true,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${invoice.id}`,
      },
    });
  });

  const delivery = await deliverCustomerInvoiceNotifications({
    tenantId: membership.tenantId,
    invoiceId: invoice.id,
    actorUserId: membership.userId,
    portalPath,
    portalUrl,
  });

  revalidatePath("/dashboard/invoices");
  revalidatePath(`/dashboard/invoices/${invoice.id}`);
  revalidatePath("/dashboard/settings/notifications");
  revalidatePath("/dashboard/settings/notification-logs");
  const deliveryStatus = delivery.status;
  redirect(`/dashboard/invoices/${invoice.id}?invoice=sent&delivery=${deliveryStatus}`);
}

export async function submitCustomerInvoiceFeedbackAction(formData: FormData) {
  const token = readRequiredString(formData, "token");
  const link = (await getPortalLinkByToken(token, "CUSTOMER_INVOICE")) as CustomerInvoicePortalLink | null;
  if (!link?.contract?.invoice) {
    redirect("/portal/invoices/invalid?error=invalid-link");
  }

  const db = await getPrisma();
  const invoice = link.contract.invoice;
  const feedbackCloseLock = await getMonthlyCloseLockForEventDate({
    tenantId: link.tenantId,
    eventDate: link.contract.eventDate,
  });

  if (feedbackCloseLock.locked) {
    await recordMonthlyCloseBlockedAttempt({
      tenantId: link.tenantId,
      userId: null,
      lock: feedbackCloseLock,
      action: "MONTHLY_CLOSE_BLOCKED_CUSTOMER_INVOICE_FEEDBACK",
      entityType: "INVOICE",
      entityId: invoice.id,
      title: "جلوگیری از ثبت پاسخ مشتری در ماه بسته‌شده",
      message: `ثبت پاسخ مشتری برای صورتحساب ${invoice.invoiceNo} متوقف شد، چون دوره ${feedbackCloseLock.periodLabel} قفل شده است.`,
      href: `/dashboard/invoices/${invoice.id}`,
      metadata: { sourceAction: "submitCustomerInvoiceFeedbackAction", customerPortal: true },
    });
    redirect(`/portal/invoices/${encodeURIComponent(token)}?error=monthly-locked`);
  }

  const invoiceAccepted = readRequiredString(formData, "invoiceAccepted") === "YES";
  const hadExtraGuests = readBoolean(formData, "hadExtraGuests");
  const hasExtraPayment = readBoolean(formData, "hasExtraPayment");
  const hadOtherServices = readBoolean(formData, "hadOtherServices");
  const hasOwnerRiskSignal = !invoiceAccepted || hadExtraGuests || hasExtraPayment || hadOtherServices;
  const nextStatus = hasOwnerRiskSignal ? "DISPUTED" : "ACCEPTED";

  await db.$transaction(async (tx) => {
    const feedback = await tx.customerInvoiceFeedback.create({
      data: {
        tenantId: link.tenantId,
        contractId: link.contractId,
        invoiceId: invoice.id,
        linkId: link.id,
        customerId: link.contract.customer?.id ?? null,
        fullName: readOptionalString(formData, "fullName", 120) ?? link.contract.customer?.fullName ?? null,
        mobile: readOptionalString(formData, "mobile", 30) ?? link.contract.customer?.phone ?? null,
        invoiceAccepted,
        disputeMessage: readOptionalString(formData, "disputeMessage", 1500),
        hadExtraGuests,
        actualGuestCount: readOptionalInt(formData, "actualGuestCount"),
        hasExtraPayment,
        extraPaymentAmount: readOptionalMoney(formData, "extraPaymentAmount"),
        extraPaymentReason: readOptionalString(formData, "extraPaymentReason", 600),
        extraPaymentReceiver: readOptionalString(formData, "extraPaymentReceiver", 180),
        extraPaymentMethod: readOptionalString(formData, "extraPaymentMethod", 80),
        hadPhotography: readBoolean(formData, "hadPhotography"),
        photographyPaidSeparately: readBoolean(formData, "photographyPaidSeparately"),
        photographyAmount: readOptionalMoney(formData, "photographyAmount"),
        hadVideography: readBoolean(formData, "hadVideography"),
        videographyPaidSeparately: readBoolean(formData, "videographyPaidSeparately"),
        videographyAmount: readOptionalMoney(formData, "videographyAmount"),
        hadMusic: readBoolean(formData, "hadMusic"),
        musicPaidSeparately: readBoolean(formData, "musicPaidSeparately"),
        musicAmount: readOptionalMoney(formData, "musicAmount"),
        hadDecoration: readBoolean(formData, "hadDecoration"),
        decorationPaidSeparately: readBoolean(formData, "decorationPaidSeparately"),
        decorationAmount: readOptionalMoney(formData, "decorationAmount"),
        hadOtherServices,
        otherServicesDescription: readOptionalString(formData, "otherServicesDescription", 900),
        otherServicesAmount: readOptionalMoney(formData, "otherServicesAmount"),
        confidentialOwnerMessage: readOptionalString(formData, "confidentialOwnerMessage", 1600),
        source: "CUSTOMER_INVOICE_PORTAL",
        isMobileVerified: false,
      },
      select: { id: true },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: nextStatus },
    });

    const managementMembers = await tx.tenantMember.findMany({
      where: { tenantId: link.tenantId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });

    if (managementMembers.length > 0) {
      await tx.inAppNotification.createMany({
        data: managementMembers.map((member) => ({
          tenantId: link.tenantId,
          userId: member.userId,
          type: "CUSTOMER_INVOICE_FEEDBACK",
          severity: hasOwnerRiskSignal ? "WARNING" : "SUCCESS",
          title: hasOwnerRiskSignal ? "گزارش مهم مشتری روی صورتحساب" : "تأیید صورتحساب توسط مشتری",
          message: hasOwnerRiskSignal
            ? `مشتری برای صورتحساب ${invoice.invoiceNo} مورد قابل بررسی ثبت کرد.`
            : `مشتری صورتحساب ${invoice.invoiceNo} را تأیید کرد.`,
          href: `/dashboard/invoices/${invoice.id}`,
          entityType: "INVOICE",
          entityId: invoice.id,
          fingerprint: `customer-invoice-feedback-${feedback.id}-${member.userId}`,
        })),
        skipDuplicates: true,
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId: link.tenantId,
        userId: null,
        action: "CUSTOMER_INVOICE_FEEDBACK_SUBMITTED",
        entityType: "INVOICE",
        entityId: invoice.id,
        title: "ثبت نظر مشتری روی صورتحساب",
        message: hasOwnerRiskSignal
          ? `مشتری برای صورتحساب ${invoice.invoiceNo} گزارش نیازمند بررسی ثبت کرد.`
          : `مشتری صورتحساب ${invoice.invoiceNo} را تأیید کرد.`,
        afterData: {
          invoiceId: invoice.id,
          feedbackId: feedback.id,
          invoiceAccepted,
          hadExtraGuests,
          hasExtraPayment,
          hadOtherServices,
          nextStatus,
        } satisfies Prisma.InputJsonValue,
        metadata: {
          taskId: "TALAR_CUSTOMER_INVOICE_FEEDBACK_PORTAL_31",
          submittedFromCustomerPortal: true,
          mobileVerificationDeferred: true,
        } satisfies Prisma.InputJsonValue,
        href: `/dashboard/invoices/${invoice.id}`,
      },
    });
  });

  redirect(`/portal/invoices/${encodeURIComponent(token)}?saved=feedback`);
}
