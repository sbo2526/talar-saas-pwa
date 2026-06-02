"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import {
  mapTicketPriorityToPersian,
  mapTicketStatusToPersian,
} from "@/lib/admin/support-admin-data";

const ticketIdSchema = z.object({
  ticketId: z.string().min(1, "شناسه تیکت معتبر نیست."),
});

const replySchema = ticketIdSchema.extend({
  body: z.string().trim().min(2, "متن پاسخ را وارد کنید."),
  setWaitingForUser: z.boolean().default(true),
});

const internalNoteSchema = ticketIdSchema.extend({
  body: z.string().trim().min(2, "متن یادداشت داخلی را وارد کنید."),
});

const statusSchema = ticketIdSchema.extend({
  status: z.enum(["OPEN", "IN_REVIEW", "ANSWERED", "WAITING_FOR_USER", "WAITING_FOR_SUPPORT", "CLOSED"]),
  reason: z.string().trim().max(500, "علت تغییر وضعیت بیش از حد طولانی است.").optional(),
});

const prioritySchema = ticketIdSchema.extend({
  priority: z.enum(["LOW", "NORMAL", "MEDIUM", "HIGH", "URGENT"]),
  reason: z.string().trim().max(500, "علت تغییر اولویت بیش از حد طولانی است.").optional(),
});

function revalidateAdminSupport(ticketId: string, tenantId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
  if (tenantId) {
    revalidatePath(`/admin/tenants/${tenantId}`);
    revalidatePath(`/admin/support?tenantId=${tenantId}`);
    revalidatePath("/dashboard/support");
    revalidatePath(`/dashboard/support/${ticketId}`);
  }
}

async function getTicketOrRedirect(ticketId: string) {
  const db = await getPrisma();
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, ticketNumber: true, status: true, priority: true, title: true },
  });

  if (!ticket) {
    redirect("/admin/support?supportError=not-found");
  }

  return ticket;
}

async function createAdminTicketMessage(input: {
  tenantId: string;
  ticketId: string;
  adminId: string;
  senderType: "SUPPORT" | "INTERNAL_NOTE" | "SYSTEM";
  body: string;
}) {
  const db = await getPrisma();
  return db.supportTicketMessage.create({
    data: {
      tenantId: input.tenantId,
      ticketId: input.ticketId,
      senderUserId: input.adminId,
      senderType: input.senderType,
      body: input.body,
    },
  });
}

export async function replyToSupportTicketAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = replySchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
    setWaitingForUser: formData.get("setWaitingForUser") === "on",
  });

  if (!parsed.success) redirect("/admin/support?supportError=invalid");

  const db = await getPrisma();
  const ticket = await getTicketOrRedirect(parsed.data.ticketId);
  if (ticket.status === "CLOSED") redirect(`/admin/support/${ticket.id}?supportError=closed`);

  const nextStatus = parsed.data.setWaitingForUser ? "WAITING_FOR_USER" : "ANSWERED";
  await db.$transaction(async (tx) => {
    await tx.supportTicketMessage.create({
      data: {
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        senderUserId: admin.id,
        senderType: "SUPPORT",
        body: parsed.data.body,
      },
    });

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { status: nextStatus, lastMessageAt: new Date() },
    });
  });

  await createAuditLog({
    tenantId: ticket.tenantId,
    userId: admin.id,
    action: "UPDATE",
    entityType: "SYSTEM",
    entityId: ticket.id,
    title: "ارسال پاسخ پشتیبانی",
    message: `پشتیبانی به تیکت ${ticket.ticketNumber} پاسخ داد.`,
    href: `/admin/support/${ticket.id}`,
    metadata: { ticketNumber: ticket.ticketNumber, senderType: "SUPPORT", nextStatus },
  });

  revalidateAdminSupport(ticket.id, ticket.tenantId);
  redirect(`/admin/support/${ticket.id}?replied=1`);
}

export const replyAdminSupportTicketAction = replyToSupportTicketAction;

export async function addInternalTicketNoteAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = internalNoteSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });

  if (!parsed.success) redirect("/admin/support?supportError=invalid");

  const ticket = await getTicketOrRedirect(parsed.data.ticketId);
  await createAdminTicketMessage({
    tenantId: ticket.tenantId,
    ticketId: ticket.id,
    adminId: admin.id,
    senderType: "INTERNAL_NOTE",
    body: parsed.data.body,
  });

  await createAuditLog({
    tenantId: ticket.tenantId,
    userId: admin.id,
    action: "UPDATE",
    entityType: "SYSTEM",
    entityId: ticket.id,
    title: "ثبت یادداشت داخلی پشتیبانی",
    message: `یادداشت داخلی برای تیکت ${ticket.ticketNumber} ثبت شد.`,
    href: `/admin/support/${ticket.id}`,
    metadata: { ticketNumber: ticket.ticketNumber, senderType: "INTERNAL_NOTE" },
  });

  revalidateAdminSupport(ticket.id, ticket.tenantId);
  redirect(`/admin/support/${ticket.id}?noteAdded=1`);
}

