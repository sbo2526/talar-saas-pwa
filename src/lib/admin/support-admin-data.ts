import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPrisma } from "@/lib/prisma";
import { decimalToNumber, normalizeSearchParam } from "@/lib/admin/admin-utils";
import { parseDateLikeToDate } from "@/lib/date/jalali";

export type AdminSupportListParams = {
  q?: string;
  tab?: string;
  view?: string;
  page?: string;
  status?: string;
  priority?: string;
  category?: string;
  sort?: string;
  tenantId?: string;
  userId?: string;
  createdFrom?: string;
  createdTo?: string;
  lastReplyFrom?: string;
  lastReplyTo?: string;
  unanswered?: string;
  attachments?: string;
  subscription?: string;
};

export type AdminSupportTone = "emerald" | "amber" | "rose" | "navy" | "slate";
export type TicketOperationalState = "waiting-support" | "waiting-user" | "closed" | "unanswered" | "in-review";

export type AdminSupportTicketListItem = {
  id: string;
  tenantId: string;
  ticketNumber: string;
  title: string;
  category: string;
  categoryLabel: string;
  priority: string;
  priorityLabel: string;
  priorityTone: AdminSupportTone;
  status: string;
  statusLabel: string;
  statusTone: AdminSupportTone;
  operationalState: TicketOperationalState;
  operationalLabel: string;
  operationalTone: AdminSupportTone;
  hallName: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile: string | null;
  createdByUserId: string | null;
  createdByName: string;
  createdByEmail: string | null;
  createdByMobile: string | null;
  subscriptionLabel: string;
  subscriptionTone: AdminSupportTone;
  createdAt: Date;
  lastMessageAt: Date;
  closedAt: Date | null;
  lastMessagePreview: string;
  lastSenderLabel: string;
  lastSenderType: string | null;
  lastSupportReplyAt: Date | null;
  firstSupportReplyAt: Date | null;
  waitingSince: Date | null;
  waitingMinutes: number | null;
  messagesCount: number;
  hasAttachments: boolean;
  availableActions: {
    detailHref: string;
    hallHref: string;
  };
};

export type AdminSupportTicketDetail = {
  ticket: AdminSupportTicketListItem & {
    subject: string;
    description: string;
  };
  messages: AdminSupportMessageItem[];
  timeline: AdminSupportTimelineItem[];
  relatedHall: {
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    ownerMobile: string | null;
    subscriptionLabel: string;
    subscriptionTone: AdminSupportTone;
    periodEnd: Date | null;
    openTicketsCount: number;
    totalTicketsCount: number;
    lastActivityAt: Date | null;
    contractsCount: number;
    receiptsTotal: number;
    detailHref: string;
    supportHref: string;
  };
  createdByUser: {
    id: string | null;
    name: string;
    email: string | null;
    mobile: string | null;
    role: string;
    lastLoginAt: Date | null;
    href: string | null;
  };
  previousTickets: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    statusLabel: string;
    statusTone: AdminSupportTone;
    createdAt: Date;
    href: string;
  }>;
};

export type AdminSupportMessageItem = {
  id: string;
  senderType: string;
  senderLabel: string;
  senderName: string;
  senderRole: string;
  tone: AdminSupportTone;
  body: string;
  createdAt: Date;
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    sizeBytes: number;
  }>;
};

export type AdminSupportTimelineItem = {
  id: string;
  label: string;
  actor: string;
  at: Date;
  tone: AdminSupportTone;
  description?: string;
};

const PAGE_SIZE = 10;

const statusLabels: Record<string, string> = {
  OPEN: "باز",
  IN_REVIEW: "در حال بررسی",
  ANSWERED: "پاسخ داده‌شده",
  WAITING_FOR_USER: "منتظر پاسخ کاربر",
  WAITING_FOR_SUPPORT: "منتظر پاسخ پشتیبانی",
  CLOSED: "بسته‌شده",
};

