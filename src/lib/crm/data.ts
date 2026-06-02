import { getPrisma } from "@/lib/prisma";
import { hashPortalToken, isExpired } from "@/lib/crm/security";

export type CrmDelegate<Row = unknown> = {
  count(args?: unknown): Promise<number>;
  findFirst(args: unknown): Promise<Row | null>;
  findUnique(args: unknown): Promise<Row | null>;
  findMany(args: unknown): Promise<Row[]>;
  update(args: unknown): Promise<Row>;
  updateMany(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<Row>;
  upsert(args: unknown): Promise<Row>;
};

type CrmClient = {
  contract: CrmDelegate;
  contractAccessLink: CrmDelegate;
  contractFeedback: CrmDelegate;
  customerClubMember: CrmDelegate;
  weddingProfile: CrmDelegate;
  weddingMusicRequest: CrmDelegate;
  reminderRecord: CrmDelegate;
};

export async function getCrmClient() {
  return (await getPrisma()) as unknown as CrmClient;
}

export function resolveLinkRuntimeStatus(link: { revokedAt?: Date | null; expiresAt?: Date | null }) {
  if (link.revokedAt) return "REVOKED";
  if (isExpired(link.expiresAt)) return "EXPIRED";
  return "ACTIVE";
}

export async function getCrmDashboardData(tenantId: string) {
  const db = await getCrmClient();
  const now = new Date();
  const [contractsCount, activeLinks, feedbacksCount, clubMembersCount, musicPendingCount, upcomingRemindersCount, latestContracts] = await Promise.all([
    db.contract.count({ where: { tenantId } }),
    db.contractAccessLink.count({ where: { tenantId, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
    db.contractFeedback.count({ where: { tenantId } }),
    db.customerClubMember.count({ where: { tenantId } }),
    db.weddingMusicRequest.count({ where: { tenantId, status: { in: ["REGISTERED", "REVIEWING", "NEEDS_CHANGE"] } } }),
    db.reminderRecord.count({ where: { tenantId, isActive: true } }),
    db.contract.findMany({
      where: { tenantId },
      include: {
        customer: true,
        hall: { select: { name: true } },
        salon: { select: { name: true } },
        accessLinks: { orderBy: { createdAt: "desc" } },
        feedbacks: { orderBy: { createdAt: "desc" }, take: 2 },
        weddingProfile: { include: { musicRequests: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  return { contractsCount, activeLinks, feedbacksCount, clubMembersCount, musicPendingCount, upcomingRemindersCount, latestContracts };
}

export async function getCrmContractData(tenantId: string, contractId: string) {
  const db = await getCrmClient();
  return db.contract.findFirst({
    where: { id: contractId, tenantId },
    include: {
      customer: true,
      hall: true,
      salon: true,
      accessLinks: { orderBy: { createdAt: "desc" } },
      feedbacks: { orderBy: { createdAt: "desc" } },
      clubMembers: { orderBy: { updatedAt: "desc" } },
      weddingProfile: { include: { musicRequests: { orderBy: { createdAt: "desc" } } } },
      musicRequests: { orderBy: { createdAt: "desc" } },
      reminderRecords: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getPortalLinkByToken(token: string, expectedKind?: string) {
  const db = await getCrmClient();
  const tokenHash = hashPortalToken(token);
  const link = await db.contractAccessLink.findUnique({
    where: { tokenHash },
    include: {
      contract: {
        include: {
          customer: true,
          hall: true,
          salon: true,
          tenant: { include: { hallProfile: true } },
          lineItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
          invoice: {
            include: {
              lines: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
              customerFeedbacks: { orderBy: { createdAt: "desc" } },
            },
          },
          feedbacks: { orderBy: { createdAt: "desc" } },
          clubMembers: { orderBy: { updatedAt: "desc" } },
          weddingProfile: { include: { musicRequests: { orderBy: { createdAt: "desc" } } } },
        },
      },
    },
  }) as any;

  if (!link) return null;
  if (expectedKind && link.kind !== expectedKind) return null;
  if (link.revokedAt || isExpired(link.expiresAt)) return null;

  await db.contractAccessLink.update({
    where: { id: link.id },
    data: {
      firstViewedAt: link.firstViewedAt ?? new Date(),
      lastViewedAt: new Date(),
      viewCount: { increment: 1 },
    },
  });

  return link;
}

export async function markPortalDownload(token: string) {
  const db = await getCrmClient();
  const tokenHash = hashPortalToken(token);
  await db.contractAccessLink.updateMany({
    where: { tokenHash, kind: "OWNER_CONTRACT", revokedAt: null },
    data: { downloadCount: { increment: 1 } },
  });
}
