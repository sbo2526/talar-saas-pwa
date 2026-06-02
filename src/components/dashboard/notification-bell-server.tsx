import type { Prisma } from "@prisma/client";
import { NotificationBellClient } from "@/components/dashboard/notification-bell-client";
import {
  getHeaderNotifications,
  syncInAppNotificationsForTenant,
  toHeaderNotificationView,
} from "@/lib/notifications/in-app-notification-service";

type TenantMemberWithTenant = Prisma.TenantMemberGetPayload<{
  include: {
    tenant: {
      include: {
        subscription: true;
      };
    };
  };
}>;

type NotificationBellServerProps = {
  membership?: TenantMemberWithTenant | null;
};

export async function NotificationBellServer({
  membership,
}: NotificationBellServerProps) {
  if (!membership) {
    return <NotificationBellClient unreadCount={0} criticalCount={0} items={[]} />;
  }

  await syncInAppNotificationsForTenant({
    tenantId: membership.tenantId,
    userId: membership.userId,
  });

  const data = await getHeaderNotifications({
    tenantId: membership.tenantId,
    userId: membership.userId,
    limit: 10,
  });

  return (
    <NotificationBellClient
      unreadCount={data.unreadCount}
      criticalCount={data.criticalCount}
      items={data.items.map(toHeaderNotificationView)}
    />
  );
}
