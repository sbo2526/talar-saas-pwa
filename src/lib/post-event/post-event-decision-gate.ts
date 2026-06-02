import "server-only";
import type { ContractStatus, UserRole } from "@prisma/client";
import { defaultOwnerOperationStartDate } from "@/lib/owner-operation/owner-operation-settings";
import { getPrisma } from "@/lib/prisma";

const actionableStatuses: ContractStatus[] = ["RESERVED", "CONFIRMED", "COMPLETED"];
const postEventDecisionGraceHours = 24;

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getDecisionDueDate(eventDate: Date) {
  return addHours(eventDate, postEventDecisionGraceHours);
}

export function isLegacyContractEventDate(
  eventDate: Date,
  ownerOperationStartDate: Date | null | undefined,
) {
  const startDate = ownerOperationStartDate ?? defaultOwnerOperationStartDate;
  return eventDate < startDate;
}

export async function getOwnerOperationStartDateForTenant(tenantId: string) {
  const db = await getPrisma();
  const setting = await db.ownerOperationSetting.findUnique({
    where: { tenantId },
    select: { effectiveFrom: true },
  });

  return setting?.effectiveFrom ?? defaultOwnerOperationStartDate;
}

export async function getPostEventDecisionGateData(input: {
  tenantId: string;
  role: UserRole;
  now?: Date;
  take?: number;
}) {
  const db = await getPrisma();
  const now = input.now ?? new Date();
  const startDate = await getOwnerOperationStartDateForTenant(input.tenantId);
  const dueEventDateCutoff = addHours(now, -postEventDecisionGraceHours);
  const where = {
    tenantId: input.tenantId,
    status: { in: actionableStatuses },
    eventDate: { gte: startDate, lt: dueEventDateCutoff },
    postEventConfirmation: null,
  };

  const [items, count] = await Promise.all([
    db.contract.findMany({
      where,
      select: {
        id: true,
        contractNo: true,
        eventTypeName: true,
        eventDate: true,
        eventStartTime: true,
        guestCount: true,
        finalTotal: true,
        customer: { select: { fullName: true } },
        hall: { select: { name: true } },
        salon: { select: { name: true } },
      },
      orderBy: [{ eventDate: "asc" }, { createdAt: "desc" }],
      take: input.take ?? 10,
    }),
    db.contract.count({ where }),
  ]);

  return {
    count,
    startDate,
    graceHours: postEventDecisionGraceHours,
    shouldBlock: input.role !== "OWNER" && count > 0,
    items: items.map((contract) => {
      const dueDate = getDecisionDueDate(contract.eventDate);
      return {
        id: contract.id,
        contractNo: contract.contractNo,
        customerName: contract.customer.fullName,
        eventTypeName: contract.eventTypeName,
        eventDate: contract.eventDate,
        eventStartTime: contract.eventStartTime,
        guestCount: contract.guestCount,
        finalTotal: contract.finalTotal,
        hallName: contract.hall?.name ?? null,
        salonName: contract.salon?.name ?? null,
        daysOverdue: Math.max(1, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) + 1),
      };
    }),
  };
}
