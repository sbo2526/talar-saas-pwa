import { getPrisma } from "@/lib/prisma";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_EVENT_TYPES,
  type NotificationChannel,
  type NotificationEventType,
  type NotificationStatus,
  isNotificationChannel,
  isNotificationEventType,
  isNotificationStatus,
} from "@/lib/notifications/constants";
import {
  getDefaultNotificationTemplate,
  shouldUpgradeStoredNotificationTemplate,
  stripDemoWordingFromNotificationText,
} from "@/lib/notifications/template-renderer";

type NotificationDelegate = {
  findUnique(args: unknown): Promise<{
    id: string;
    channel: string;
    eventType: string;
    title: string;
    body: string;
    isEnabled: boolean;
  } | null>;
  create(args: unknown): Promise<{ id: string }>;
  updateMany(args: unknown): Promise<unknown>;
};

type NotificationServiceClient = {
  notificationTemplate: NotificationDelegate;
  notificationLog: NotificationDelegate;
};

async function getNotificationServiceClient() {
  return (await getPrisma()) as unknown as NotificationServiceClient;
}


type NotificationLogInput = {
  tenantId: string;
  channel: NotificationChannel | string;
  eventType: NotificationEventType | string;
  recipient?: string | null;
  recipientLabel?: string | null;
  title?: string | null;
  message: string;
  status?: NotificationStatus | string;
  errorMessage?: string | null;
  relatedContractId?: string | null;
  relatedPaymentId?: string | null;
  relatedExpenseId?: string | null;
  relatedCustomerId?: string | null;
};

function assertTenantId(tenantId: string) {
  if (!tenantId?.trim()) {
    throw new Error("شناسه فضای کاری برای ثبت اعلان معتبر نیست.");
  }
}

function normalizeChannel(channel: string): NotificationChannel {
  if (!isNotificationChannel(channel)) {
    throw new Error("کانال اعلان معتبر نیست.");
  }

  return channel;
}

function normalizeEventType(eventType: string): NotificationEventType {
  if (!isNotificationEventType(eventType)) {
    throw new Error("نوع رویداد اعلان معتبر نیست.");
  }

  return eventType;
}

function normalizeStatus(status: string | undefined): NotificationStatus {
  if (!status) {
    return "QUEUED";
  }

  if (!isNotificationStatus(status)) {
    throw new Error("وضعیت اعلان معتبر نیست.");
  }

  return status;
}

export async function ensureDefaultNotificationTemplates(tenantId: string): Promise<void> {
  assertTenantId(tenantId);
  const db = await getNotificationServiceClient();

  await Promise.all(
    NOTIFICATION_CHANNELS.flatMap((channel) =>
      NOTIFICATION_EVENT_TYPES.map(async (eventType) => {
        const template = getDefaultNotificationTemplate(channel, eventType);

        if (!template) {
          return;
        }

        const existing = await db.notificationTemplate.findUnique({
          where: {
            tenantId_channel_eventType: {
              tenantId,
              channel,
              eventType,
            },
          },
          select: {
            id: true,
            channel: true,
            eventType: true,
            title: true,
            body: true,
            isEnabled: true,
          },
        });

        if (!existing) {
          await db.notificationTemplate.create({
            data: {
              tenantId,
              channel,
              eventType,
              title: template.title,
              body: template.body,
              isEnabled: true,
            },
          });
          return;
        }

        if (
          shouldUpgradeStoredNotificationTemplate({
            channel: existing.channel,
            eventType: existing.eventType,
            title: existing.title,
            body: existing.body,
          })
        ) {
          await db.notificationTemplate.updateMany({
            where: { id: existing.id, tenantId },
            data: {
              title: template.title,
              body: template.body,
              isEnabled: existing.isEnabled,
            },
          });
        }
      }),
    ),
  );
}

export async function createNotificationLog(input: NotificationLogInput): Promise<{ id: string }> {
  assertTenantId(input.tenantId);
  const channel = normalizeChannel(input.channel);
  const eventType = normalizeEventType(input.eventType);
  const status = normalizeStatus(input.status);

  const cleanMessage = stripDemoWordingFromNotificationText(input.message);
  const cleanTitle = input.title
    ? stripDemoWordingFromNotificationText(input.title)
    : null;

  if (!cleanMessage.trim()) {
    throw new Error("متن اعلان برای ثبت لاگ الزامی است.");
  }

  const db = await getNotificationServiceClient();

  return db.notificationLog.create({
    data: {
      tenantId: input.tenantId,
      channel,
      eventType,
      recipient: input.recipient ?? null,
      recipientLabel: input.recipientLabel ?? null,
      title: cleanTitle,
      message: cleanMessage,
      status,
      errorMessage: input.errorMessage ?? null,
      relatedContractId: input.relatedContractId ?? null,
      relatedPaymentId: input.relatedPaymentId ?? null,
      relatedExpenseId: input.relatedExpenseId ?? null,
      relatedCustomerId: input.relatedCustomerId ?? null,
      sentAt: status === "SENT" ? new Date() : null,
      failedAt: status === "FAILED" ? new Date() : null,
    },
  });
}

export async function markNotificationLogSent(logId: string, tenantId: string): Promise<void> {
  assertTenantId(tenantId);
  const db = await getNotificationServiceClient();

  await db.notificationLog.updateMany({
    where: { id: logId, tenantId },
    data: {
      status: "SENT",
      sentAt: new Date(),
      failedAt: null,
      errorMessage: null,
      attemptCount: { increment: 1 },
    },
  });
}

export async function markNotificationLogFailed(
  logId: string,
  tenantId: string,
  errorMessage: string,
): Promise<void> {
  assertTenantId(tenantId);
  const db = await getNotificationServiceClient();

  await db.notificationLog.updateMany({
    where: { id: logId, tenantId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorMessage: errorMessage.slice(0, 2000),
      attemptCount: { increment: 1 },
    },
  });
}

export async function createSkippedNotificationLog(input: Omit<NotificationLogInput, "status">): Promise<void> {
  await createNotificationLog({ ...input, status: "SKIPPED" });
}