export async function updateSupportTicketStatusAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = statusSchema.safeParse({
    ticketId: formData.get("ticketId"),
    status: formData.get("status"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) redirect("/admin/support?supportError=invalid");

  const db = await getPrisma();
  const ticket = await getTicketOrRedirect(parsed.data.ticketId);
  const now = new Date();
  const systemBody = [
    `وضعیت از «${mapTicketStatusToPersian(ticket.status)}» به «${mapTicketStatusToPersian(parsed.data.status)}» تغییر کرد.`,
    parsed.data.reason ? `علت: ${parsed.data.reason}` : null,
  ].filter(Boolean).join("\n");

  await db.$transaction(async (tx) => {
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: parsed.data.status,
        closedAt: parsed.data.status === "CLOSED" ? now : null,
        lastMessageAt: now,
      },
    });
    await tx.supportTicketMessage.create({
      data: {
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        senderUserId: admin.id,
        senderType: "SYSTEM",
        body: systemBody,
      },
    });
  });

  await createAuditLog({
    tenantId: ticket.tenantId,
    userId: admin.id,
    action: "STATUS_CHANGE",
    entityType: "SYSTEM",
    entityId: ticket.id,
    title: "تغییر وضعیت تیکت",
    message: `وضعیت تیکت ${ticket.ticketNumber} تغییر کرد.`,
    beforeData: { status: ticket.status },
    afterData: { status: parsed.data.status, reason: parsed.data.reason ?? null },
    href: `/admin/support/${ticket.id}`,
  });

  revalidateAdminSupport(ticket.id, ticket.tenantId);
  redirect(`/admin/support/${ticket.id}?statusUpdated=1`);
}

export const updateAdminSupportTicketStatusAction = updateSupportTicketStatusAction;

export async function updateSupportTicketPriorityAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const parsed = prioritySchema.safeParse({
    ticketId: formData.get("ticketId"),
    priority: formData.get("priority"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) redirect("/admin/support?supportError=invalid");

  const db = await getPrisma();
  const ticket = await getTicketOrRedirect(parsed.data.ticketId);
  const systemBody = [
    `اولویت از «${mapTicketPriorityToPersian(ticket.priority)}» به «${mapTicketPriorityToPersian(parsed.data.priority)}» تغییر کرد.`,
    parsed.data.reason ? `علت: ${parsed.data.reason}` : null,
  ].filter(Boolean).join("\n");

  await db.$transaction(async (tx) => {
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { priority: parsed.data.priority, lastMessageAt: new Date() },
    });
    await tx.supportTicketMessage.create({
      data: {
        tenantId: ticket.tenantId,
        ticketId: ticket.id,
        senderUserId: admin.id,
        senderType: "SYSTEM",
        body: systemBody,
      },
    });
  });

  await createAuditLog({
    tenantId: ticket.tenantId,
    userId: admin.id,
    action: "UPDATE",
    entityType: "SYSTEM",
    entityId: ticket.id,
    title: "تغییر اولویت تیکت",
    message: `اولویت تیکت ${ticket.ticketNumber} تغییر کرد.`,
    beforeData: { priority: ticket.priority },
    afterData: { priority: parsed.data.priority, reason: parsed.data.reason ?? null },
    href: `/admin/support/${ticket.id}`,
  });

  revalidateAdminSupport(ticket.id, ticket.tenantId);
  redirect(`/admin/support/${ticket.id}?priorityUpdated=1`);
}

export async function closeSupportTicketAction(formData: FormData) {
  const formDataWithStatus = new FormData();
  formDataWithStatus.set("ticketId", String(formData.get("ticketId") ?? ""));
  formDataWithStatus.set("status", "CLOSED");
  formDataWithStatus.set("reason", String(formData.get("reason") ?? "تیکت توسط پشتیبانی بسته شد."));
  return updateSupportTicketStatusAction(formDataWithStatus);
}

export async function reopenSupportTicketAction(formData: FormData) {
  const formDataWithStatus = new FormData();
  formDataWithStatus.set("ticketId", String(formData.get("ticketId") ?? ""));
  formDataWithStatus.set("status", "OPEN");
  formDataWithStatus.set("reason", String(formData.get("reason") ?? "تیکت توسط پشتیبانی بازگشایی شد."));
  return updateSupportTicketStatusAction(formDataWithStatus);
}
