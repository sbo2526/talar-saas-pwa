import { getPrisma } from "@/lib/prisma";
import { getCurrentTenantMember, requireTenantMember, requireTenantRole } from "@/lib/auth/session";
import { toNumber } from "@/lib/owner-settlements/rules";

export async function listOwnerMonthlySettlements() {
  const membership = await requireTenantMember();
  const db = await getPrisma();

  return db.ownerMonthlySettlement.findMany({
    where: { tenantId: membership.tenantId },
    include: {
      hall: { select: { name: true } },
      operationAgreement: { select: { agreementTitle: true, operationModel: true, ownerName: true, operatorName: true } },
    },
    orderBy: [{ settlementYear: "desc" }, { settlementMonth: "desc" }, { createdAt: "desc" }],
    take: 60,
  });
}

export async function getOwnerSettlementCreateContext() {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();

  const agreements = await db.hallOperationAgreement.findMany({
    where: { tenantId: membership.tenantId, status: "ACTIVE" },
    include: { hall: { select: { name: true } } },
    orderBy: [{ hallId: "asc" }, { createdAt: "desc" }],
  });

  return { membership, agreements };
}

export async function getOwnerSettlementDetail(settlementId: string) {
  const membership = await requireTenantMember();
  const db = await getPrisma();

  return db.ownerMonthlySettlement.findFirst({
    where: { id: settlementId, tenantId: membership.tenantId },
    include: {
      hall: { select: { name: true } },
      operationAgreement: { select: { agreementTitle: true, operationModel: true, ownerName: true, operatorName: true } },
      entries: {
        include: {
          contract: { select: { contractNo: true, eventDate: true, customer: { select: { fullName: true } } } },
          invoice: { select: { invoiceNumber: true, status: true } },
          offInvoiceReport: { select: { serviceTitle: true, reportType: true, ownerReviewStatus: true } },
        },
        orderBy: [{ entryType: "asc" }, { sourceDate: "asc" }],
      },
      payments: { orderBy: { paymentDate: "asc" } },
    },
  });
}

export async function getOwnerSettlementPaymentContext(settlementId: string) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id: settlementId, tenantId: membership.tenantId },
    include: { hall: { select: { name: true } }, payments: { orderBy: { paymentDate: "asc" } } },
  });

  return { membership, settlement };
}

export async function getOwnerSettlementDashboardSummary() {
  const membership = await getCurrentTenantMember();
  if (!membership) {
    return {
      payableCount: 0,
      pendingAmount: 0,
      lockedCount: 0,
    };
  }

  const db = await getPrisma();
  const settlements = await db.ownerMonthlySettlement.findMany({
    where: { tenantId: membership.tenantId, status: { notIn: ["CANCELLED"] } },
    select: { status: true, remainingPayableAmount: true },
    take: 200,
  });

  return {
    payableCount: settlements.filter((settlement) => ["PAYMENT_PENDING", "PARTIALLY_PAID"].includes(settlement.status)).length,
    pendingAmount: settlements.reduce((sum, settlement) => sum + Math.max(0, toNumber(settlement.remainingPayableAmount)), 0),
    lockedCount: settlements.filter((settlement) => settlement.status === "LOCKED").length,
  };
}

export async function getInvoiceSettlementMarkers(invoiceId: string) {
  const membership = await getCurrentTenantMember();
  if (!membership) return [];
  const db = await getPrisma();

  return db.ownerMonthlySettlementEntry.findMany({
    where: { tenantId: membership.tenantId, invoiceId },
    include: { settlement: { select: { id: true, settlementYear: true, settlementMonth: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOffInvoiceSettlementMarkers(reportId: string) {
  const membership = await getCurrentTenantMember();
  if (!membership) return [];
  const db = await getPrisma();

  return db.ownerMonthlySettlementEntry.findMany({
    where: { tenantId: membership.tenantId, offInvoiceReportId: reportId },
    include: { settlement: { select: { id: true, settlementYear: true, settlementMonth: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });
}
