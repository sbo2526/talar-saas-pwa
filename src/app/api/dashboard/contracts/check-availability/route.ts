import { NextRequest, NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { parseDateLikeToDate } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { checkContractReservationAvailability } from "@/lib/contracts/reservation-availability";

export async function GET(request: NextRequest) {
  const membership = await requireTenantPermission("contracts.create");
  const searchParams = request.nextUrl.searchParams;
  const eventDate = parseDateLikeToDate(searchParams.get("eventDate"));
  const salonId = searchParams.get("salonId");
  const eventStartTime = searchParams.get("eventStartTime");
  const eventEndTime = searchParams.get("eventEndTime");

  if (!eventDate || !salonId || !eventStartTime || !eventEndTime) {
    return NextResponse.json({
      status: "INCOMPLETE",
      message: "برای بررسی رزرو، تاریخ، سالن، ساعت شروع و ساعت پایان را تکمیل کنید.",
      conflicts: [],
    });
  }

  const db = await getPrisma();
  const result = await checkContractReservationAvailability({
    db,
    tenantId: membership.tenantId,
    eventDate,
    salonId,
    eventStartTime,
    eventEndTime,
  });

  if (!result.available) {
    return NextResponse.json({
      status: "CONFLICT",
      message: "این سالن در تاریخ و ساعت انتخاب‌شده قبلاً رزرو شده است.",
      conflicts: result.conflicts,
    });
  }

  return NextResponse.json({
    status: "AVAILABLE",
    message: "این سالن در تاریخ و ساعت انتخاب‌شده آزاد است.",
    conflicts: [],
  });
}
