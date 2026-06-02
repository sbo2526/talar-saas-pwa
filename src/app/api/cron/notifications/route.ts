import { NextRequest, NextResponse } from "next/server";
import { runScheduledNotificationDispatch } from "@/lib/notifications/scheduled-dispatcher";

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

async function handleCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET تنظیم نشده است." }, { status: 500 });
  }
  const token = getBearerToken(request) ?? request.nextUrl.searchParams.get("secret");
  if (token !== secret) {
    return NextResponse.json({ ok: false, message: "دسترسی به اجرای زمان‌بندی اعلان‌ها مجاز نیست." }, { status: 401 });
  }
  const summary = await runScheduledNotificationDispatch();
  return NextResponse.json({
    ok: true,
    processedTenants: summary.processedTenants,
    sent: summary.sent,
    failed: summary.failed,
    skipped: summary.skipped,
  });
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
