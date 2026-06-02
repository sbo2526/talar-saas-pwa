import "server-only";
import type { ContractStatus, Prisma } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { getCurrentLocalDateStart } from "@/lib/post-event-decisions/rules";

const decisionRequiredStatuses: ContractStatus[] = ["DRAFT", "RESERVED", "CONFIRMED", "COMPLETED"];

export type PostEventDecisionContract = Prisma.ContractGetPayload<{
  select: {
    id: true;
    tenantId: true;
    contractNo: true;
    title: true;
    eventDate: true;
    eventStartTime: true;
    eventEndTime: true;
    status: true;
    guestCount: true;
    hallId: true;
    customer: { select: { fullName: true } };
    hall: { select: { name: true } };
    postEventDecision: { select: { id: true; decisionStatus: true } };
  };
}>;

function buildPostEventDecisionRequiredWhere(tenantId: string, todayStart = getCurrentLocalDateStart()) {
  return {
    tenantId,
    status: { in: decisionRequiredStatuses },
    eventDate: { lt: todayStart },
    postEventDecision: { is: null },
  } satisfies Prisma.ContractWhereInput;
}

export async function getContractsRequiringPostEventDecision(input: {
  tenantId: string;
  take?: number;
}) {
  const db = await getPrisma();

  return db.contract.findMany({
    where: buildPostEventDecisionRequiredWhere(input.tenantId),
    select: {
      id: true,
      tenantId: true,
      contractNo: true,
      title: true,
      eventDate: true,
      eventStartTime: true,
      eventEndTime: true,
      status: true,
      guestCount: true,
      hallId: true,
      customer: { select: { fullName: true } },
      hall: { select: { name: true } },
      postEventDecision: { select: { id: true, decisionStatus: true } },
    },
    orderBy: [{ eventDate: "asc" }, { createdAt: "asc" }],
    take: input.take ?? 50,
  });
}

export async function getPostEventDecisionGateSummary(input: { tenantId: string }) {
  const db = await getPrisma();
  const [unresolvedCount, lateRescheduleOwnerReviewCount] = await Promise.all([
    db.contract.count({
      where: buildPostEventDecisionRequiredWhere(input.tenantId),
    }),
    db.postEventDecision.count({
      where: {
        tenantId: input.tenantId,
        decisionStatus: "NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW",
        requiresOwnerReview: true,
      },
    }),
  ]);

  return {
    unresolvedCount,
    lateRescheduleOwnerReviewCount,
  };
}