const priorityLabels: Record<string, string> = {
  LOW: "کم",
  MEDIUM: "متوسط",
  NORMAL: "متوسط",
  HIGH: "زیاد",
  URGENT: "فوری",
};

const categoryLabels: Record<string, string> = {
  TECHNICAL: "فنی",
  BILLING: "مالی / اشتراک",
  ACCOUNT: "حساب کاربری",
  FEATURE: "درخواست قابلیت",
  OTHER: "سایر",
  CONTRACT: "قرارداد",
  PAYMENTS: "دریافتی‌ها",
  EXPENSES: "هزینه‌ها",
  REPORTS: "گزارش‌ها",
  CONTRACT_PRINT: "چاپ قرارداد",
  NOTIFICATIONS: "اعلان‌ها",
  TRAINING: "آموزش",
};

const planLabels: Record<string, string> = {
  DEMO: "دوره بررسی",
  STARTER: "شروع",
  PROFESSIONAL: "حرفه‌ای",
  ENTERPRISE: "سازمانی",
};

function getPage(value: string | undefined) {
  const page = Number(value ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function parseDay(value: string | undefined) {
  const parsed = parseDateLikeToDate(value);
  return parsed && Number.isFinite(parsed.getTime()) ? parsed : null;
}

function endOfDay(date: Date | null) {
  if (!date) return null;
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCMilliseconds(next.getUTCMilliseconds() - 1);
  return next;
}

function latestDate(...dates: Array<Date | null | undefined>) {
  const valid = dates.filter((date): date is Date => Boolean(date));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((date) => date.getTime())));
}

function minutesSince(date: Date | null | undefined) {
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (60 * 1000)));
}

function sameTehranDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getTodayRange() {
  const now = new Date();
  const todayKey = sameTehranDay(now);
  const start = new Date(`${todayKey}T00:00:00.000+03:30`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function mapTicketStatusToPersian(status: string | null | undefined) {
  return statusLabels[status ?? ""] ?? "نامشخص";
}

export function mapTicketPriorityToPersian(priority: string | null | undefined) {
  return priorityLabels[priority ?? ""] ?? "نامشخص";
}

export function mapTicketCategoryToPersian(category: string | null | undefined) {
  return categoryLabels[category ?? ""] ?? "سایر";
}

export function getStatusTone(status: string | null | undefined): AdminSupportTone {
  if (status === "CLOSED") return "slate";
  if (status === "ANSWERED" || status === "WAITING_FOR_USER") return "emerald";
  if (status === "IN_REVIEW") return "amber";
  return "rose";
}

export function getPriorityTone(priority: string | null | undefined): AdminSupportTone {
  if (priority === "URGENT") return "rose";
  if (priority === "HIGH") return "amber";
  if (priority === "LOW") return "emerald";
  return "navy";
}

function getSubscriptionLabel(subscription: { plan: string; status: string; currentPeriodEnd: Date | null } | null) {
  if (!subscription) return { label: "بدون اشتراک", tone: "slate" as AdminSupportTone, periodEnd: null };
  const plan = planLabels[subscription.plan] ?? "پلن ثبت‌شده";
  if (subscription.status === "ACTIVE" && subscription.plan !== "DEMO") return { label: `اشتراک فعال · ${plan}`, tone: "emerald" as AdminSupportTone, periodEnd: subscription.currentPeriodEnd };
  if (subscription.status === "TRIALING" || subscription.plan === "DEMO") return { label: "دوره بررسی فعال", tone: "amber" as AdminSupportTone, periodEnd: subscription.currentPeriodEnd };
  if (subscription.status === "EXPIRED" || subscription.status === "PAST_DUE") return { label: "دوره منقضی‌شده", tone: "rose" as AdminSupportTone, periodEnd: subscription.currentPeriodEnd };
  if (subscription.status === "CANCELED") return { label: "اشتراک لغوشده", tone: "rose" as AdminSupportTone, periodEnd: subscription.currentPeriodEnd };
  return { label: plan, tone: "navy" as AdminSupportTone, periodEnd: subscription.currentPeriodEnd };
}

export function getTicketOperationalState(input: {
  status: string;
  lastSenderType: string | null;
  firstSupportReplyAt: Date | null;
}): { state: TicketOperationalState; label: string; tone: AdminSupportTone } {
  if (input.status === "CLOSED") return { state: "closed", label: "بسته‌شده", tone: "slate" };
  if (!input.firstSupportReplyAt) return { state: "unanswered", label: "بدون پاسخ", tone: "rose" };
  if (input.lastSenderType === "USER") return { state: "waiting-support", label: "منتظر پاسخ پشتیبانی", tone: "rose" };
  if (input.status === "IN_REVIEW") return { state: "in-review", label: "در حال بررسی", tone: "amber" };
  return { state: "waiting-user", label: "منتظر پاسخ کاربر", tone: "emerald" };
}

function buildWaitingLabel(item: Pick<AdminSupportTicketListItem, "operationalState" | "waitingMinutes">) {
  if (item.operationalState === "closed") return "بسته‌شده";
  if (item.waitingMinutes === null) return "بدون پیام";
  const hours = Math.floor(item.waitingMinutes / 60);
  const days = Math.floor(hours / 24);
  const amount = days > 0 ? `${days} روز` : hours > 0 ? `${hours} ساعت` : `${item.waitingMinutes} دقیقه`;
  if (item.operationalState === "waiting-user") return `${amount} در انتظار پاسخ کاربر`;
  return `${amount} در انتظار پاسخ پشتیبانی`;
}

function getUserLabel(user: { name: string | null; email: string; phone: string | null } | undefined, fallback: { name: string; email?: string | null; mobile?: string | null }) {
  return {
    name: user?.name || fallback.name,
    email: user?.email ?? fallback.email ?? null,
    mobile: user?.phone ?? fallback.mobile ?? null,
  };
}

function buildBaseWhere(params: AdminSupportListParams) {
  const q = normalizeSearchParam(params.q);
  return {
    ...(params.status && params.status !== "all" ? { status: params.status } : {}),
    ...(params.priority && params.priority !== "all" ? { priority: params.priority } : {}),
    ...(params.category && params.category !== "all" ? { category: params.category } : {}),
    ...(params.tenantId ? { tenantId: params.tenantId } : {}),
    ...(params.userId ? { createdByUserId: params.userId } : {}),
    ...(q
      ? {
          OR: [
            { ticketNumber: { contains: q, mode: "insensitive" as const } },
            { title: { contains: q, mode: "insensitive" as const } },
            { subject: { contains: q, mode: "insensitive" as const } },
            { category: { contains: q, mode: "insensitive" as const } },
            { tenant: { is: { name: { contains: q, mode: "insensitive" as const } } } },
            { tenant: { is: { owner: { is: { name: { contains: q, mode: "insensitive" as const } } } } } },
            { tenant: { is: { owner: { is: { email: { contains: q, mode: "insensitive" as const } } } } } },
            { tenant: { is: { owner: { is: { phone: { contains: q, mode: "insensitive" as const } } } } } },
            { tenant: { is: { hallProfile: { is: { brandName: { contains: q, mode: "insensitive" as const } } } } } },
            { messages: { some: { body: { contains: q, mode: "insensitive" as const }, senderType: { not: "INTERNAL_NOTE" } } } },
          ],
        }
      : {}),
  };
}

type RawTicket = Awaited<ReturnType<typeof getRawTickets>>[number];

async function getRawTickets(where: ReturnType<typeof buildBaseWhere>) {
  const db = await getPrisma();
  return db.supportTicket.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    include: {
      tenant: {
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
          hallProfile: { select: { brandName: true, phone: true, mobile: true } },
          subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, senderType: true, senderUserId: true, body: true, createdAt: true },
      },
      attachments: { select: { id: true } },
    },
  });
}

