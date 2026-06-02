import { NextResponse } from "next/server";
import { requireTenantPermission } from "@/lib/auth/tenant-permission-guards";
import { withUtf8Bom } from "@/lib/backups/csv";
import {
  buildOwnerSettlementCsv,
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
      format: "CSV",
      request,
    });

    const csv = withUtf8Bom(buildOwnerSettlementCsv(data));
    const fileName = createOwnerSettlementExportFileName(data, "csv");

    return new NextResponse(csv, {
      headers: createOwnerSettlementAttachmentHeaders(fileName, "text/csv; charset=utf-8"),
    });
  } catch (error) {
    console.error("Owner settlement CSV export failed", error);
    return NextResponse.json(
      { message: "در تولید خروجی CSV تسویه مالک خطایی رخ داد." },
      { status: 500 },
    );
  }
}
