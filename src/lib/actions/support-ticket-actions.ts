"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTenantMember } from "@/lib/auth/session";
import { getPrisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import type { SupportTicketActionState } from "@/lib/actions/support-ticket-state";
import {
  createSupportTicketSchema,
  replySupportTicketSchema,
  supportTicketIdSchema,
} from "@/lib/validation/support-ticket";
import { isUploadedFile, saveTenantUpload } from "@/lib/uploads/local-upload";

const supportAttachmentMimeTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
]);
const maxSupportAttachmentBytes = 10 * 1024 * 1024;

function parseCreateTicketForm(formData: FormData) {
  return createSupportTicketSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    body: formData.get("body"),
  });
}

function parseReplyTicketForm(formData: FormData) {
  return replySupportTicketSchema.safeParse({
    ticketId: formData.get("ticketId"),
    body: formData.get("body"),
  });
}

function getSupportTicketErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "ثبت تیکت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
  const messages: Record<string, string> = {
    TICKET_NOT_FOUND: "تیکت مورد نظر پیدا نشد.",
    TICKET_CLOSED: "این تیکت بسته شده است. ابتدا آن را بازگشایی کنید.",
    INVALID_UPLOAD_MIME: "فایل انتخاب‌شده معتبر نیست. JPG، PNG، WebP، PDF، DOC، DOCX یا XLSX مجاز است.",
    INVALID_UPLOAD_SIZE: "حجم فایل بیش از حد مجاز است. حداکثر حجم مجاز ۱۰ مگابایت است.",
  };
  return messages[error.message] ?? "ثبت تیکت با خطا مواجه شد. چند دقیقه دیگر دوباره تلاش کنید.";
}

async function buildTicketNumber(tx: Prisma.TransactionClient, tenantId: string) {
  const count = await tx.supportTicket.count({ where: { tenantId } });
  return `SUP-${String(count + 1).padStart(4, "0")}`;
}

async function saveSupportAttachment(input: { formData: FormData; tenantId: string }) {
  const attachment = input.formData.get("attachment");
  if (!isUploadedFile(attachment)) return null;
  return saveTenantUpload({
    file: attachment,
    tenantId: input.tenantId,
    area: "support-attachments",
    allowedMimeTypes: supportAttachmentMimeTypes,
    maxBytes: maxSupportAttachmentBytes,
  });
}

function revalidateSupportPaths(ticketId?: string) {
  revalidatePath("/dashboard/support");
  if (ticketId) revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath("/dashboard/settings/activity");
}

export async function createSupportTicketAction(
  _previousState: SupportTicketActionState,
  formData: FormData,
): Promise<SupportTicketActionState> {
  const membership = await requireTenantMember();
  const parsed = parseCreateTicketForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "لطفاً فیلدهای ضروری را کامل کنید." };
  }

  const db = await getPrisma();
  let ticketId = "";

  try {
    const savedAttachment = await saveSupportAttachment({ formData, tenantId: membership.tenantId });
    await db.$transaction(async (tx) => {
      const ticketNumber = await buildTicketNumber(tx, membership.tenantId);
      const ticket = await tx.supportTicket.create({
        data: {
          tenantId: membership.tenantId,
          createdByUserId: membership.userId,
          ticketNumber,
          subject: parsed.data.category,
          category: parsed.data.category,
          priority: parsed.data.priority,
          status: "OPEN",
          title: parsed.data.title,
          lastMessageAt: new Date(),
        },
        select: { id: true, ticketNumber: true },
      });
      ticketId = ticket.id;

      const message = await tx.supportTicketMessage.create({
        data: {
          tenantId: membership.tenantId,
          ticketId: ticket.id,
          senderUserId: membership.userId,
          senderType: "USER",
          body: parsed.data.body,
        },
        select: { id: true },
      });

      if (savedAttachment) {
        await tx.supportTicketAttachment.create({
          data: {
            tenantId: membership.tenantId,
            ticketId: ticket.id,
            messageId: message.id,
            fileName: savedAttachment.fileName,
            fileUrl: savedAttachment.publicUrl,
            fileKey: savedAttachment.key,
            mimeType: savedAttachment.mimeType,
            sizeBytes: savedAttachment.sizeBytes,
          },
        });
      }
    });
  } catch (error) {
    return { ok: false, message: getSupportTicketErrorMessage(error) };
  }

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "CREATE",
    entityType: "SYSTEM",
    entityId: ticketId,
    title: "ثبت تیکت پشتیبانی",
    message: `تیکت پشتیبانی توسط ${getAuditActorName(membership.user)} ثبت شد.`,
    href: `/dashboard/support/${ticketId}`,
  });

  revalidateSupportPaths(ticketId);
  redirect(`/dashboard/support/${ticketId}?created=1`);
}