async function enrichTickets(rawTickets: RawTicket[]): Promise<AdminSupportTicketListItem[]> {
  const db = await getPrisma();
  const userIds = Array.from(new Set(rawTickets.flatMap((ticket) => [ticket.createdByUserId, ...ticket.messages.map((message) => message.senderUserId)].filter((id): id is string => Boolean(id)))));
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));

  return rawTickets.map((ticket) => {
    const visibleMessages = ticket.messages.filter((message) => message.senderType !== "INTERNAL_NOTE");
    const supportMessages = ticket.messages.filter((message) => message.senderType === "SUPPORT");
    const lastVisibleMessage = visibleMessages.at(-1) ?? null;
    const firstSupportReplyAt = supportMessages[0]?.createdAt ?? null;
    const lastSupportReplyAt = supportMessages.at(-1)?.createdAt ?? null;
    const operational = getTicketOperationalState({
      status: ticket.status,
      lastSenderType: lastVisibleMessage?.senderType ?? null,
      firstSupportReplyAt,
    });
    const waitingSince = ticket.status === "CLOSED" ? ticket.closedAt : lastVisibleMessage?.createdAt ?? ticket.createdAt;
    const creator = getUserLabel(userById.get(ticket.createdByUserId ?? ""), {
      name: ticket.tenant.owner.name || ticket.tenant.owner.email,
      email: ticket.tenant.owner.email,
      mobile: ticket.tenant.owner.phone ?? ticket.tenant.hallProfile?.mobile ?? ticket.tenant.hallProfile?.phone,
    });
    const subscription = getSubscriptionLabel(ticket.tenant.subscription);

    return {
      id: ticket.id,
      tenantId: ticket.tenantId,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      category: ticket.category,
      categoryLabel: mapTicketCategoryToPersian(ticket.category),
      priority: ticket.priority,
      priorityLabel: mapTicketPriorityToPersian(ticket.priority),
      priorityTone: getPriorityTone(ticket.priority),
      status: ticket.status,
      statusLabel: mapTicketStatusToPersian(ticket.status),
      statusTone: getStatusTone(ticket.status),
      operationalState: operational.state,
      operationalLabel: operational.label,
      operationalTone: operational.tone,
      hallName: ticket.tenant.hallProfile?.brandName || ticket.tenant.name,
      ownerName: ticket.tenant.owner.name || ticket.tenant.owner.email,
      ownerEmail: ticket.tenant.owner.email,
      ownerMobile: ticket.tenant.owner.phone ?? ticket.tenant.hallProfile?.mobile ?? ticket.tenant.hallProfile?.phone ?? null,
      createdByUserId: ticket.createdByUserId,
      createdByName: creator.name,
      createdByEmail: creator.email,
      createdByMobile: creator.mobile,
      subscriptionLabel: subscription.label,
      subscriptionTone: subscription.tone,
      createdAt: ticket.createdAt,
      lastMessageAt: ticket.lastMessageAt,
      closedAt: ticket.closedAt,
      lastMessagePreview: lastVisibleMessage?.body ?? "بدون پیام",
      lastSenderLabel: lastVisibleMessage?.senderType === "SUPPORT" ? "پشتیبانی" : lastVisibleMessage?.senderType === "SYSTEM" ? "سامانه" : "کاربر تالار",
      lastSenderType: lastVisibleMessage?.senderType ?? null,
      lastSupportReplyAt,
      firstSupportReplyAt,
      waitingSince,
      waitingMinutes: ticket.status === "CLOSED" ? null : minutesSince(waitingSince),
      messagesCount: visibleMessages.length,
      hasAttachments: ticket.attachments.length > 0,
      availableActions: {
        detailHref: `/admin/support/${ticket.id}`,
        hallHref: `/admin/tenants/${ticket.tenantId}`,
      },
    };
  });
}

