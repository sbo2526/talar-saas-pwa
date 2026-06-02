import { csvEscape } from "@/lib/backups/csv";
import { createAttachmentHeaders } from "@/lib/backups/export-service";
import { createAuditLog } from "@/lib/audit/audit-log-service";
import { getAuditActorName } from "@/lib/audit/audit-log-messages";
import { formatJalaliDateTime, toPersianDigits } from "@/lib/date/jalali";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import { ownerOperationModelLabels } from "@/lib/owner-operation/owner-operation-settings";
import { ownerSettlementStatusLabels } from "@/lib/owner-settlements/owner-monthly-settlement";
import { getPrisma } from "@/lib/prisma";

type Actor = {
  userId: string;
  user?: { name?: string | null; email?: string | null } | null;
};

type SnapshotInvoiceRow = {
  invoiceId: string;
  invoiceNo: string;
  invoiceStatus?: string;
  contractId: string;
  contractNo: string;
  customerName: string;
  eventDateLabel: string;
  invoiceTotal: number;
  extraServicesTotal: number;
};

type SnapshotCancellationRow = {
  contractId: string;
  contractNo: string;
  contractStatus?: string;
  customerName: string;
  eventDateLabel: string;
  penaltyPercent: number;
  penaltyAmount: number;
  ownerAuditWarning?: string;
};

type OwnerSettlementSnapshot = {
  taskId?: string;
  period?: {
    year?: number;
    month?: number;
    label?: string;
    startDate?: string;
    endDateExclusive?: string;
  };
  setting?: {
    id?: string;
    operationModel?: string;
    ownerRevenueSharePercent?: string;
    ownerCancellationSharePercent?: string;
    monthlyMinimumGuarantee?: string;
    settlementCycle?: string;
  };
  invoiceRows?: SnapshotInvoiceRow[];
  cancellationRows?: SnapshotCancellationRow[];
  auditNotes?: string[];
};

