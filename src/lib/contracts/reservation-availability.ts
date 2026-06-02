import { ContractStatus, type Prisma, type PrismaClient } from "@prisma/client";

export type ReservationAvailabilityConflict = {
  id: string;
  contractNo: string;
  title: string;
  customerName: string;
  eventStartTime: string | null;
  eventEndTime: string | null;
  status: string;
};

export type ReservationAvailabilityResult = {
  available: boolean;
  conflicts: ReservationAvailabilityConflict[];
};

type ReservationAvailabilityDb = PrismaClient | Prisma.TransactionClient;

type ReservationAvailabilityInput = {
  db: ReservationAvailabilityDb;
  tenantId: string;
  eventDate: Date;
  salonId?: string | null;
  eventStartTime?: string | null;
  eventEndTime?: string | null;
  excludeContractId?: string | null;
};

const blockingStatuses = [ContractStatus.RESERVED, ContractStatus.CONFIRMED] as const;

function parseTimeToMinutes(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value ?? ""));

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeInterval(startTime: string | null | undefined, endTime: string | null | undefined) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === null || end === null || start === end) {
    return null;
  }

  return {
    start,
    end: end < start ? end + 24 * 60 : end,
  };
}

function intervalsOverlap(
  first: { start: number; end: number },
  second: { start: number; end: number },
) {
  return first.start < second.end && second.start < first.end;
}

function getUtcDateRange(eventDate: Date) {
  const dayStart = new Date(Date.UTC(
    eventDate.getUTCFullYear(),
    eventDate.getUTCMonth(),
    eventDate.getUTCDate(),
    0,
    0,
    0,
    0,
  ));
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return { dayStart, dayEnd };
}

export async function checkContractReservationAvailability({
  db,
  tenantId,
  eventDate,
  salonId,
  eventStartTime,
  eventEndTime,
  excludeContractId,
}: ReservationAvailabilityInput): Promise<ReservationAvailabilityResult> {
  const requestedInterval = normalizeInterval(eventStartTime, eventEndTime);

  if (!salonId || !requestedInterval) {
    return { available: false, conflicts: [] };
  }

  const { dayStart, dayEnd } = getUtcDateRange(eventDate);
  const contracts = await db.contract.findMany({
    where: {
      tenantId,
      salonId,
      status: { in: [...blockingStatuses] },
      eventDate: {
        gte: dayStart,
        lt: dayEnd,
      },
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: {
      id: true,
      contractNo: true,
      title: true,
      status: true,
      eventStartTime: true,
      eventEndTime: true,
      customer: {
        select: {
          fullName: true,
        },
      },
    },
    orderBy: [
      { eventStartTime: "asc" },
      { createdAt: "asc" },
    ],
  });

  const conflicts = contracts.filter((contract) => {
    const existingInterval = normalizeInterval(contract.eventStartTime, contract.eventEndTime);

    if (!existingInterval) {
      return true;
    }

    return intervalsOverlap(requestedInterval, existingInterval);
  });

  return {
    available: conflicts.length === 0,
    conflicts: conflicts.map((contract) => ({
      id: contract.id,
      contractNo: contract.contractNo,
      title: contract.title,
      customerName: contract.customer.fullName,
      eventStartTime: contract.eventStartTime,
      eventEndTime: contract.eventEndTime,
      status: contract.status,
    })),
  };
}