function matchesTab(item: AdminSupportTicketListItem, tab: string, today: { start: Date; end: Date }) {
  if (!tab || tab === "all") return true;
  if (tab === "urgent") return item.priority === "URGENT" && item.status !== "CLOSED";
  if (tab === "open") return item.status !== "CLOSED";
  if (tab === "waiting-support") return item.operationalState === "waiting-support" || item.operationalState === "unanswered";
  if (tab === "waiting-user") return item.operationalState === "waiting-user";
  if (tab === "unanswered") return item.operationalState === "unanswered";
  if (tab === "today") return item.createdAt >= today.start && item.createdAt < today.end;
  if (tab === "closed") return item.status === "CLOSED";
  return true;
}

function matchesAdvancedFilters(item: AdminSupportTicketListItem, params: AdminSupportListParams) {
  const createdFrom = parseDay(params.createdFrom);
  const createdTo = endOfDay(parseDay(params.createdTo));
  const lastReplyFrom = parseDay(params.lastReplyFrom);
  const lastReplyTo = endOfDay(parseDay(params.lastReplyTo));

  if (createdFrom && item.createdAt < createdFrom) return false;
  if (createdTo && item.createdAt > createdTo) return false;
  if (lastReplyFrom && (!item.lastSupportReplyAt || item.lastSupportReplyAt < lastReplyFrom)) return false;
  if (lastReplyTo && (!item.lastSupportReplyAt || item.lastSupportReplyAt > lastReplyTo)) return false;
  if (params.unanswered === "yes" && item.firstSupportReplyAt) return false;
  if (params.unanswered === "no" && !item.firstSupportReplyAt) return false;
  if (params.attachments === "yes" && !item.hasAttachments) return false;
  if (params.attachments === "no" && item.hasAttachments) return false;
  if (params.subscription === "demo" && !item.subscriptionLabel.includes("دوره بررسی")) return false;
  if (params.subscription === "active" && !item.subscriptionLabel.includes("اشتراک فعال")) return false;
  if (params.subscription === "expired" && !item.subscriptionLabel.includes("منقضی")) return false;
  return true;
}

function sortTickets(items: AdminSupportTicketListItem[], sort: string | undefined) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "urgent") {
      const score = (item: AdminSupportTicketListItem) => (item.priority === "URGENT" ? 4 : item.priority === "HIGH" ? 3 : item.priority === "NORMAL" ? 2 : 1);
      return score(b) - score(a) || b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    }
    if (sort === "waiting") return (b.waitingMinutes ?? 0) - (a.waitingMinutes ?? 0);
    if (sort === "last-reply") return (b.lastSupportReplyAt?.getTime() ?? 0) - (a.lastSupportReplyAt?.getTime() ?? 0);
    if (sort === "waiting-support") {
      const score = (item: AdminSupportTicketListItem) => item.operationalState === "waiting-support" || item.operationalState === "unanswered" ? 1 : 0;
      return score(b) - score(a) || (b.waitingMinutes ?? 0) - (a.waitingMinutes ?? 0);
    }
    if (sort === "closed") return (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0);
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  return sorted;
}