export type OwnerSettlementExportData = {
  id: string;
  periodYear: number;
  periodMonth: number;
  periodLabel: string;
  status: string;
  statusLabel: string;
  operationModel: string;
  operationModelLabel: string;
  ownerRevenueSharePercent: string;
  ownerCancellationSharePercent: string;
  monthlyMinimumGuarantee: string;
  heldEventsCount: number;
  canceledEventsCount: number;
  invoiceTotal: string;
  extraServicesTotal: string;
  cancellationIncomeTotal: string;
  ownerEventShare: string;
  ownerCancellationShare: string;
  calculatedOwnerShare: string;
  minimumGuaranteeApplied: boolean;
  minimumGuaranteeShortfall: string;
  finalOwnerPayable: string;
  generatedAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  snapshot: OwnerSettlementSnapshot;
  invoiceRows: SnapshotInvoiceRow[];
  cancellationRows: SnapshotCancellationRow[];
  auditNotes: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeInvoiceRows(value: unknown): SnapshotInvoiceRow[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((row) => ({
    invoiceId: readString(row.invoiceId) ?? "",
    invoiceNo: readString(row.invoiceNo) ?? "",
    invoiceStatus: readString(row.invoiceStatus),
    contractId: readString(row.contractId) ?? "",
    contractNo: readString(row.contractNo) ?? "",
    customerName: readString(row.customerName) ?? "—",
    eventDateLabel: readString(row.eventDateLabel) ?? "—",
    invoiceTotal: readNumber(row.invoiceTotal),
    extraServicesTotal: readNumber(row.extraServicesTotal),
  }));
}

function normalizeCancellationRows(value: unknown): SnapshotCancellationRow[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((row) => ({
    contractId: readString(row.contractId) ?? "",
    contractNo: readString(row.contractNo) ?? "",
    contractStatus: readString(row.contractStatus),
    customerName: readString(row.customerName) ?? "—",
    eventDateLabel: readString(row.eventDateLabel) ?? "—",
    penaltyPercent: readNumber(row.penaltyPercent),
    penaltyAmount: readNumber(row.penaltyAmount),
    ownerAuditWarning: readString(row.ownerAuditWarning),
  }));
}

export function normalizeOwnerSettlementSnapshot(value: unknown): OwnerSettlementSnapshot {
  if (!isRecord(value)) {
    return { invoiceRows: [], cancellationRows: [], auditNotes: [] };
  }

  const rawPeriod = isRecord(value.period) ? value.period : {};
  const rawSetting = isRecord(value.setting) ? value.setting : {};

  return {
    taskId: readString(value.taskId),
    period: {
      year: readNumber(rawPeriod.year),
      month: readNumber(rawPeriod.month),
      label: readString(rawPeriod.label),
      startDate: readString(rawPeriod.startDate),
      endDateExclusive: readString(rawPeriod.endDateExclusive),
    },
    setting: {
      id: readString(rawSetting.id),
      operationModel: readString(rawSetting.operationModel),
      ownerRevenueSharePercent: readString(rawSetting.ownerRevenueSharePercent),
      ownerCancellationSharePercent: readString(rawSetting.ownerCancellationSharePercent),
      monthlyMinimumGuarantee: readString(rawSetting.monthlyMinimumGuarantee),
      settlementCycle: readString(rawSetting.settlementCycle),
    },
    invoiceRows: normalizeInvoiceRows(value.invoiceRows),
    cancellationRows: normalizeCancellationRows(value.cancellationRows),
    auditNotes: Array.isArray(value.auditNotes) ? value.auditNotes.filter((note): note is string => typeof note === "string") : [],
  };
}

export async function getOwnerSettlementExportData(input: {
  tenantId: string;
  settlementId: string;
}): Promise<OwnerSettlementExportData | null> {
  const db = await getPrisma();
  const settlement = await db.ownerMonthlySettlement.findFirst({
    where: { id: input.settlementId, tenantId: input.tenantId },
  });

  if (!settlement) return null;

  const snapshot = normalizeOwnerSettlementSnapshot(settlement.snapshot);
  const operationModel = settlement.operationModel;
  const status = settlement.status;

  return {
    id: settlement.id,
    periodYear: settlement.periodYear,
    periodMonth: settlement.periodMonth,
    periodLabel: settlement.periodLabel,
    status,
    statusLabel: ownerSettlementStatusLabels[status as keyof typeof ownerSettlementStatusLabels] ?? status,
    operationModel,
    operationModelLabel: ownerOperationModelLabels[operationModel as keyof typeof ownerOperationModelLabels] ?? operationModel,
    ownerRevenueSharePercent: settlement.ownerRevenueSharePercent.toString(),
    ownerCancellationSharePercent: settlement.ownerCancellationSharePercent.toString(),
    monthlyMinimumGuarantee: settlement.monthlyMinimumGuarantee.toString(),
    heldEventsCount: settlement.heldEventsCount,
    canceledEventsCount: settlement.canceledEventsCount,
    invoiceTotal: settlement.invoiceTotal.toString(),
    extraServicesTotal: settlement.extraServicesTotal.toString(),
    cancellationIncomeTotal: settlement.cancellationIncomeTotal.toString(),
    ownerEventShare: settlement.ownerEventShare.toString(),
    ownerCancellationShare: settlement.ownerCancellationShare.toString(),
    calculatedOwnerShare: settlement.calculatedOwnerShare.toString(),
    minimumGuaranteeApplied: settlement.minimumGuaranteeApplied,
    minimumGuaranteeShortfall: settlement.minimumGuaranteeShortfall.toString(),
    finalOwnerPayable: settlement.finalOwnerPayable.toString(),
    generatedAt: settlement.generatedAt.toISOString(),
    approvedAt: settlement.approvedAt?.toISOString() ?? null,
    paidAt: settlement.paidAt?.toISOString() ?? null,
    snapshot,
    invoiceRows: snapshot.invoiceRows ?? [],
    cancellationRows: snapshot.cancellationRows ?? [],
    auditNotes: snapshot.auditNotes ?? [],
  };
}

function csvLine(values: unknown[]) {
  return values.map(csvEscape).join(",");
}

export function buildOwnerSettlementCsv(data: OwnerSettlementExportData) {
  const lines: string[] = [];

  lines.push(csvLine(["بخش", "عنوان", "مقدار"]));
  lines.push(csvLine(["مشخصات", "دوره", data.periodLabel]));
  lines.push(csvLine(["مشخصات", "وضعیت", data.statusLabel]));
  lines.push(csvLine(["مشخصات", "مدل بهره‌برداری", data.operationModelLabel]));
  lines.push(csvLine(["مشخصات", "سهم مراسم", `${data.ownerRevenueSharePercent}%`]));
  lines.push(csvLine(["مشخصات", "سهم کنسلی", `${data.ownerCancellationSharePercent}%`]));
  lines.push(csvLine(["خلاصه", "تعداد مراسم برگزارشده", data.heldEventsCount]));
  lines.push(csvLine(["خلاصه", "تعداد کنسلی", data.canceledEventsCount]));
  lines.push(csvLine(["خلاصه", "جمع فاکتورها", data.invoiceTotal]));
  lines.push(csvLine(["خلاصه", "جمع خدمات و نفرات اضافه", data.extraServicesTotal]));
  lines.push(csvLine(["خلاصه", "درآمد/خسارت کنسلی", data.cancellationIncomeTotal]));
  lines.push(csvLine(["خلاصه", "سهم مالک از مراسم", data.ownerEventShare]));
  lines.push(csvLine(["خلاصه", "سهم مالک از کنسلی", data.ownerCancellationShare]));
  lines.push(csvLine(["خلاصه", "جمع سهم محاسباتی", data.calculatedOwnerShare]));
  lines.push(csvLine(["خلاصه", "حداقل تضمین ماهانه", data.monthlyMinimumGuarantee]));
  lines.push(csvLine(["خلاصه", "کسری تا حداقل", data.minimumGuaranteeShortfall]));
  lines.push(csvLine(["خلاصه", "قابل پرداخت به مالک", data.finalOwnerPayable]));
  lines.push(csvLine(["زمان", "ساخت", formatJalaliDateTime(data.generatedAt)]));
  lines.push(csvLine(["زمان", "تأیید", formatJalaliDateTime(data.approvedAt)]));
  lines.push(csvLine(["زمان", "پرداخت", formatJalaliDateTime(data.paidAt)]));
  lines.push("");

  lines.push(csvLine(["فاکتورهای مراسم", "شماره فاکتور", "شماره قرارداد", "مشتری", "تاریخ مراسم", "جمع فاکتور", "اضافات"]));
  for (const row of data.invoiceRows) {
    lines.push(csvLine(["فاکتورهای مراسم", row.invoiceNo, row.contractNo, row.customerName, row.eventDateLabel, row.invoiceTotal, row.extraServicesTotal]));
  }
  if (!data.invoiceRows.length) {
    lines.push(csvLine(["فاکتورهای مراسم", "بدون ردیف", "", "", "", "", ""]));
  }
  lines.push("");

  lines.push(csvLine(["کنسلی‌ها", "شماره قرارداد", "مشتری", "تاریخ مراسم", "درصد خسارت", "مبلغ خسارت", "هشدار حسابرسی"]));
  for (const row of data.cancellationRows) {
    lines.push(csvLine(["کنسلی‌ها", row.contractNo, row.customerName, row.eventDateLabel, row.penaltyPercent, row.penaltyAmount, row.ownerAuditWarning ?? ""]));
  }
  if (!data.cancellationRows.length) {
    lines.push(csvLine(["کنسلی‌ها", "بدون ردیف", "", "", "", "", ""]));
  }
  lines.push("");

  lines.push(csvLine(["یادداشت‌های حسابرسی", "متن"]));
  for (const note of data.auditNotes) {
    lines.push(csvLine(["یادداشت‌های حسابرسی", note]));
  }

  return lines.join("\r\n");
}

export function buildOwnerSettlementJson(data: OwnerSettlementExportData) {
  return {
    exportTaskId: "TALAR_SETTLEMENT_PRINT_AND_EXPORT_37",
    exportedAt: new Date().toISOString(),
    settlement: data,
  };
}

export function createOwnerSettlementExportFileName(data: OwnerSettlementExportData, extension: "csv" | "json") {
  return `owner-settlement-${data.periodYear}-${String(data.periodMonth).padStart(2, "0")}-${data.id.slice(0, 8)}.${extension}`;
}

export function createOwnerSettlementAttachmentHeaders(fileName: string, contentType: string) {
  return createAttachmentHeaders(fileName, contentType);
}

export async function logOwnerSettlementExport(input: {
  tenantId: string;
  actor: Actor;
  data: OwnerSettlementExportData;
  format: "CSV" | "JSON" | "PRINT";
  request?: Request;
}) {
  await createAuditLog({
    tenantId: input.tenantId,
    userId: input.actor.userId,
    action: input.format === "PRINT" ? "OWNER_MONTHLY_SETTLEMENT_PRINT_VIEWED" : "OWNER_MONTHLY_SETTLEMENT_EXPORTED",
    entityType: "OWNER_MONTHLY_SETTLEMENT",
    entityId: input.data.id,
    title: input.format === "PRINT" ? "مشاهده نسخه چاپی تسویه مالک" : "دریافت خروجی تسویه مالک",
    message: input.format === "PRINT"
      ? `نسخه چاپی تسویه مالک برای ${input.data.periodLabel} توسط ${getAuditActorName(input.actor.user ?? null)} مشاهده شد.`
      : `خروجی ${input.format} تسویه مالک برای ${input.data.periodLabel} توسط ${getAuditActorName(input.actor.user ?? null)} دریافت شد.`,
    metadata: {
      taskId: "TALAR_SETTLEMENT_PRINT_AND_EXPORT_37",
      format: input.format,
      settlementId: input.data.id,
      periodYear: input.data.periodYear,
      periodMonth: input.data.periodMonth,
      periodLabel: input.data.periodLabel,
      finalOwnerPayable: input.data.finalOwnerPayable,
      minimumGuaranteeApplied: input.data.minimumGuaranteeApplied,
    },
    href: `/dashboard/owner-settlements/${input.data.id}`,
    request: input.request,
  });
}

export function settlementAmountLabel(value: string | number) {
  return formatIRR(value);
}

export function settlementCountLabel(value: string | number) {
  return formatPersianNumber(value);
}

export function settlementPercentLabel(value: string | number) {
  return `${toPersianDigits(String(value))}٪`;
}
