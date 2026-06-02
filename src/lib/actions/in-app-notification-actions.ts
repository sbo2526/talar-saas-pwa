"use server";

import { revalidatePath } from "next/cache";
import { requireTenantMember } from "@/lib/auth/session";
import {
  dismissInAppNotification,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
} from "@/lib/notifications/in-app-notification-service";

function revalidateNotificationSurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/contracts");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard/settings/notifications");
}

export async function markInAppNotificationReadAction(formData: FormData) {
  const membership = await requireTenantMember();
  const notificationId = String(formData.get("notificationId") ?? "");

  if (!notificationId) {
    return;
  }

  await markInAppNotificationRead({
    tenantId: membership.tenantId,
    userId: membership.userId,
    notificationId,
  });
  revalidateNotificationSurfaces();
}

export async function markAllInAppNotificationsReadAction(_formData?: FormData) {
  void _formData;
  const membership = await requireTenantMember();

  await markAllInAppNotificationsRead({
    tenantId: membership.tenantId,
    userId: membership.userId,
  });
  revalidateNotificationSurfaces();
}

export async function dismissInAppNotificationAction(formData: FormData) {
  const membership = await requireTenantMember();
  const notificationId = String(formData.get("notificationId") ?? "");

  if (!notificationId) {
    return;
  }

  await dismissInAppNotification({
    tenantId: membership.tenantId,
    userId: membership.userId,
    notificationId,
  });
  revalidateNotificationSurfaces();
}
