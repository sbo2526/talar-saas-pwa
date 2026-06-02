import "server-only";
import { addMonths, hashPortalToken, isExpired } from "@/lib/crm/security";
import { getPrisma } from "@/lib/prisma";
import { customerInvoiceAccessKind, customerInvoiceLinkMonths } from "@/lib/post-event-invoice-customer/rules";

export async function getIssuedPostEventInvoiceForCustomerToken(token: string) {
  const db = await getPrisma();
  const tokenHash = hashPortalToken(token);
  const link = await db.postEventInvoiceAccessLink.findUnique({
    where: { tokenHash },
    include: {
      invoice: {
        include: {
          contract: {
            include: {
              customer: true,
              hall: { select: { name: true } },
              salon: { select: { name: true } },
              tenant: { include: { hallProfile: true } },
            },
          },
          lines: { orderBy: [{ lineType: "asc" }, { createdAt: "asc" }] },
          customerFeedbacks: { orderBy: { submittedAt: "desc" }, include: { offInvoiceReports: true } },
        },
      },
      feedbacks: { orderBy: { submittedAt: "desc" }, include: { offInvoiceReports: true } },
    },
  });

  if (!link || link.revokedAt || isExpired(link.expiresAt) || link.invoice.status !== "ISSUED") {
    return null;
  }

  await db.postEventInvoiceAccessLink.update({
    where: { id: link.id },
    data: {
      firstViewedAt: link.firstViewedAt ?? new Date(),
      lastViewedAt: new Date(),
      viewCount: { increment: 1 },
    },
  });

  return link;
}

export async function getPostEventInvoiceCustomerLinkStatus(input: { tenantId: string; invoiceId: string }) {
  const db = await getPrisma();
  const link = await db.postEventInvoiceAccessLink.findFirst({
    where: { tenantId: input.tenantId, invoiceId: input.invoiceId, revokedAt: null },
    include: { feedbacks: { orderBy: { submittedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return link;
}

export async function getPostEventInvoiceCustomerReviewCounts(input: { tenantId: string }) {
  const db = await getPrisma();
  const [waitingLinkCount, submittedFeedbackCount, offInvoiceReportCount, mismatchCount, ownerReviewRequiredCount] = await Promise.all([
    db.postEventInvoiceAccessLink.count({ where: { tenantId: input.tenantId, revokedAt: null, feedbacks: { none: {} } } }),
    db.postEventInvoiceCustomerFeedback.count({ where: { tenantId: input.tenantId } }),
    db.postEventInvoiceCustomerFeedback.count({ where: { tenantId: input.tenantId, hasOffInvoicePayment: true } }),
    db.postEventInvoiceCustomerFeedback.count({ where: { tenantId: input.tenantId, hasMismatch: true } }),
    db.postEventInvoiceOffInvoiceReport.count({ where: { tenantId: input.tenantId, ownerReviewStatus: { in: ["REPORTED", "OWNER_REVIEW_REQUIRED"] } } }),
  ]);

  return { waitingLinkCount, submittedFeedbackCount, offInvoiceReportCount, mismatchCount, ownerReviewRequiredCount };
}

export async function getOffInvoiceReportsForOwner(input: { tenantId: string }) {
  const db = await getPrisma();
  return db.postEventInvoiceOffInvoiceReport.findMany({
    where: { tenantId: input.tenantId },
    include: {
      invoice: true,
      contract: { include: { customer: { select: { fullName: true, phone: true } } } },
      feedback: true,
      ownerMonthlySettlementEntries: { include: { settlement: { select: { id: true, settlementYear: true, settlementMonth: true, status: true } } } },
    },
    orderBy: [{ ownerReviewStatus: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
}

export function getDefaultCustomerInvoiceExpiresAt() {
  return addMonths(new Date(), customerInvoiceLinkMonths);
}

export function isCustomerInvoiceLinkKind(kind: string | null | undefined) {
  return kind === customerInvoiceAccessKind;
}
