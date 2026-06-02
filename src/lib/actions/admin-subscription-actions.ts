"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { getPurchasablePlan } from "@/lib/subscriptions/plans";

const DURATION_VALUES = new Set(["1", "3", "6", "12"]);

function normalizeText(value: FormDataEntryValue | null, maxLength = 240) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeMoney(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .replace(/[٬,،\s]/g, "")
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persian = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
      if (persian >= 0) return String(persian);
      const arabic = "٠١٢٣٤٥٦٧٨٩".indexOf(digit);
      return arabic >= 0 ? String(arabic) : digit;
    });

  if (!normalized) return null;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function activationErrorRedirect(
  tenantId: string | null,
  error: string,
): never {
  const target = tenantId
    ? `/admin/subscriptions/${tenantId}/activate?activationError=${encodeURIComponent(error)}`
    : `/admin/subscriptions?activationError=${encodeURIComponent(error)}`;
  redirect(target);
}

function buildActivationReference(input: {
  plan: string;
  paymentReference: string | null;
  paidAmount: number | null;
  now: Date;
}) {
  const parts = [
    "ADMIN_ACTIVATED",
    input.plan,
    input.now.toISOString().slice(0, 10),
  ];

  if (input.paymentReference) {
    parts.push(input.paymentReference.replace(/\s+/g, "_").slice(0, 48));
  }

  if (input.paidAmount !== null) {
    parts.push(String(input.paidAmount));
  }

  return parts.join(":").slice(0, 180);
}

export async function activateTenantSubscriptionAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const tenantId = normalizeText(formData.get("tenantId"), 80);
  const plan = getPurchasablePlan(formData.get("plan"));
  const durationRaw = normalizeText(formData.get("durationMonths"), 2) ?? "1";
  const paymentReference = normalizeText(formData.get("paymentReference"), 120);
  const note = normalizeText(formData.get("note"), 900);
  const paidAmount = normalizeMoney(formData.get("paidAmount"));
  const closePurchaseTickets = formData.get("closePurchaseTickets") === "on";

  if (!tenantId) {
    activationErrorRedirect(null, "tenant-missing");
  }

  if (!plan) {
    activationErrorRedirect(tenantId, "plan-invalid");
  }

  if (!DURATION_VALUES.has(durationRaw)) {
    activationErrorRedirect(tenantId, "duration-invalid");
  }

  const durationMonths = Number(durationRaw);
  const db = await getPrisma();
  const now = new Date();
  const currentPeriodEnd = addMonths(now, durationMonths);

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      subscription: true,
    },
  });

  if (!tenant) {
    activationErrorRedirect(tenantId, "tenant-not-found");
  }

  const beforeSnapshot = {
    tenantStatus: tenant.status,
    subscription: tenant.subscription
      ? {
          plan: tenant.subscription.plan,
          status: tenant.subscription.status,
          currentPeriodStart:
            tenant.subscription.currentPeriodStart?.toISOString() ?? null,
          currentPeriodEnd:
            tenant.subscription.currentPeriodEnd?.toISOString() ?? null,
          purchaseReference: tenant.subscription.purchaseReference,
        }
      : null,
  };

  const purchaseReference = buildActivationReference({
    plan: plan.plan,
    paymentReference,
    paidAmount,
    now,
  });

  await db.$transaction(async (tx: any) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { status: "ACTIVE" },
    });

    await tx.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan: plan.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
        purchaseReference,
      },
      update: {
        plan: plan.plan,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd,
        purchaseReference,
      },
    });

    await tx.demoAccess.updateMany({
      where: {
        OR: [{ tenantId }, { userId: tenant.ownerId }],
      },
      data: {
        status: "USED",
        tenantId,
        usedAt: now,
        expiresAt: currentPeriodEnd,
      },
    });

    const openPurchaseTickets = await tx.supportTicket.findMany({
      where: {
        tenantId,
        category: "SUBSCRIPTION",
        status: { not: "CLOSED" },
      },
      select: { id: true, ticketNumber: true, title: true },
    });

    if (openPurchaseTickets.length > 0) {
      const adminMessage = [
        `اشتراک ${plan.title} از پنل مالک پلتفرم فعال شد.`,
        `مدت دوره: ${durationMonths} ماه`,
        paymentReference ? `شناسه/ارجاع پرداخت: ${paymentReference}` : null,
        paidAmount !== null
          ? `مبلغ ثبت‌شده توسط ادمین: ${paidAmount} ریال`
          : null,
        note ? `یادداشت ادمین: ${note}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await tx.supportTicketMessage.createMany({
        data: openPurchaseTickets.map((ticket: any) => ({
          tenantId,
          ticketId: ticket.id,
          senderUserId: admin.id,
          senderType: "ADMIN",
          body: adminMessage,
        })),
      });

      if (closePurchaseTickets) {
        await tx.supportTicket.updateMany({
          where: {
            tenantId,
            id: { in: openPurchaseTickets.map((ticket: any) => ticket.id) },
          },
          data: {
            status: "CLOSED",
            closedAt: now,
            lastMessageAt: now,
          },
        });
      } else {
        await tx.supportTicket.updateMany({
          where: {
            tenantId,
            id: { in: openPurchaseTickets.map((ticket: any) => ticket.id) },
          },
          data: {
            status: "ANSWERED",
            lastMessageAt: now,
          },
        });
      }
    }

    await tx.inAppNotification.create({
      data: {
        tenantId,
        userId: tenant.ownerId,
        type: "SUBSCRIPTION",
        severity: "SUCCESS",
        title: "اشتراک فعال شد",
        message: `پلن ${plan.title} برای فضای کاری شما فعال شد و تا پایان دوره قابل استفاده است.`,
        href: "/dashboard/account",
        entityType: "SUBSCRIPTION",
        entityId: tenantId,
        fingerprint: `subscription-activated:${tenantId}:${now.getTime()}`,
        dueAt: now,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: admin.id,
        action: "UPDATE",
        entityType: "SUBSCRIPTION",
        entityId: tenantId,
        title: "فعال‌سازی اشتراک از پنل مالک پلتفرم",
        message: `پلن ${plan.title} برای ${tenant.name} توسط ${admin.name ?? admin.email} فعال شد.`,
        beforeData: beforeSnapshot,
        afterData: {
          tenantStatus: "ACTIVE",
          subscription: {
            plan: plan.plan,
            status: "ACTIVE",
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: currentPeriodEnd.toISOString(),
            purchaseReference,
          },
          payment: {
            reference: paymentReference,
            paidAmount,
            note,
          },
          closedPurchaseTickets: closePurchaseTickets,
        },
        metadata: {
          source: "admin-subscription-activation",
          planTitle: plan.title,
          durationMonths,
          ownerEmail: tenant.owner.email,
        },
        href: `/admin/subscriptions/${tenantId}/activate`,
      },
    });
  });

  revalidatePath("/admin/subscriptions");
  revalidatePath(`/admin/subscriptions/${tenantId}/activate`);
  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath("/admin/support");
  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/account/plans");

  redirect(`/admin/subscriptions/${tenantId}/activate?activated=1`);
}