export async function replySupportTicketAction(
  _previousState: SupportTicketActionState,
  formData: FormData,
): Promise<SupportTicketActionState> {
  const membership = await requireTenantMember();
  const parsed = parseReplyTicketForm(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "متن پاسخ را وارد کنید." };
  }

  const db = await getPrisma();
  try {
    const savedAttachment = await saveSupportAttachment({ formData, tenantId: membership.tenantId });
    await db.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: parsed.data.ticketId, tenantId: membership.tenantId },
        select: { id: true, status: true },
      });
      if (!ticket) throw new Error("TICKET_NOT_FOUND");
      if (ticket.status === "CLOSED") throw new Error("TICKET_CLOSED");

      const message = await tx.supportTicketMessage.create({
        data: {
          tenantId: membership.tenantId,
          ticketId: ticket.id,
          senderUserId: membership.userId,
          senderType: "USER",
          body: parsed.data.body,
        },
        select: { id: true },
      });

      if (savedAttachment) {
        await tx.supportTicketAttachment.create({
          data: {
            tenantId: membership.tenantId,
            ticketId: ticket.id,
            messageId: message.id,
            fileName: savedAttachment.fileName,
            fileUrl: savedAttachment.publicUrl,
            fileKey: savedAttachment.key,
            mimeType: savedAttachment.mimeType,
            sizeBytes: savedAttachment.sizeBytes,
          },
        });
      }

      await tx.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "OPEN", lastMessageAt: new Date() },
      });
    });
  } catch (error) {
    return { ok: false, message: getSupportTicketErrorMessage(error) };
  }

  await createAuditLog({
    tenantId: membership.tenantId,
    userId: membership.userId,
    action: "UPDATE",
    entityType: "SYSTEM",
    entityId: parsed.data.ticketId,
    title: "ارسال پاسخ پشتیبانی",
    message: `پاسخ جدیدی در تیکت پشتیبانی توسط ${getAuditActorName(membership.user)} ثبت شد.`,
    href: `/dashboard/support/${parsed.data.ticketId}`,
  });

  revalidateSupportPaths(parsed.data.ticketId);
  return { ok: true, message: "پاسخ شما ثبت شد." };
}

export async function closeSupportTicketAction(formData: FormData) {
  const membership = await requireTenantMember();
  const parsed = supportTicketIdSchema.safeParse({ ticketId: formData.get("ticketId") });
  if (!parsed.success) redirect("/dashboard/support?ticketError=invalid");

  const db = await getPrisma();
  const ticket = await db.supportTicket.updateMany({
    where: { id: parsed.data.ticketId, tenantId: membership.tenantId, status: { not: "CLOSED" } },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  if (ticket.count > 0) {
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "UPDATE",
      entityType: "SYSTEM",
      entityId: parsed.data.ticketId,
      title: "بستن تیکت پشتیبانی",
      message: `تیکت پشتیبانی توسط ${getAuditActorName(membership.user)} بسته شد.`,
      href: `/dashboard/support/${parsed.data.ticketId}`,
    });
  }

  revalidateSupportPaths(parsed.data.ticketId);
  redirect(`/dashboard/support/${parsed.data.ticketId}?closed=1`);
}

export async function reopenSupportTicketAction(formData: FormData) {
  const membership = await requireTenantMember();
  const parsed = supportTicketIdSchema.safeParse({ ticketId: formData.get("ticketId") });
  if (!parsed.success) redirect("/dashboard/support?ticketError=invalid");

  const db = await getPrisma();
  const ticket = await db.supportTicket.updateMany({
    where: { id: parsed.data.ticketId, tenantId: membership.tenantId, status: "CLOSED" },
    data: { status: "OPEN", closedAt: null, lastMessageAt: new Date() },
  });

  if (ticket.count > 0) {
    await createAuditLog({
      tenantId: membership.tenantId,
      userId: membership.userId,
      action: "RESTORE",
      entityType: "SYSTEM",
      entityId: parsed.data.ticketId,
      title: "بازگشایی تیکت پشتیبانی",
      message: `تیکت پشتیبانی توسط ${getAuditActorName(membership.user)} بازگشایی شد.`,
      href: `/dashboard/support/${parsed.data.ticketId}`,
    });
  }

  revalidateSupportPaths(parsed.data.ticketId);
  redirect(`/dashboard/support/${parsed.data.ticketId}?reopened=1`);
}
