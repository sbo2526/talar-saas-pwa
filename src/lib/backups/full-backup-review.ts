type JsonRecord = Record<string, unknown>;

export type FullBackupReviewSummary = {
  appName: string;
  tenantName: string;
  exportedAtJalali: string;
  version: string;
  sameTenantId: boolean;
  tenantStatus: string;
  hallBrandName: string;
  customerCount: number;
  contractCount: number;
  paymentCount: number;
  expenseCount: number;
  hallCount: number;
  salonCount: number;
  serviceCount: number;
  menuCount: number;
  paymentMethodCount: number;
  financialCategoryCount: number;
  notificationTemplateCount: number;
  contractLineItemCount: number;
  reservedContracts: number;
  completedContracts: number;
  canceledContracts: number;
  totalContractAmount: number;
  totalPaymentAmount: number;
  warnings: string[];
};

const MAX_WARNINGS = 20;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord, key: string, fallback = "ثبت نشده") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumberLike(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[٬،,\s]/g, "").replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readArray(record: JsonRecord, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function readNestedRecord(record: JsonRecord, key: string) {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function addWarning(warnings: string[], message: string) {
  if (warnings.length < MAX_WARNINGS) {
    warnings.push(message);
  }
}

function countByStatus(items: unknown[], status: string) {
  return items.reduce((count, item) => {
    if (!isRecord(item)) {
      return count;
    }

    return readString(item, "status", "") === status ? count + 1 : count;
  }, 0);
}

function sumByField(items: unknown[], fieldName: string) {
  return items.reduce((sum, item) => {
    if (!isRecord(item)) {
      return sum;
    }

    return sum + readNumberLike(item[fieldName]);
  }, 0);
}

function countContractLineItems(contracts: unknown[]) {
  return contracts.reduce((count, item) => {
    if (!isRecord(item)) {
      return count;
    }

    const lineItems = readArray(item, "lineItems");
    return count + lineItems.length;
  }, 0);
}

export async function reviewFullBackupJsonFile({
  tenantId,
  fileBytes,
}: {
  tenantId: string;
  fileBytes: Uint8Array;
}): Promise<FullBackupReviewSummary> {
  const warnings: string[] = [];
  const text = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("INVALID_FULL_BACKUP_JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("INVALID_FULL_BACKUP_JSON_ROOT");
  }

  const meta = readNestedRecord(parsed, "meta");
  const tenant = readNestedRecord(parsed, "tenant");
  const hallInfo = readNestedRecord(parsed, "hallInfo");
  const baseDefinitions = readNestedRecord(parsed, "baseDefinitions");
  const notificationSettings = readNestedRecord(parsed, "notificationSettings");

  const customers = readArray(parsed, "customers");
  const contracts = readArray(parsed, "contracts");
  const payments = readArray(parsed, "payments");
  const expenses = readArray(parsed, "expenses");
  const halls = readArray(baseDefinitions, "halls");
  const salons = readArray(baseDefinitions, "salons");
  const services = readArray(baseDefinitions, "services");
  const menus = readArray(baseDefinitions, "menus");
  const paymentMethods = readArray(baseDefinitions, "paymentMethods");
  const financialCategories = readArray(baseDefinitions, "financialCategories");
  const templates = readArray(notificationSettings, "templates");

  if (readString(meta, "app", "") !== "Talar Manager") {
    addWarning(warnings, "نام برنامه در فایل پشتیبان با خروجی رسمی سامانه تالار همخوانی کامل ندارد.");
  }

  if (readNumberLike(meta["version"]) !== 1) {
    addWarning(warnings, "نسخه فایل پشتیبان ناشناخته است و قبل از بازیابی واقعی باید بررسی فنی شود.");
  }

  if (!isRecord(parsed.tenant)) {
    addWarning(warnings, "اطلاعات tenant در فایل پشتیبان کامل نیست.");
  }

  if (!isRecord(parsed.hallInfo)) {
    addWarning(warnings, "اطلاعات تالار در فایل پشتیبان پیدا نشد.");
  }

  if (customers.length === 0 && contracts.length === 0) {
    addWarning(warnings, "در فایل پشتیبان مشتری یا قرارداد قابل نمایش پیدا نشد.");
  }

  const backupTenantId = readString(tenant, "id", "");
  const sameTenantId = Boolean(backupTenantId) && backupTenantId === tenantId;

  if (!sameTenantId) {
    addWarning(warnings, "شناسه فضای کاری فایل پشتیبان با فضای کاری فعلی یکی نیست؛ بازیابی واقعی باید فقط با تأیید مالک انجام شود.");
  }

  return {
    appName: readString(meta, "app"),
    tenantName: readString(meta, "tenantName", readString(tenant, "name")),
    exportedAtJalali: readString(meta, "exportedAtJalali"),
    version: readString(meta, "version", String(readNumberLike(meta["version"]) || 1)),
    sameTenantId,
    tenantStatus: readString(tenant, "status"),
    hallBrandName: readString(hallInfo, "brandName"),
    customerCount: customers.length,
    contractCount: contracts.length,
    paymentCount: payments.length,
    expenseCount: expenses.length,
    hallCount: halls.length,
    salonCount: salons.length,
    serviceCount: services.length,
    menuCount: menus.length,
    paymentMethodCount: paymentMethods.length,
    financialCategoryCount: financialCategories.length,
    notificationTemplateCount: templates.length,
    contractLineItemCount: countContractLineItems(contracts),
    reservedContracts: countByStatus(contracts, "RESERVED"),
    completedContracts: countByStatus(contracts, "COMPLETED"),
    canceledContracts: countByStatus(contracts, "CANCELED"),
    totalContractAmount: sumByField(contracts, "finalTotal"),
    totalPaymentAmount: sumByField(payments, "amount"),
    warnings,
  };
}