export async function getAdminSupportPageData(params: AdminSupportListParams) {
  await requirePlatformAdmin();
  const where = buildBaseWhere(params);
  const rawTickets = await getRawTickets(where);
  const enriched = await enrichTickets(rawTickets);
  const today = getTodayRange();

  const tabCounts = {
    all: enriched.length,
    urgent: enriched.filter((item) => matchesTab(item, "urgent", today)).length,
    open: enriched.filter((item) => matchesTab(item, "open", today)).length,
    waitingSupport: enriched.filter((item) => matchesTab(item, "waiting-support", today)).length,
    waitingUser: enriched.filter((item) => matchesTab(item, "waiting-user", today)).length,
    unanswered: enriched.filter((item) => matchesTab(item, "unanswered", today)).length,
    today: enriched.filter((item) => matchesTab(item, "today", today)).length,
    closed: enriched.filter((item) => matchesTab(item, "closed", today)).length,
  };

  const responseTimes = enriched
    .filter((item) => item.firstSupportReplyAt)
    .map((item) => Math.max(0, Math.floor(((item.firstSupportReplyAt as Date).getTime() - item.createdAt.getTime()) / (60 * 1000))));
  const averageResponseMinutes = responseTimes.length
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
    : null;

  const filtered = sortTickets(
    enriched
      .filter((item) => matchesTab(item, params.tab ?? "all", today))
      .filter((item) => matchesAdvancedFilters(item, params)),
    params.sort,
  );
  const page = getPage(params.page);
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return {
    kpis: {
      totalTickets: enriched.length,
      openTickets: tabCounts.open,
      urgentTickets: tabCounts.urgent,
      waitingSupport: tabCounts.waitingSupport,
      waitingUser: tabCounts.waitingUser,
      closedTickets: tabCounts.closed,
      createdToday: tabCounts.today,
      unansweredTickets: tabCounts.unanswered,
      averageResponseMinutes,
    },
    tabCounts,
    tickets: filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    totalCount,
    page: currentPage,
    limit: PAGE_SIZE,
    totalPages,
    from: totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
    to: Math.min(currentPage * PAGE_SIZE, totalCount),
    currentFilters: {
      ...params,
      tab: params.tab ?? "all",
      view: params.view === "table" ? "table" : "cards",
      sort: params.sort ?? "waiting-support",
    },
    filterOptions: {
      statuses: Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
      priorities: ["LOW", "NORMAL", "HIGH", "URGENT"].map((value) => ({ value, label: priorityLabels[value] })),
      categories: Object.entries(categoryLabels).map(([value, label]) => ({ value, label })),
    },
  };
}

export function formatWaitingTime(minutes: number | null, state?: TicketOperationalState) {
  return buildWaitingLabel({ waitingMinutes: minutes, operationalState: state ?? "waiting-support" });
}

export async function getSupportKpis() {
  return (await getAdminSupportPageData({})).kpis;
}

