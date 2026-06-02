import { NextResponse } from "next/server";
import { getCurrentTenantMember } from "@/lib/auth/session";
import { canTenantAccess } from "@/lib/auth/tenant-permissions";
import { runScheduledNotificationDispatch } from "@/lib/notifications/scheduled-dispatcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const membership = await getCurrentTenantMember();

  if (!membership) {
    return NextResponse.json(
      { ok: false, message: "برای بررسی اعلان‌های خودکار باید وارد شوید." },
      { status: 401 },
    );
  }

  if (!canTenantAccess(membership, "notifications.manage")) {
    return NextResponse.json(
      { ok: false, message: "دسترسی اجرای خودکار اعلان‌ها برای این نقش فعال نیست." },
      { status: 403 },
    );
  }

  try {
    const summary = await runScheduledNotificationDispatch({ tenantId: membership.tenantId });

    return NextResponse.json({
      ok: true,
      processedTenants: summary.processedTenants,
      sent: summary.sent,
      failed: summary.failed,
      skipped: summary.skipped,
    });
  } catch (error) {
    console.error("Dashboard notification automation tick failed", error);

    return NextResponse.json(
      { ok: false, message: "بررسی خودکار اعلان‌ها با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
