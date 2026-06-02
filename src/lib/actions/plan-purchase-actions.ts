"use server";

import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { getCurrentTenantMember, requireUser } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { isPurchasedSubscription } from "@/lib/subscriptions/display";
import {
  getPurchasablePlan,
  isPurchasablePlanDowngrade,
  isSamePurchasablePlan,
} from "@/lib/subscriptions/plans";

async function buildTicketNumber(tx: Prisma.TransactionClient, tenantId: string) {
  const count = await tx.supportTicket.count({ where: { tenantId } });
  return `SUP-${String(count + 1).padStart(4, "0")}`;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1000);
}

function buildPurchaseTicketBody(input: {
  planTitle: string;
  planValue: string;
  userName: string;
  email: string;
  phone?: string | null;
  tenantName: string;
  hadWorkspace: boolean;
  note: string;
}) {
  const lines = [
    `درخواست خرید یا فعال‌سازی اشتراک برای ${input.planTitle}`,
    "",
    `پلن انتخابی: ${input.planTitle} (${input.planValue})`,
    `نام کاربر: ${input.userName}`,
    `ایمیل: ${input.email}`,
    `موبایل: ${input.phone || "ثبت نشده"}`,
    `فضای کاری: ${input.tenantName}`,
    `وضعیت فضای کاری قبل از درخواست: ${input.hadWorkspace ? "دارای فضای کاری" : "بدون فضای کاری؛ فضای پیگیری خرید به‌صورت کنترل‌شده ساخته شد"}`,
    "",
    "کاربر درخواست کرده ادامه خرید فعلاً از طریق تیکت و هماهنگی مستقیم انجام شود.",
  ];

  if (input.note) {
    lines.push("", "توضیح کاربر:", input.note);
  }

  return lines.join("\n");
}

export async function createPlanPurchaseTicketAction(formData: FormData) {
  const user = await requireUser();
  const plan = getPurchasablePlan(formData.get("plan"));
  const note = normalizeOptionalText(formData.get("note"));

  if (!plan) {
    redirect("/dashboard/account/plans?purchaseError=invalid-plan");
  }

  const db = await getPrisma();
  const existingMembership = await getCurrentTenantMember(user.id);
  const activeSubscription = existingMembership?.tenant.subscription;
  const hasActivePurchasedSubscription = isPurchasedSubscription(activeSubscription);

  if (
    hasActivePurchasedSubscription &&
    isPurchasablePlanDowngrade({
      currentPlan: activeSubscription?.plan,
      requestedPlan: plan.plan,
    })
  ) {
    redirect("/dashboard/account/plans?purchaseError=downgrade");
  }

  if (
    hasActivePurchasedSubscription &&
    isSamePurchasablePlan({
      currentPlan: activeSubscription?.plan,
      requestedPlan: plan.plan,
    })
  ) {
    redirect("/dashboard/account/plans?purchaseError=current-plan");
  }

  let ticketId = "";
  let tenantId = existingMembership?.tenantId ?? "";
  const now = new Date();
  const hadWorkspace = Boolean(existingMembership);

  await db.$transaction(async (tx) => {
    let tenantName = existingMembership?.tenant.name ?? `درخواست خرید ${user.name ?? user.email}`;

    if (!existingMembership) {
      const tenant = await tx.tenant.create({
        data: {
          name: tenantName,
          slug: `purchase-${user.id.slice(0, 8)}-${Date.now()}`,
          status: "SUSPENDED",
          ownerId: user.id,
        },
        select: { id: true, name: true },
      });

      tenantId = tenant.id;
      tenantName = tenant.name;

      await tx.tenantMember.create({
        data: {
          tenantId,
          userId: user.id,
          role: "OWNER",
        },
      });

      await tx.subscription.create({
        data: {
          tenantId,
          plan: plan.plan,
          status: "PAST_DUE",
          purchaseReference: `PURCHASE_REQUEST:PENDING:${plan.plan}`,
        },
      });
    }

    const duplicateTicket = await tx.supportTicket.findFirst({
      where: {
        tenantId,
        category: "SUBSCRIPTION",
        status: { not: "CLOSED" },
        title: { contains: plan.title },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    });

    if (duplicateTicket) {
      ticketId = duplicateTicket.id;
      return;
    }

    const ticketNumber = await buildTicketNumber(tx, tenantId);
    const title = `درخواست خرید ${plan.title}`;
    const body = buildPurchaseTicketBody({
      planTitle: plan.title,
      planValue: plan.plan,
      userName: user.name ?? user.email,
      email: user.email,
      phone: user.phone,
      tenantName,
      hadWorkspace,
      note,
    });

    const ticket = await tx.supportTicket.create({
      data: {
        tenantId,
        createdByUserId: user.id,
        ticketNumber,
        subject: "SUBSCRIPTION",
        category: "SUBSCRIPTION",
        priority: plan.plan === "ENTERPRISE" ? "HIGH" : "NORMAL",
        status: "OPEN",
        title,
        lastMessageAt: now,
      },
      select: { id: true, ticketNumber: true },
    });

    ticketId = ticket.id;

    await tx.supportTicketMessage.create({
      data: {
        tenantId,
        ticketId: ticket.id,
        senderUserId: user.id,
        senderType: "USER",
        body,
      },
    });

    if (!hasActivePurchasedSubscription) {
      await tx.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan: plan.plan,
          status: "PAST_DUE",
          purchaseReference: `PURCHASE_REQUEST:${ticket.ticketNumber}:${plan.plan}`,
        },
        update: {
          plan: plan.plan,
          status: "PAST_DUE",
          purchaseReference: `PURCHASE_REQUEST:${ticket.ticketNumber}:${plan.plan}`,
        },
      });
    }
  });

  await createAuditLog({
    tenantId,
    userId: user.id,
    action: "CREATE",
    entityType: "SYSTEM",
    entityId: ticketId,
    title: "درخواست خرید پلن",
    message: `درخواست خرید ${plan.title} توسط ${getAuditActorName({ name: user.name, email: user.email })} ثبت شد.`,
    href: `/dashboard/support/${ticketId}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/account/plans");
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/support");
  revalidatePath("/admin/subscriptions");

  redirect("/dashboard?purchaseRequest=1");
}
