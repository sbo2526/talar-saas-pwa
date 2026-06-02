import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import {
  buildOwnerSettlementJson,
  createOwnerSettlementAttachmentHeaders,
  createOwnerSettlementExportFileName,
  getOwnerSettlementExportData,
  logOwnerSettlementExport,
} from "@/lib/owner-settlements/owner-settlement-export";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const membership = await requireTenantPermission("owner.settlement.view");
  const { id } = await params;

  try {
    const data = await getOwnerSettlementExportData({
      tenantId: membership.tenantId,
      settlementId: id,
    });

    if (!data) {
      return NextResponse.json({ message: "گزارش تسویه مالک پیدا نشد." }, { status: 404 });
    }

    await logOwnerSettlementExport({
      tenantId: membership.tenantId,
      actor: membership,
      data,
      format: "JSON",
      request,
    });

    const fileName = createOwnerSettlementExportFileName(data, "json");
    const payload = buildOwnerSettlementJson(data);

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: createOwnerSettlementAttachmentHeaders(fileName, "application/json; charset=utf-8"),
    });
  } catch (error) {
    console.error("Owner settlement JSON export failed", error);
    return NextResponse.json(
      { message: "در تولید خروجی JSON تسویه مالک خطایی رخ داد." },
      { status: 500 },
    );
  }
}
