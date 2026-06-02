import "server-only";

import type { Prisma } from "@prisma/client";
import { requireTenantRole } from "@/lib/auth/session";
import { getTodayJalali, jalaliToDate, toLatinDigits } from "@/lib/date/jalali";
import { getPrisma } from "@/lib/prisma";
import { toNumber } from "@/lib/owner-settlements/rules";

export type OwnerControlSeverity = "OK" | "WARNING" | "CRITICAL";

export type OwnerControlAlert = {
  key: string;
  title: string;
  message: string;
  count: number;
  severity: OwnerControlSeverity;
  href: string;
  ownerOnly?: boolean;
};

export type OwnerControlFilters = {
  year?: number;
  month?: number;
  hallId?: string;
  agreementId?: string;
  status?: string;
  query?: string;
};

type CancellationAndLateReportRow = Prisma.PostEventDecisionGetPayload<{
  include: {
    contract: {
      include: {
        customer: {
          select: { fullName: true };
        };
      };
    };
  };
}>;

function todayStart() {
  const today = getTodayJalali();
  return jalaliToDate(today.year, today.month, today.day);
}

function parseNumber(value: string | null | undefined) {
  if (!value) return undefined;
  const parsed = Number(toLatinDigits(value));
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function parseOwnerControlFilters(input: Record<string, string | undefined> | URLSearchParams): OwnerControlFilters {
  const get = (key: string) => input instanceof URLSearchParams ? input.get(key) ?? undefined : input[key];
  const year = parseNumber(get("year"));
  const month = parseNumber(get("month"));
  const hallId = get("hallId");
  const agreementId = get("agreementId");
  const status = get("status");
  const query = get("q")?.trim();

  return {
    year,
    month,
    hallId: hallId && hallId !== "all" ? hallId : undefined,
    agreementId: agreementId && agreementId !== "all" ? agreementId : undefined,
    status: status && status !== "all" ? status : undefined,
    query: query || undefined,
  };
}

function monthWhere(filters: OwnerControlFilters) {
  if (!filters.year || !filters.month) return {};
  return { settlementYear: filters.year, settlementMonth: filters.month };
}

function settlementWhere(tenantId: string, filters: OwnerControlFilters) {
  return {
    tenantId,
    ...monthWhere(filters),
    ...(filters.hallId ? { hallId: filters.hallId } : {}),
    ...(filters.agreementId ? { operationAgreementId: filters.agreementId } : {}),
    ...(filters.status ? { status: filters.status as never } : {}),
  };
}

export async function getOwnerControlDashboardData(filters: OwnerControlFilters = {}) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const nowStart = todayStart();

  const [
    halls,
    agreements,
    unresolvedPastEvents,
    heldWithoutInvoice,
    draftInvoices,
    issuedInvoices,
    waitingCustomerResponse,
    offInvoiceReports,
    ownerReviewReports,
    lateRescheduleReviews,
    openSettlements,
    payableSettlements,
    lockedSettlements,
    ownerShareRows,
  ] = await Promise.all([
    db.hall.findMany({ where: { tenantId: membership.tenantId, isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.hallOperationAgreement.findMany({
      where: { tenantId: membership.tenantId, status: "ACTIVE" },
      select: { id: true, agreementTitle: true, ownerName: true, operatorName: true, operationModel: true, hall: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.contract.count({
      where: {
        tenantId: membership.tenantId,
        status: { not: "CANCELED" },
        eventDate: { lt: nowStart },
        postEventDecision: null,
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
      },
    }),
    db.contract.count({
      where: {
        tenantId: membership.tenantId,
        status: { not: "CANCELED" },
        eventDate: { lt: nowStart },
        postEventDecision: { decisionStatus: "HELD" },
        postEventInvoice: null,
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
      },
    }),
    db.postEventInvoice.count({ where: { tenantId: membership.tenantId, status: "DRAFT", ...(filters.hallId ? { hallId: filters.hallId } : {}) } }),
    db.postEventInvoice.count({ where: { tenantId: membership.tenantId, status: "ISSUED", ...(filters.hallId ? { hallId: filters.hallId } : {}) } }),
    db.postEventInvoice.count({
      where: {
        tenantId: membership.tenantId,
        status: "ISSUED",
        customerFeedbacks: { none: {} },
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
      },
    }),
    db.postEventInvoiceOffInvoiceReport.count({ where: { tenantId: membership.tenantId } }),
    db.postEventInvoiceOffInvoiceReport.count({
      where: { tenantId: membership.tenantId, ownerReviewStatus: { in: ["REPORTED", "OWNER_REVIEW_REQUIRED"] } },
    }),
    db.postEventDecision.count({
      where: { tenantId: membership.tenantId, requiresOwnerReview: true, isLateReschedule: true },
    }),
    db.ownerMonthlySettlement.count({
      where: { tenantId: membership.tenantId, status: { in: ["DRAFT", "CALCULATED", "PAYMENT_PENDING", "PARTIALLY_PAID", "PAID"] } },
    }),
    db.ownerMonthlySettlement.findMany({
      where: { tenantId: membership.tenantId, status: { in: ["PAYMENT_PENDING", "PARTIALLY_PAID"] } },
      select: { remainingPayableAmount: true },
      take: 500,
    }),
    db.ownerMonthlySettlement.count({ where: { tenantId: membership.tenantId, status: "LOCKED" } }),
    db.ownerMonthlySettlement.findMany({
      where: settlementWhere(membership.tenantId, filters),
      select: {
        id: true,
        settlementYear: true,
        settlementMonth: true,
        operationModelSnapshot: true,
        eventInvoiceBaseAmount: true,
        eventInvoiceOwnerShareAmount: true,
        cancellationBaseAmount: true,
        cancellationOwnerShareAmount: true,
        extraServiceBaseAmount: true,
        extraServiceOwnerShareAmount: true,
        approvedOffInvoiceBaseAmount: true,
        approvedOffInvoiceOwnerShareAmount: true,
        calculatedOwnerShareAmount: true,
        monthlyMinimumGuaranteeAmountSnapshot: true,
        guaranteeShortfallAmount: true,
        fixedRentAmount: true,
        finalPayableToOwnerAmount: true,
        paidToOwnerAmount: true,
        remainingPayableAmount: true,
        status: true,
        lockedAt: true,
        hall: { select: { name: true } },
        operationAgreement: { select: { agreementTitle: true, ownerName: true, operatorName: true } },
      },
      orderBy: [{ settlementYear: "desc" }, { settlementMonth: "desc" }],
      take: 80,
    }),
  ]);

  const payableAmount = payableSettlements.reduce((sum: number, settlement: { remainingPayableAmount: unknown }) => sum + Math.max(0, toNumber(settlement.remainingPayableAmount)), 0);
  const alerts: OwnerControlAlert[] = [
    {
      key: "past-event-unresolved",
      title: "مراسم گذشته بدون تعیین تکلیف",
      message: "مراسم‌هایی وجود دارد که بعد از تاریخ مراسم هنوز وضعیت برگزار شدن، کنسلی یا انتقال آن‌ها ثبت نشده است.",
      count: unresolvedPastEvents,
      severity: unresolvedPastEvents > 0 ? "CRITICAL" : "OK",
      href: "/dashboard/post-event-decisions",
    },
    {
      key: "held-without-invoice",
      title: "مراسم برگزارشده بدون صورتحساب",
      message: "برای مراسم‌های برگزارشده باید صورتحساب بعد از مراسم صادر شود.",
      count: heldWithoutInvoice,
      severity: heldWithoutInvoice > 0 ? "WARNING" : "OK",
      href: "/dashboard/post-event-invoices",
    },
    {
      key: "invoice-waiting-customer",
      title: "صورتحساب در انتظار پاسخ مشتری",
      message: "لینک مشتری یا پاسخ بررسی صورتحساب هنوز کامل نشده است.",
      count: waitingCustomerResponse,
      severity: waitingCustomerResponse > 0 ? "WARNING" : "OK",
      href: "/dashboard/post-event-invoices",
    },
    {
      key: "off-invoice-owner-review",
      title: "گزارش پرداخت خارج از صورتحساب ثبت شد",
      message: "این گزارش‌ها محرمانه‌اند و برای بررسی مالک/مدیریت اصلی نمایش داده می‌شوند.",
      count: ownerReviewReports,
      severity: ownerReviewReports > 0 ? "CRITICAL" : "OK",
      href: "/dashboard/reports/off-invoice",
      ownerOnly: true,
    },
    {
      key: "late-reschedule-review",
      title: "انتقال دیرهنگام نیازمند بررسی مالک",
      message: "انتقال‌های دیرهنگام نباید مثل انتقال عادی در نظر گرفته شوند.",
      count: lateRescheduleReviews,
      severity: lateRescheduleReviews > 0 ? "WARNING" : "OK",
      href: "/dashboard/post-event-decisions",
      ownerOnly: true,
    },
    {
      key: "settlement-ready",
      title: "تسویه ماهانه آماده بررسی است",
      message: "تسویه‌های باز نیازمند بررسی، پرداخت یا قفل نهایی هستند.",
      count: openSettlements,
      severity: openSettlements > 0 ? "WARNING" : "OK",
      href: "/dashboard/owner-settlements",
    },
    {
      key: "settlement-unpaid",
      title: "مانده تسویه مالک پرداخت نشده است",
      message: "تسویه‌هایی با مانده قابل پرداخت وجود دارد.",
      count: payableSettlements.length,
      severity: payableSettlements.length > 0 ? "CRITICAL" : "OK",
      href: "/dashboard/owner-settlements",
    },
    {
      key: "settlement-locked",
      title: "تسویه ماهانه قفل شد",
      message: "تسویه‌های قفل‌شده فقط در گزارش قفل مالی و مشاهده جزئیات قابل پیگیری هستند.",
      count: lockedSettlements,
      severity: "OK",
      href: "/dashboard/owner-control/reports?report=financialLock",
    },
  ];

  return {
    membership,
    filters,
    halls,
    agreements,
    counters: {
      unresolvedPastEvents,
      heldWithoutInvoice,
      draftInvoices,
      issuedInvoices,
      waitingCustomerResponse,
      offInvoiceReports,
      ownerReviewReports,
      lateRescheduleReviews,
      openSettlements,
      payableSettlementCount: payableSettlements.length,
      payableAmount,
      lockedSettlements,
    },
    alerts,
    ownerShareRows,
  };
}

export async function getOwnerControlReportsData(filters: OwnerControlFilters = {}) {
  const data = await getOwnerControlDashboardData(filters);
  const db = await getPrisma();
  const query = filters.query;

  const [invoices, offInvoiceReports, cancellationAndLateRows, lockEntries] = await Promise.all([
    db.postEventInvoice.findMany({
      where: {
        tenantId: data.membership.tenantId,
        status: "ISSUED",
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
        ...(query ? {
          OR: [
            { invoiceNumber: { contains: query, mode: "insensitive" } },
            { contract: { contractNo: { contains: query, mode: "insensitive" } } },
            { contract: { customer: { fullName: { contains: query, mode: "insensitive" } } } },
          ],
        } : {}),
      },
      include: {
        contract: { include: { customer: { select: { fullName: true } }, hall: { select: { name: true } } } },
        customerFeedbacks: { orderBy: { submittedAt: "desc" }, take: 1 },
        offInvoiceReports: { select: { ownerReviewStatus: true } },
        ownerMonthlySettlementEntries: { include: { settlement: { select: { id: true, settlementYear: true, settlementMonth: true, status: true } } } },
      },
      orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
      take: 120,
    }),
    db.postEventInvoiceOffInvoiceReport.findMany({
      where: {
        tenantId: data.membership.tenantId,
        ...(filters.status ? { ownerReviewStatus: filters.status as never } : {}),
        ...(query ? {
          OR: [
            { serviceTitle: { contains: query, mode: "insensitive" } },
            { paidToName: { contains: query, mode: "insensitive" } },
            { contract: { contractNo: { contains: query, mode: "insensitive" } } },
            { contract: { customer: { fullName: { contains: query, mode: "insensitive" } } } },
          ],
        } : {}),
      },
      include: {
        contract: { include: { customer: { select: { fullName: true } } } },
        invoice: { select: { invoiceNumber: true, issuedAt: true } },
        ownerMonthlySettlementEntries: { include: { settlement: { select: { id: true, settlementYear: true, settlementMonth: true, status: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    db.postEventDecision.findMany({
      where: {
        tenantId: data.membership.tenantId,
        AND: [
          { OR: [{ decisionStatus: "NOT_HELD_CANCELLATION" }, { isLateReschedule: true }, { requiresOwnerReview: true }] },
          ...(query ? [{ OR: [
            { contract: { contractNo: { contains: query, mode: "insensitive" } } },
            { contract: { customer: { fullName: { contains: query, mode: "insensitive" } } } },
          ] }] : []),
        ],
        ...(filters.hallId ? { hallId: filters.hallId } : {}),
      },
      include: {
        contract: { include: { customer: { select: { fullName: true } } } },
      },
      orderBy: [{ decidedAt: "desc" }],
      take: 120,
    }),
    db.ownerMonthlySettlementEntry.findMany({
      where: {
        tenantId: data.membership.tenantId,
        settlement: { status: "LOCKED" },
      },
      include: {
        settlement: { select: { id: true, settlementYear: true, settlementMonth: true, lockedAt: true, lockedByUserId: true, status: true } },
        invoice: { select: { invoiceNumber: true } },
        contract: { select: { contractNo: true, customer: { select: { fullName: true } } } },
        offInvoiceReport: { select: { serviceTitle: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  const cancellationAndLateRowsForReport = cancellationAndLateRows as CancellationAndLateReportRow[];

  return { ...data, invoices, offInvoiceReports, cancellationAndLateRows: cancellationAndLateRowsForReport, lockEntries };
}

export async function getCommercialReadinessData() {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const db = await getPrisma();
  const [hallProfile, activeHalls, activeAgreements] = await Promise.all([
    db.tenantHallProfile.findUnique({ where: { tenantId: membership.tenantId } }),
    db.hall.count({ where: { tenantId: membership.tenantId, isActive: true } }),
    db.hallOperationAgreement.findMany({ where: { tenantId: membership.tenantId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } }),
  ]);

  const mainAgreement = activeAgreements[0] ?? null;
  const needsFixedOrGuarantee = mainAgreement?.operationModel === "FIXED_RENT" || mainAgreement?.operationModel === "FIXED_RENT_PLUS_PERCENTAGE" || mainAgreement?.operationModel === "GUARANTEED_PERCENTAGE_MANAGEMENT";
  const hasFixedOrGuarantee = !needsFixedOrGuarantee || toNumber(mainAgreement?.monthlyFixedRentAmount) > 0 || toNumber(mainAgreement?.monthlyMinimumGuaranteeAmount) > 0;

  const items = [
    { key: "hall-profile", title: "مشخصات تالار تکمیل شده است", status: hallProfile?.brandName && (hallProfile.phone || hallProfile.mobile) ? "ready" : "missing" },
    { key: "hall-active", title: "حداقل یک تالار فعال تعریف شده است", status: activeHalls > 0 ? "ready" : "missing" },
    { key: "operation-model", title: "مدل بهره‌برداری تالار ثبت شده است", status: mainAgreement ? "ready" : "missing" },
    { key: "event-share", title: "درصد سهم مالک از مراسم‌ها مشخص است", status: mainAgreement?.operationModel === "OWNER_DIRECT" || mainAgreement?.operationModel === "FIXED_RENT" || toNumber(mainAgreement?.ownerEventSharePercent) > 0 ? "ready" : "missing" },
    { key: "cancellation-share", title: "سهم مالک از کنسلی‌ها مشخص است", status: toNumber(mainAgreement?.ownerCancellationSharePercent) > 0 ? "ready" : "review" },
    { key: "fixed-guarantee", title: "حداقل تضمین یا اجاره ثابت در صورت نیاز ثبت شده است", status: hasFixedOrGuarantee ? "ready" : "missing" },
    { key: "extra-policy", title: "سیاست خدمات اضافه مشخص است", status: mainAgreement ? "ready" : "missing" },
    { key: "off-invoice-policy", title: "سیاست پرداخت خارج از فاکتور مشخص است", status: mainAgreement ? "ready" : "missing" },
    { key: "post-event-decision", title: "مسیر تعیین تکلیف بعد از مراسم فعال است", status: "ready" },
    { key: "post-event-invoice", title: "مسیر صدور صورتحساب بعد از مراسم فعال است", status: "ready" },
    { key: "customer-link", title: "لینک مشتری برای بررسی صورتحساب فعال است", status: "ready" },
    { key: "off-invoice-report", title: "گزارش پرداخت خارج از فاکتور فعال است", status: "ready" },
    { key: "owner-settlement", title: "تسویه ماهانه مالک فعال است", status: mainAgreement ? "ready" : "missing" },
    { key: "owner-reports", title: "گزارش‌های مالک فعال هستند", status: "ready" },
  ] as Array<{ key: string; title: string; status: "ready" | "missing" | "review" }>;

  return { membership, activeAgreements, items };
}

export async function getOwnerWorkflowHealthData() {
  const dashboard = await getOwnerControlDashboardData();
  const db = await getPrisma();
  const tenantId = dashboard.membership.tenantId;

  const [issuedWithoutLink, pendingApprovedOffInvoiceReports, missingAgreementValues] = await Promise.all([
    db.postEventInvoice.count({ where: { tenantId, status: "ISSUED", accessLinks: { none: {} } } }),
    db.postEventInvoiceOffInvoiceReport.count({
      where: {
        tenantId,
        ownerReviewStatus: "CONFIRMED_OFF_INVOICE",
        ownerMonthlySettlementEntries: { none: {} },
      },
    }),
    db.hallOperationAgreement.count({
      where: {
        tenantId,
        status: "ACTIVE",
        OR: [
          { ownerEventSharePercent: null },
          { operationModel: "FIXED_RENT", monthlyFixedRentAmount: null },
          { operationModel: "GUARANTEED_PERCENTAGE_MANAGEMENT", monthlyMinimumGuaranteeAmount: null },
        ],
      },
    }),
  ]);

  const items = [
    { key: "past-no-decision", title: "قراردادهای گذشته بدون تعیین تکلیف", count: dashboard.counters.unresolvedPastEvents, severity: dashboard.counters.unresolvedPastEvents > 0 ? "CRITICAL" : "OK" },
    { key: "held-no-invoice", title: "مراسم‌های برگزارشده بدون صورتحساب", count: dashboard.counters.heldWithoutInvoice, severity: dashboard.counters.heldWithoutInvoice > 0 ? "WARNING" : "OK" },
    { key: "issued-no-link", title: "صورتحساب‌های صادرشده بدون لینک مشتری", count: issuedWithoutLink, severity: issuedWithoutLink > 0 ? "WARNING" : "OK" },
    { key: "pending-owner-review", title: "گزارش‌های خارج از فاکتور نیازمند بررسی مالک", count: dashboard.counters.ownerReviewReports, severity: dashboard.counters.ownerReviewReports > 0 ? "CRITICAL" : "OK" },
    { key: "approved-not-settled", title: "گزارش‌های تأییدشده خارج از فاکتور که در تسویه نیامده‌اند", count: pendingApprovedOffInvoiceReports, severity: pendingApprovedOffInvoiceReports > 0 ? "WARNING" : "OK" },
    { key: "settlement-payable", title: "تسویه‌های دارای مانده قابل پرداخت", count: dashboard.counters.payableSettlementCount, severity: dashboard.counters.payableSettlementCount > 0 ? "WARNING" : "OK" },
    { key: "locked", title: "تسویه‌های قفل‌شده و محافظت‌شده", count: dashboard.counters.lockedSettlements, severity: "OK" },
    { key: "agreement-missing-values", title: "مدل‌های بهره‌برداری با مقادیر ناقص", count: missingAgreementValues, severity: missingAgreementValues > 0 ? "WARNING" : "OK" },
  ] as Array<{ key: string; title: string; count: number; severity: OwnerControlSeverity }>;

  return { ...dashboard, healthItems: items };
}