export async function getAdminSupportTicketDetail(ticketId: string): Promise<AdminSupportTicketDetail | null> {
  await requirePlatformAdmin();

  const db = await getPrisma();
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      tenant: {
        include: {
          owner: { select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } },
          hallProfile: true,
          subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
          _count: { select: { contracts: true, supportTickets: true } },
        },
      },
      messages: { include: { attachments: true }, orderBy: { createdAt: "asc" } },
      attachments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!ticket) return null;

  const [enriched] = await enrichTickets([ticket]);
  const senderIds = Array.from(new Set([ticket.createdByUserId, ...ticket.messages.map((message) => message.senderUserId)].filter((id): id is string => Boolean(id))));
  const [users, paymentSum, openTicketsCount, previousTickets, contractLast] = await Promise.all([
    senderIds.length
      ? db.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true, email: true, phone: true, lastLoginAt: true } })
      : [],
    db.payment.aggregate({ _sum: { amount: true }, where: { tenantId: ticket.tenantId, status: { notIn: ["CANCELED", "VOID"] } } }),
    db.supportTicket.count({ where: { tenantId: ticket.tenantId, status: { not: "CLOSED" } } }),
    db.supportTicket.findMany({
      where: { tenantId: ticket.tenantId, id: { not: ticket.id } },
      take: 3,
      orderBy: { createdAt: "desc" },
      select: { id: true, ticketNumber: true, title: true, status: true, createdAt: true },
    }),
    db.contract.aggregate({ _max: { createdAt: true }, where: { tenantId: ticket.tenantId } }),
  ]);

  const userById = new Map(users.map((user) => [user.id, user]));
  const createdBy = getUserLabel(userById.get(ticket.createdByUserId ?? ""), {
    name: ticket.tenant.owner.name || ticket.tenant.owner.email,
    email: ticket.tenant.owner.email,
    mobile: ticket.tenant.owner.phone ?? ticket.tenant.hallProfile?.mobile ?? ticket.tenant.hallProfile?.phone,
  });
  const subscription = getSubscriptionLabel(ticket.tenant.subscription);

  const messages: AdminSupportMessageItem[] = ticket.messages.map((message) => {
    const sender = message.senderUserId ? userById.get(message.senderUserId) : undefined;
    const isInternal = message.senderType === "INTERNAL_NOTE";
    const isSupport = message.senderType === "SUPPORT";
    const isSystem = message.senderType === "SYSTEM";
    return {
      id: message.id,
      senderType: message.senderType,
      senderLabel: isInternal ? "یادداشت داخلی" : isSupport ? "پشتیبانی" : isSystem ? "سامانه" : "کاربر تالار",
      senderName: sender?.name || sender?.email || (isSupport || isInternal || isSystem ? "پشتیبانی سامانه" : createdBy.name),
      senderRole: isInternal ? "فقط برای پشتیبانی قابل مشاهده است." : isSupport ? "تیم پشتیبانی" : isSystem ? "رویداد سیستمی" : "کاربر تالار",
      tone: isInternal ? "amber" : isSupport ? "emerald" : isSystem ? "navy" : "slate",
      body: message.body,
      createdAt: message.createdAt,
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        sizeBytes: attachment.sizeBytes,
      })),
    };
  });

  const timeline: AdminSupportTimelineItem[] = [
    { id: `${ticket.id}-created`, label: "تیکت ثبت شد", actor: createdBy.name, at: ticket.createdAt, tone: "navy" as AdminSupportTone, description: ticket.title },
    ...messages.map((message) => ({
      id: message.id,
      label: message.senderType === "SUPPORT" ? "پشتیبانی پاسخ داد" : message.senderType === "INTERNAL_NOTE" ? "یادداشت داخلی ثبت شد" : message.senderType === "SYSTEM" ? "وضعیت تیکت به‌روزرسانی شد" : "کاربر پیام داد",
      actor: message.senderName,
      at: message.createdAt,
      tone: message.tone,
      description: message.senderType === "INTERNAL_NOTE" ? "فقط برای پشتیبانی" : undefined,
    })),
    ...(ticket.closedAt ? [{ id: `${ticket.id}-closed`, label: "تیکت بسته شد", actor: "پشتیبانی سامانه", at: ticket.closedAt, tone: "slate" as AdminSupportTone }] : []),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    ticket: {
      ...enriched,
      subject: ticket.subject,
      description: ticket.messages.find((message) => message.senderType === "USER")?.body ?? ticket.title,
    },
    messages,
    timeline,
    relatedHall: {
      id: ticket.tenantId,
      name: enriched.hallName,
      ownerName: enriched.ownerName,
      ownerEmail: enriched.ownerEmail,
      ownerMobile: enriched.ownerMobile,
      subscriptionLabel: subscription.label,
      subscriptionTone: subscription.tone,
      periodEnd: subscription.periodEnd,
      openTicketsCount,
      totalTicketsCount: ticket.tenant._count.supportTickets,
      lastActivityAt: latestDate(ticket.tenant.owner.lastLoginAt, contractLast._max.createdAt, enriched.lastMessageAt),
      contractsCount: ticket.tenant._count.contracts,
      receiptsTotal: decimalToNumber(paymentSum._sum.amount),
      detailHref: `/admin/tenants/${ticket.tenantId}`,
      supportHref: `/admin/support?tenantId=${ticket.tenantId}`,
    },
    createdByUser: {
      id: ticket.createdByUserId,
      name: createdBy.name,
      email: createdBy.email,
      mobile: createdBy.mobile,
      role: "کاربر تالار",
      lastLoginAt: ticket.createdByUserId ? userById.get(ticket.createdByUserId)?.lastLoginAt ?? null : ticket.tenant.owner.lastLoginAt,
      href: ticket.createdByUserId ? `/admin/users/${ticket.createdByUserId}` : null,
    },
    previousTickets: previousTickets.map((previous) => ({
      id: previous.id,
      ticketNumber: previous.ticketNumber,
      title: previous.title,
      statusLabel: mapTicketStatusToPersian(previous.status),
      statusTone: getStatusTone(previous.status),
      createdAt: previous.createdAt,
      href: `/admin/support/${previous.id}`,
    })),
  };
}
