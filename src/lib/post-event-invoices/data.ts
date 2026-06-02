import "server-only";
import type { Prisma } from "@prisma/client";
import { getCurrentLocalDateStart } from "@/lib/post-event-decisions/rules";
import { getPrisma } from "@/lib/prisma";

export type PostEventInvoiceContract = Prisma.ContractGetPayload<{
  include: {
    customer: { select: { fullName: true; phone: true } };
    hall: { select: { name: true } };
    salon: { select: { name: true } };
    postEventDecision: true;
    postEventInvoice: { include: { lines: { orderBy: [{ lineType: "asc" }, { createdAt: "asc" }] } } };
    lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] };
    payments: { select: { amount: true; type: true; status: true } };
  };
}>;

export type PostEventInvoiceWithContract = Prisma.PostEventInvoiceGetPayload<{
  include: {
    contract: {
      include: {
        customer: { select: { fullName: true; phone: true } };
        hall: { select: { name: true } };
        salon: { select: { name: true } };
        postEventDecision: true;
      };
    };
    hall: { select: { name: true } };
    lines: { orderBy: [{ lineType: "asc" }, { createdAt: "asc" }] };
    accessLinks: { orderBy: { createdAt: "desc" }; include: { feedbacks: { orderBy: { submittedAt: "desc" }; take: 1 } } };
    customerFeedbacks: { orderBy: { submittedAt: "desc" }; take: 1; include: { offInvoiceReports: true } };
  };
}>;

export async function getPostEventInvoiceContract(input: { tenantId: string; contractId: string }) {
  const db = await getPrisma();
  return db.contract.findFirst({
    where: { id: input.contractId, tenantId: input.tenantId },
    include: {
      customer: { select: { fullName: true, phone: true } },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
      postEventDecision: true,
      postEventInvoice: { include: { lines: { orderBy: [{ lineType: "asc" }, { createdAt: "asc" }] } } },
      lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      payments: { select: { amount: true, type: true, status: true } },
    },
  });
}

export async function getPostEventInvoiceById(input: { tenantId: string; invoiceId: string }) {
  const db = await getPrisma();
  return db.postEventInvoice.findFirst({
    where: { id: input.invoiceId, tenantId: input.tenantId },
    include: {
      contract: {
        include: {
          customer: { select: { fullName: true, phone: true } },
          hall: { select: { name: true } },
          salon: { select: { name: true } },
          postEventDecision: true,
        },
      },
      hall: { select: { name: true } },
      lines: { orderBy: [{ lineType: "asc" }, { createdAt: "asc" }] },
      accessLinks: { orderBy: { createdAt: "desc" }, include: { feedbacks: { orderBy: { submittedAt: "desc" }, take: 1 } } },
      customerFeedbacks: { orderBy: { submittedAt: "desc" }, take: 1, include: { offInvoiceReports: true } },
    },
  });
}

export async function getPostEventInvoiceList(input: { tenantId: string }) {
  const db = await getPrisma();
  return db.postEventInvoice.findMany({
    where: { tenantId: input.tenantId },
    include: {
      contract: { include: { customer: { select: { fullName: true } }, hall: { select: { name: true } } } },
      lines: { select: { id: true, lineType: true } },
      accessLinks: { orderBy: { createdAt: "desc" }, take: 1, include: { feedbacks: { orderBy: { submittedAt: "desc" }, take: 1 } } },
      customerFeedbacks: { orderBy: { submittedAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function getPostEventInvoiceDashboardSummary(input: { tenantId: string }) {
  const db = await getPrisma();
  const todayStart = getCurrentLocalDateStart();
  const [readyHeldCount, draftCount, issuedCount] = await Promise.all([
    db.contract.count({
      where: {
        tenantId: input.tenantId,
        status: { not: "CANCELED" },
        eventDate: { lt: todayStart },
        postEventDecision: { is: { decisionStatus: "HELD" } },
        postEventInvoice: { is: null },
      },
    }),
    db.postEventInvoice.count({ where: { tenantId: input.tenantId, status: "DRAFT" } }),
    db.postEventInvoice.count({ where: { tenantId: input.tenantId, status: "ISSUED" } }),
  ]);

  return { readyHeldCount, draftCount, issuedCount };
}
