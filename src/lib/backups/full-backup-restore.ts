import type {
  ContractLineItemType,
  ContractStatus,
  FinancialCategoryType,
  PaymentMethodType,
  Prisma,
  ServicePricingType,
} from "@prisma/client";
import { getPrisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

type IdMap = Map<string, string>;

type BackupRestoreMaps = {
  customers: IdMap;
  halls: IdMap;
  salons: IdMap;
  services: IdMap;
  menus: IdMap;
  paymentMethods: IdMap;
  financialCategories: IdMap;
  eventTypes: IdMap;
  packages: IdMap;
  contracts: IdMap;
};

export type FullBackupRestoreResult = {
  importedCustomers: number;
  importedContracts: number;
  importedLineItems: number;
  importedPayments: number;
  importedExpenses: number;
  importedBaseDefinitions: number;
  updatedRecords: number;
  skippedRows: number;
  duplicateRows: number;
  warnings: string[];
};

const MAX_WARNINGS = 30;

const contractStatusValues = new Set<ContractStatus>([
  "DRAFT",
  "RESERVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELED",
]);

const contractLineItemTypeValues = new Set<ContractLineItemType>([
  "PACKAGE",
  "SERVICE",
  "MENU",
  "DRINK",
  "DESSERT",
]);

const servicePricingTypeValues = new Set<ServicePricingType>([
  "FIXED",
  "PER_GUEST",
  "PER_HOUR",
  "PER_ITEM",
  "CUSTOM",
]);

const paymentMethodTypeValues = new Set<PaymentMethodType>([
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "CARD_TO_CARD",
  "CHECK",
  "ONLINE",
  "OTHER",
]);

const financialCategoryTypeValues = new Set<FinancialCategoryType>([
  "INCOME",
  "EXPENSE",
  "ASSET",
  "LIABILITY",
  "DISCOUNT",
  "TAX",
  "OTHER",
]);

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readArray(record: JsonRecord, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function readRecord(record: JsonRecord, key: string) {
  const value = record[key];
  return isRecord(value) ? value : {};
}

function readString(record: JsonRecord, key: string, fallback = "") {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(record: JsonRecord, key: string) {
  const value = readString(record, key);
  return value || undefined;
}

function readBoolean(record: JsonRecord, key: string, fallback = false) {
  const value = record[key];
  return typeof value === "boolean" ? value : fallback;
}

function readInt(record: JsonRecord, key: string, fallback = 0) {
  const value = readNumberLike(record[key]);
  return Number.isFinite(value) ? Math.trunc(value) : fallback;
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

function readDecimalString(record: JsonRecord, key: string, fallback = "0") {
  return String(readNumberLike(record[key]) || readNumberLike(fallback));
}

function readDate(record: JsonRecord, key: string) {
  const value = record[key];
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

function readRequiredDate(record: JsonRecord, key: string, fallback = new Date()) {
  return readDate(record, key) ?? fallback;
}

function readJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function addWarning(result: FullBackupRestoreResult, message: string) {
  if (result.warnings.length < MAX_WARNINGS) {
    result.warnings.push(message);
  }
}

function safeContractStatus(value: string): ContractStatus {
  return contractStatusValues.has(value as ContractStatus)
    ? (value as ContractStatus)
    : "RESERVED";
}

function safeLineItemType(value: string): ContractLineItemType {
  return contractLineItemTypeValues.has(value as ContractLineItemType)
    ? (value as ContractLineItemType)
    : "SERVICE";
}

function safePricingType(value: string): ServicePricingType {
  return servicePricingTypeValues.has(value as ServicePricingType)
    ? (value as ServicePricingType)
    : "CUSTOM";
}

function safePaymentMethodType(value: string): PaymentMethodType {
  return paymentMethodTypeValues.has(value as PaymentMethodType)
    ? (value as PaymentMethodType)
    : "OTHER";
}

function safeFinancialCategoryType(value: string): FinancialCategoryType {
  return financialCategoryTypeValues.has(value as FinancialCategoryType)
    ? (value as FinancialCategoryType)
    : "OTHER";
}

function sourceId(record: JsonRecord) {
  return readString(record, "id");
}

function createInitialMaps(): BackupRestoreMaps {
  return {
    customers: new Map(),
    halls: new Map(),
    salons: new Map(),
    services: new Map(),
    menus: new Map(),
    paymentMethods: new Map(),
    financialCategories: new Map(),
    eventTypes: new Map(),
    packages: new Map(),
    contracts: new Map(),
  };
}

async function findExistingById<T extends { id: string }>(
  lookup: () => Promise<T | null>,
) {
  return lookup();
}

async function restoreHallProfile(
  tx: Prisma.TransactionClient,
  tenantId: string,
  hallInfo: JsonRecord,
  result: FullBackupRestoreResult,
) {
  if (Object.keys(hallInfo).length === 0) {
    return;
  }

  await tx.tenantHallProfile.upsert({
    where: { tenantId },
    update: {
      brandName: readOptionalString(hallInfo, "brandName"),
      legalName: readOptionalString(hallInfo, "legalName"),
      managerName: readOptionalString(hallInfo, "managerName"),
      managerNationalCode: readOptionalString(hallInfo, "managerNationalCode"),
      registrationNumber: readOptionalString(hallInfo, "registrationNumber"),
      economicCode: readOptionalString(hallInfo, "economicCode"),
      licenseNumber: readOptionalString(hallInfo, "licenseNumber"),
      licenseIssuedAt: readDate(hallInfo, "licenseIssuedAt"),
      licenseExpiresAt: readDate(hallInfo, "licenseExpiresAt"),
      licenseImageUrl: readOptionalString(hallInfo, "licenseImageUrl"),
      licenseImageKey: readOptionalString(hallInfo, "licenseImageKey"),
      hallLogoUrl: readOptionalString(hallInfo, "hallLogoUrl"),
      hallLogoKey: readOptionalString(hallInfo, "hallLogoKey"),
      province: readOptionalString(hallInfo, "province"),
      city: readOptionalString(hallInfo, "city"),
      address: readOptionalString(hallInfo, "address"),
      postalCode: readOptionalString(hallInfo, "postalCode"),
      phone: readOptionalString(hallInfo, "phone"),
      mobile: readOptionalString(hallInfo, "mobile"),
      email: readOptionalString(hallInfo, "email"),
      website: readOptionalString(hallInfo, "website"),
      instagram: readOptionalString(hallInfo, "instagram"),
      totalCapacity: readInt(hallInfo, "totalCapacity") || undefined,
      parkingCapacity: readInt(hallInfo, "parkingCapacity") || undefined,
      hasParking: readBoolean(hallInfo, "hasParking"),
      hasBrideRoom: readBoolean(hallInfo, "hasBrideRoom"),
      hasCateringKitchen: readBoolean(hallInfo, "hasCateringKitchen"),
      hasOutdoorSpace: readBoolean(hallInfo, "hasOutdoorSpace"),
      hasValet: readBoolean(hallInfo, "hasValet"),
      description: readOptionalString(hallInfo, "description"),
      internalNote: readOptionalString(hallInfo, "internalNote"),
    },
    create: {
      tenantId,
      brandName: readOptionalString(hallInfo, "brandName"),
      legalName: readOptionalString(hallInfo, "legalName"),
      managerName: readOptionalString(hallInfo, "managerName"),
      managerNationalCode: readOptionalString(hallInfo, "managerNationalCode"),
      registrationNumber: readOptionalString(hallInfo, "registrationNumber"),
      economicCode: readOptionalString(hallInfo, "economicCode"),
      licenseNumber: readOptionalString(hallInfo, "licenseNumber"),
      licenseIssuedAt: readDate(hallInfo, "licenseIssuedAt"),
      licenseExpiresAt: readDate(hallInfo, "licenseExpiresAt"),
      licenseImageUrl: readOptionalString(hallInfo, "licenseImageUrl"),
      licenseImageKey: readOptionalString(hallInfo, "licenseImageKey"),
      hallLogoUrl: readOptionalString(hallInfo, "hallLogoUrl"),
      hallLogoKey: readOptionalString(hallInfo, "hallLogoKey"),
      province: readOptionalString(hallInfo, "province"),
      city: readOptionalString(hallInfo, "city"),
      address: readOptionalString(hallInfo, "address"),
      postalCode: readOptionalString(hallInfo, "postalCode"),
      phone: readOptionalString(hallInfo, "phone"),
      mobile: readOptionalString(hallInfo, "mobile"),
      email: readOptionalString(hallInfo, "email"),
      website: readOptionalString(hallInfo, "website"),
      instagram: readOptionalString(hallInfo, "instagram"),
      totalCapacity: readInt(hallInfo, "totalCapacity") || undefined,
      parkingCapacity: readInt(hallInfo, "parkingCapacity") || undefined,
      hasParking: readBoolean(hallInfo, "hasParking"),
      hasBrideRoom: readBoolean(hallInfo, "hasBrideRoom"),
      hasCateringKitchen: readBoolean(hallInfo, "hasCateringKitchen"),
      hasOutdoorSpace: readBoolean(hallInfo, "hasOutdoorSpace"),
      hasValet: readBoolean(hallInfo, "hasValet"),
      description: readOptionalString(hallInfo, "description"),
      internalNote: readOptionalString(hallInfo, "internalNote"),
    },
  });

  result.updatedRecords += 1;
}

async function restoreContractSettings(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contractSettings: JsonRecord,
  result: FullBackupRestoreResult,
) {
  if (Object.keys(contractSettings).length === 0) {
    return;
  }

  await tx.contractSetting.upsert({
    where: { tenantId },
    update: {
      contractPrefix: readString(contractSettings, "contractPrefix", "TLR"),
      nextNumber: Math.max(1, readInt(contractSettings, "nextNumber", 1)),
      fiscalYear: readOptionalString(contractSettings, "fiscalYear"),
      defaultDepositPercent: readDecimalString(contractSettings, "defaultDepositPercent"),
      defaultTaxPercent: readDecimalString(contractSettings, "defaultTaxPercent"),
      defaultDiscountPercent: readDecimalString(contractSettings, "defaultDiscountPercent"),
      defaultClauses: readOptionalString(contractSettings, "defaultClauses"),
      templateBody: readOptionalString(contractSettings, "templateBody"),
      cancellationPolicy: readOptionalString(contractSettings, "cancellationPolicy"),
      paymentTerms: readOptionalString(contractSettings, "paymentTerms"),
      footerNote: readOptionalString(contractSettings, "footerNote"),
      customerSignatureLabel: readString(contractSettings, "customerSignatureLabel", "امضای مشتری"),
      managerSignatureLabel: readString(contractSettings, "managerSignatureLabel", "امضای مدیر تالار"),
      printTemplateName: readOptionalString(contractSettings, "printTemplateName"),
      showLogoOnPrint: readBoolean(contractSettings, "showLogoOnPrint", true),
      showLicenseInfoOnPrint: readBoolean(contractSettings, "showLicenseInfoOnPrint", true),
      requireNationalCode: readBoolean(contractSettings, "requireNationalCode"),
      requirePhone: readBoolean(contractSettings, "requirePhone", true),
    },
    create: {
      tenantId,
      contractPrefix: readString(contractSettings, "contractPrefix", "TLR"),
      nextNumber: Math.max(1, readInt(contractSettings, "nextNumber", 1)),
      fiscalYear: readOptionalString(contractSettings, "fiscalYear"),
      defaultDepositPercent: readDecimalString(contractSettings, "defaultDepositPercent"),
      defaultTaxPercent: readDecimalString(contractSettings, "defaultTaxPercent"),
      defaultDiscountPercent: readDecimalString(contractSettings, "defaultDiscountPercent"),
      defaultClauses: readOptionalString(contractSettings, "defaultClauses"),
      templateBody: readOptionalString(contractSettings, "templateBody"),
      cancellationPolicy: readOptionalString(contractSettings, "cancellationPolicy"),
      paymentTerms: readOptionalString(contractSettings, "paymentTerms"),
      footerNote: readOptionalString(contractSettings, "footerNote"),
      customerSignatureLabel: readString(contractSettings, "customerSignatureLabel", "امضای مشتری"),
      managerSignatureLabel: readString(contractSettings, "managerSignatureLabel", "امضای مدیر تالار"),
      printTemplateName: readOptionalString(contractSettings, "printTemplateName"),
      showLogoOnPrint: readBoolean(contractSettings, "showLogoOnPrint", true),
      showLicenseInfoOnPrint: readBoolean(contractSettings, "showLicenseInfoOnPrint", true),
      requireNationalCode: readBoolean(contractSettings, "requireNationalCode"),
      requirePhone: readBoolean(contractSettings, "requirePhone", true),
    },
  });

  result.updatedRecords += 1;
}

async function restoreHalls(
  tx: Prisma.TransactionClient,
  tenantId: string,
  halls: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of halls) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const name = readString(item, "name", "تالار بازیابی‌شده");
    const code = readOptionalString(item, "code");
    const existing = originalId
      ? await findExistingById(() => tx.hall.findFirst({ where: { id: originalId, tenantId } }))
      : null;

    const duplicate = existing ?? await tx.hall.findFirst({
      where: {
        tenantId,
        OR: [
          { name },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.halls.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.hall.create({
      data: {
        id: originalId || undefined,
        tenantId,
        name,
        code,
        province: readOptionalString(item, "province"),
        city: readOptionalString(item, "city"),
        address: readOptionalString(item, "address"),
        phone: readOptionalString(item, "phone"),
        managerName: readOptionalString(item, "managerName"),
        totalCapacity: readInt(item, "totalCapacity") || undefined,
        description: readOptionalString(item, "description"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.halls.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restoreSalons(
  tx: Prisma.TransactionClient,
  tenantId: string,
  salons: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of salons) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const sourceHallId = readString(item, "hallId");
    const hallId = maps.halls.get(sourceHallId);
    if (!hallId) {
      addWarning(result, `سالن ${readString(item, "name", originalId)} به دلیل نبود تالار مقصد رد شد.`);
      result.skippedRows += 1;
      continue;
    }

    const name = readString(item, "name", "سالن بازیابی‌شده");
    const code = readOptionalString(item, "code");
    const existing = originalId
      ? await tx.salon.findFirst({ where: { id: originalId, tenantId } })
      : null;
    const duplicate = existing ?? await tx.salon.findFirst({
      where: {
        tenantId,
        OR: [
          { hallId, name },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.salons.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.salon.create({
      data: {
        id: originalId || undefined,
        tenantId,
        hallId,
        name,
        code,
        floor: readOptionalString(item, "floor"),
        locationNote: readOptionalString(item, "locationNote"),
        capacity: readInt(item, "capacity") || undefined,
        minCapacity: readInt(item, "minCapacity") || undefined,
        maxCapacity: readInt(item, "maxCapacity") || undefined,
        basePrice: readDecimalString(item, "basePrice"),
        hasStage: readBoolean(item, "hasStage"),
        hasDanceFloor: readBoolean(item, "hasDanceFloor"),
        hasSeparateEntrance: readBoolean(item, "hasSeparateEntrance"),
        hasVipRoom: readBoolean(item, "hasVipRoom"),
        hasSoundSystem: readBoolean(item, "hasSoundSystem"),
        hasProjector: readBoolean(item, "hasProjector"),
        description: readOptionalString(item, "description"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.salons.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restoreServices(
  tx: Prisma.TransactionClient,
  tenantId: string,
  services: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of services) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const title = readString(item, "title", "خدمت بازیابی‌شده");
    const code = readOptionalString(item, "code");
    const duplicate = await tx.service.findFirst({
      where: {
        tenantId,
        OR: [
          ...(originalId ? [{ id: originalId }] : []),
          { title },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.services.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.service.create({
      data: {
        id: originalId || undefined,
        tenantId,
        title,
        code,
        description: readOptionalString(item, "description"),
        category: readOptionalString(item, "category"),
        pricingType: safePricingType(readString(item, "pricingType", "FIXED")),
        unit: readString(item, "unit", "مورد"),
        price: readDecimalString(item, "price"),
        basePrice: readDecimalString(item, "basePrice"),
        isRequired: readBoolean(item, "isRequired"),
        allowPriceOverride: readBoolean(item, "allowPriceOverride", true),
        sortOrder: readInt(item, "sortOrder"),
        notes: readOptionalString(item, "notes"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.services.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restoreMenus(
  tx: Prisma.TransactionClient,
  tenantId: string,
  menus: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of menus) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const title = readString(item, "title", "منوی بازیابی‌شده");
    const code = readOptionalString(item, "code");
    const duplicate = await tx.menu.findFirst({
      where: {
        tenantId,
        OR: [
          ...(originalId ? [{ id: originalId }] : []),
          { title },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.menus.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.menu.create({
      data: {
        id: originalId || undefined,
        tenantId,
        title,
        code,
        description: readOptionalString(item, "description"),
        category: readOptionalString(item, "category"),
        pricingType: safePricingType(readString(item, "pricingType", "PER_GUEST")),
        unit: readString(item, "unit", "نفر"),
        pricePerGuest: readDecimalString(item, "pricePerGuest"),
        basePrice: readDecimalString(item, "basePrice"),
        minGuests: readInt(item, "minGuests") || undefined,
        maxGuests: readInt(item, "maxGuests") || undefined,
        currency: readString(item, "currency", "IRR"),
        includedItems: readOptionalString(item, "includedItems"),
        notes: readOptionalString(item, "notes"),
        items: readJson(item.items),
        isRecommended: readBoolean(item, "isRecommended"),
        isTaxable: readBoolean(item, "isTaxable", true),
        allowPriceOverride: readBoolean(item, "allowPriceOverride", true),
        sortOrder: readInt(item, "sortOrder"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.menus.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restorePaymentMethods(
  tx: Prisma.TransactionClient,
  tenantId: string,
  methods: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of methods) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const title = readString(item, "title", "روش دریافت بازیابی‌شده");
    const code = readOptionalString(item, "code");
    const duplicate = await tx.paymentMethod.findFirst({
      where: {
        tenantId,
        OR: [
          ...(originalId ? [{ id: originalId }] : []),
          { title },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.paymentMethods.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.paymentMethod.create({
      data: {
        id: originalId || undefined,
        tenantId,
        title,
        code,
        type: safePaymentMethodType(readString(item, "type", "OTHER")),
        description: readOptionalString(item, "description"),
        bankName: readOptionalString(item, "bankName"),
        accountHolder: readOptionalString(item, "accountHolder"),
        accountNumber: readOptionalString(item, "accountNumber"),
        cardNumber: readOptionalString(item, "cardNumber"),
        iban: readOptionalString(item, "iban"),
        posTerminalId: readOptionalString(item, "posTerminalId"),
        gatewayName: readOptionalString(item, "gatewayName"),
        isDefault: readBoolean(item, "isDefault"),
        sortOrder: readInt(item, "sortOrder"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.paymentMethods.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restoreFinancialCategories(
  tx: Prisma.TransactionClient,
  tenantId: string,
  categories: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of categories) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const title = readString(item, "title", "دسته مالی بازیابی‌شده");
    const type = safeFinancialCategoryType(readString(item, "type", "OTHER"));
    const code = readOptionalString(item, "code");
    const duplicate = await tx.financialCategory.findFirst({
      where: {
        tenantId,
        OR: [
          ...(originalId ? [{ id: originalId }] : []),
          { title, type },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.financialCategories.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const parentSourceId = readString(item, "parentId");
    const created = await tx.financialCategory.create({
      data: {
        id: originalId || undefined,
        tenantId,
        title,
        code,
        type,
        description: readOptionalString(item, "description"),
        color: readOptionalString(item, "color"),
        icon: readOptionalString(item, "icon"),
        parentId: parentSourceId ? maps.financialCategories.get(parentSourceId) : undefined,
        isSystem: readBoolean(item, "isSystem"),
        isActive: readBoolean(item, "isActive", true),
        sortOrder: readInt(item, "sortOrder"),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.financialCategories.set(originalId, created.id);
    }
    result.importedBaseDefinitions += 1;
  }
}

async function restoreNotificationTemplates(
  tx: Prisma.TransactionClient,
  tenantId: string,
  templates: unknown[],
  result: FullBackupRestoreResult,
) {
  for (const item of templates) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const channel = readString(item, "channel");
    const eventType = readString(item, "eventType");
    if (!channel || !eventType) {
      result.skippedRows += 1;
      continue;
    }

    await tx.notificationTemplate.upsert({
      where: {
        tenantId_channel_eventType: {
          tenantId,
          channel,
          eventType,
        },
      },
      update: {
        title: readString(item, "title", "قالب پیام"),
        body: readString(item, "body", ""),
        isEnabled: readBoolean(item, "isEnabled", true),
      },
      create: {
        tenantId,
        channel,
        eventType,
        title: readString(item, "title", "قالب پیام"),
        body: readString(item, "body", ""),
        isEnabled: readBoolean(item, "isEnabled", true),
      },
    });

    result.updatedRecords += 1;
  }
}

async function restoreEventTypesFromContracts(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contracts: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of contracts) {
    if (!isRecord(item)) {
      continue;
    }

    const sourceEventTypeId = readString(item, "eventTypeId");
    const eventTypeName = readString(item, "eventTypeName");
    if (!sourceEventTypeId || !eventTypeName || maps.eventTypes.has(sourceEventTypeId)) {
      continue;
    }

    const eventType = await tx.contractEventType.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: eventTypeName,
        },
      },
      update: { isActive: true },
      create: {
        id: sourceEventTypeId,
        tenantId,
        name: eventTypeName,
        isActive: true,
      },
    });

    maps.eventTypes.set(sourceEventTypeId, eventType.id);
    result.importedBaseDefinitions += 1;
  }
}

async function restorePackagesFromContracts(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contracts: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of contracts) {
    if (!isRecord(item)) {
      continue;
    }

    const packageId = readString(item, "packageId");
    if (!packageId || maps.packages.has(packageId)) {
      continue;
    }

    const packageSnapshot = isRecord(item.packageSnapshot) ? item.packageSnapshot : {};
    const title = readString(packageSnapshot, "title", readString(item, "packageName", "پکیج بازیابی‌شده"));
    const code = readOptionalString(packageSnapshot, "code");
    const duplicate = await tx.ceremonyPackage.findFirst({
      where: {
        tenantId,
        OR: [
          { id: packageId },
          { title },
          ...(code ? [{ code }] : []),
        ],
      },
    });

    if (duplicate) {
      maps.packages.set(packageId, duplicate.id);
      continue;
    }

    const serviceIds = readArray(packageSnapshot, "serviceIds")
      .map((id) => (typeof id === "string" ? maps.services.get(id) : undefined))
      .filter((id): id is string => Boolean(id));
    const menuIds = readArray(packageSnapshot, "menuIds")
      .map((id) => (typeof id === "string" ? maps.menus.get(id) : undefined))
      .filter((id): id is string => Boolean(id));

    const created = await tx.ceremonyPackage.create({
      data: {
        id: packageId,
        tenantId,
        title,
        code,
        description: readOptionalString(packageSnapshot, "description"),
        pricePerGuest: readDecimalString(packageSnapshot, "pricePerGuest"),
        serviceIds,
        menuIds,
        includedItemsNote: readOptionalString(packageSnapshot, "includedItemsNote"),
        allowPriceOverride: true,
        isActive: true,
      },
    });

    maps.packages.set(packageId, created.id);
    result.importedBaseDefinitions += 1;
  }
}

async function restoreCustomers(
  tx: Prisma.TransactionClient,
  tenantId: string,
  customers: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of customers) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const fullName = readString(item, "fullName", "مشتری بدون نام");
    const phone = readString(item, "phone", "بدون-شماره");
    const nationalCode = readOptionalString(item, "nationalCode") ?? readOptionalString(item, "nationalId");
    const identityFilters: Prisma.CustomerWhereInput[] = [
      ...(originalId ? [{ id: originalId }] : []),
      ...(nationalCode ? [{ nationalCode }, { nationalId: nationalCode }] : []),
      ...(phone && phone !== "بدون-شماره" ? [{ phone }] : []),
    ];
    const existing = identityFilters.length > 0
      ? await tx.customer.findFirst({
          where: {
            tenantId,
            OR: identityFilters,
          },
        })
      : null;

    if (existing) {
      if (originalId) {
        maps.customers.set(originalId, existing.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const created = await tx.customer.create({
      data: {
        id: originalId || undefined,
        tenantId,
        salutation: readOptionalString(item, "salutation"),
        fullName,
        phone,
        nationalId: readOptionalString(item, "nationalId") ?? nationalCode,
        nationalCode,
        address: readOptionalString(item, "address"),
        notes: readOptionalString(item, "notes"),
        isActive: readBoolean(item, "isActive", true),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.customers.set(originalId, created.id);
    }
    result.importedCustomers += 1;
  }
}

async function restoreContracts(
  tx: Prisma.TransactionClient,
  tenantId: string,
  contracts: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of contracts) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const contractNo = readString(item, "contractNo");
    const customerId = maps.customers.get(readString(item, "customerId"));
    if (!contractNo || !customerId) {
      result.skippedRows += 1;
      addWarning(result, `قرارداد ${contractNo || originalId || "بدون شماره"} به دلیل نبود مشتری مقصد رد شد.`);
      continue;
    }

    const duplicate = await tx.contract.findFirst({
      where: {
        tenantId,
        OR: [
          ...(originalId ? [{ id: originalId }] : []),
          { contractNo },
        ],
      },
    });

    if (duplicate) {
      if (originalId) {
        maps.contracts.set(originalId, duplicate.id);
      }
      result.duplicateRows += 1;
      continue;
    }

    const sourceEventTypeId = readString(item, "eventTypeId");
    const sourceHallId = readString(item, "hallId");
    const sourceSalonId = readString(item, "salonId");
    const sourcePackageId = readString(item, "packageId");
    const eventDate = readDate(item, "eventDate");
    if (!eventDate) {
      result.skippedRows += 1;
      addWarning(result, `قرارداد ${contractNo} به دلیل تاریخ مراسم نامعتبر رد شد.`);
      continue;
    }

    const created = await tx.contract.create({
      data: {
        id: originalId || undefined,
        tenantId,
        customerId,
        contractNo,
        title: readString(item, "title", contractNo),
        notes: readOptionalString(item, "notes"),
        status: safeContractStatus(readString(item, "status", "RESERVED")),
        eventTypeId: maps.eventTypes.get(sourceEventTypeId),
        eventTypeName: readOptionalString(item, "eventTypeName"),
        eventDate,
        eventStartTime: readOptionalString(item, "eventStartTime"),
        eventEndTime: readOptionalString(item, "eventEndTime"),
        guestCount: Math.max(1, readInt(item, "guestCount", 1)),
        hallId: maps.halls.get(sourceHallId),
        salonId: maps.salons.get(sourceSalonId),
        packageId: maps.packages.get(sourcePackageId),
        packageName: readOptionalString(item, "packageName"),
        packageTotal: readDecimalString(item, "packageTotal"),
        packageTotalManual: readBoolean(item, "packageTotalManual"),
        packagePricePerGuest: readDecimalString(item, "packagePricePerGuest"),
        packageSnapshot: readJson(item.packageSnapshot),
        servicesTotal: readDecimalString(item, "servicesTotal"),
        servicesTotalManual: readBoolean(item, "servicesTotalManual"),
        menuTotal: readDecimalString(item, "menuTotal"),
        menuTotalManual: readBoolean(item, "menuTotalManual"),
        discountAmount: readDecimalString(item, "discountAmount"),
        depositAmount: readDecimalString(item, "depositAmount"),
        finalTotal: readDecimalString(item, "finalTotal"),
        finalTotalManual: readBoolean(item, "finalTotalManual"),
        remainingAmount: readDecimalString(item, "remainingAmount"),
        remainingAmountManual: readBoolean(item, "remainingAmountManual"),
        totalAmount: readDecimalString(item, "totalAmount", readDecimalString(item, "finalTotal")),
        createdAt: readDate(item, "createdAt"),
      },
    });

    if (originalId) {
      maps.contracts.set(originalId, created.id);
    }
    result.importedContracts += 1;

    const lineItems = readArray(item, "lineItems");
    for (const lineItem of lineItems) {
      if (!isRecord(lineItem)) {
        result.skippedRows += 1;
        continue;
      }

      const lineOriginalId = sourceId(lineItem);
      const existingLine = lineOriginalId
        ? await tx.contractLineItem.findFirst({ where: { id: lineOriginalId, tenantId } })
        : null;
      if (existingLine) {
        result.duplicateRows += 1;
        continue;
      }

      await tx.contractLineItem.create({
        data: {
          id: lineOriginalId || undefined,
          tenantId,
          contractId: created.id,
          type: safeLineItemType(readString(lineItem, "type", "SERVICE")),
          pricingType: safePricingType(readString(lineItem, "pricingType", "CUSTOM")),
          category: readOptionalString(lineItem, "category"),
          name: readString(lineItem, "name", "ردیف بازیابی‌شده"),
          sourceId: readOptionalString(lineItem, "sourceId"),
          quantity: Math.max(1, readInt(lineItem, "quantity", 1)),
          unitLabel: readOptionalString(lineItem, "unitLabel"),
          unitPrice: readDecimalString(lineItem, "unitPrice"),
          totalPrice: readDecimalString(lineItem, "totalPrice"),
          note: readOptionalString(lineItem, "note"),
          createdAt: readDate(lineItem, "createdAt"),
        },
      });

      result.importedLineItems += 1;
    }
  }
}

async function restorePayments(
  tx: Prisma.TransactionClient,
  tenantId: string,
  payments: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of payments) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const duplicate = originalId
      ? await tx.payment.findFirst({ where: { id: originalId, tenantId } })
      : null;
    if (duplicate) {
      result.duplicateRows += 1;
      continue;
    }

    const sourceContractId = readString(item, "contractId");
    const sourceCustomerId = readString(item, "customerId");
    const sourcePaymentMethodId = readString(item, "paymentMethodId");
    const paidAt = readDate(item, "paidAt");
    if (!paidAt) {
      result.skippedRows += 1;
      addWarning(result, `یک دریافت به دلیل تاریخ نامعتبر رد شد.`);
      continue;
    }

    await tx.payment.create({
      data: {
        id: originalId || undefined,
        tenantId,
        contractId: maps.contracts.get(sourceContractId),
        customerId: maps.customers.get(sourceCustomerId),
        paymentMethodId: maps.paymentMethods.get(sourcePaymentMethodId),
        type: readString(item, "type", "DEPOSIT"),
        status: readString(item, "status", "RECORDED"),
        amount: readDecimalString(item, "amount"),
        paidAt,
        reference: readOptionalString(item, "reference"),
        referenceNumber: readOptionalString(item, "referenceNumber"),
        trackingCode: readOptionalString(item, "trackingCode"),
        chequeNumber: readOptionalString(item, "chequeNumber"),
        chequeDueDate: readDate(item, "chequeDueDate"),
        receiptImageUrl: readOptionalString(item, "receiptImageUrl"),
        receiptImageKey: readOptionalString(item, "receiptImageKey"),
        note: readOptionalString(item, "note"),
        createdAt: readDate(item, "createdAt"),
      },
    });

    result.importedPayments += 1;
  }
}

async function restoreExpenses(
  tx: Prisma.TransactionClient,
  tenantId: string,
  expenses: unknown[],
  maps: BackupRestoreMaps,
  result: FullBackupRestoreResult,
) {
  for (const item of expenses) {
    if (!isRecord(item)) {
      result.skippedRows += 1;
      continue;
    }

    const originalId = sourceId(item);
    const duplicate = originalId
      ? await tx.expense.findFirst({ where: { id: originalId, tenantId } })
      : null;
    if (duplicate) {
      result.duplicateRows += 1;
      continue;
    }

    const occurredAt = readDate(item, "occurredAt");
    if (!occurredAt) {
      result.skippedRows += 1;
      addWarning(result, "یک هزینه به دلیل تاریخ نامعتبر رد شد.");
      continue;
    }

    await tx.expense.create({
      data: {
        id: originalId || undefined,
        tenantId,
        contractId: maps.contracts.get(readString(item, "contractId")),
        customerId: maps.customers.get(readString(item, "customerId")),
        hallId: maps.halls.get(readString(item, "hallId")),
        salonId: maps.salons.get(readString(item, "salonId")),
        financialCategoryId: maps.financialCategories.get(readString(item, "financialCategoryId")),
        paymentMethodId: maps.paymentMethods.get(readString(item, "paymentMethodId")),
        title: readString(item, "title", "هزینه بازیابی‌شده"),
        amount: readDecimalString(item, "amount"),
        occurredAt,
        status: readString(item, "status", "RECORDED"),
        description: readString(item, "description", ""),
        vendorName: readOptionalString(item, "vendorName"),
        referenceNumber: readOptionalString(item, "referenceNumber"),
        receiptImageUrl: readOptionalString(item, "receiptImageUrl"),
        receiptImageKey: readOptionalString(item, "receiptImageKey"),
        note: readOptionalString(item, "note"),
        createdAt: readDate(item, "createdAt"),
      },
    });

    result.importedExpenses += 1;
  }
}

export async function importFullBackupJsonFile(input: {
  tenantId: string;
  userId: string;
  fileBytes: Uint8Array;
  fileName: string;
}): Promise<FullBackupRestoreResult> {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(input.fileBytes);
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("INVALID_FULL_BACKUP_JSON");
  }

  if (!isRecord(parsed)) {
    throw new Error("INVALID_FULL_BACKUP_JSON_ROOT");
  }

  const meta = readRecord(parsed, "meta");
  if (readString(meta, "app") !== "Talar Manager") {
    throw new Error("UNSUPPORTED_FULL_BACKUP_JSON_APP");
  }

  const baseDefinitions = readRecord(parsed, "baseDefinitions");
  const notificationSettings = readRecord(parsed, "notificationSettings");
  const customers = readArray(parsed, "customers");
  const contracts = readArray(parsed, "contracts");
  const payments = readArray(parsed, "payments");
  const expenses = readArray(parsed, "expenses");
  const maps = createInitialMaps();
  const result: FullBackupRestoreResult = {
    importedCustomers: 0,
    importedContracts: 0,
    importedLineItems: 0,
    importedPayments: 0,
    importedExpenses: 0,
    importedBaseDefinitions: 0,
    updatedRecords: 0,
    skippedRows: 0,
    duplicateRows: 0,
    warnings: [],
  };

  const db = await getPrisma();

  await db.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: input.tenantId },
      data: { name: readOptionalString(meta, "tenantName") ?? undefined },
    });

    await restoreHallProfile(tx, input.tenantId, readRecord(parsed, "hallInfo"), result);
    await restoreContractSettings(tx, input.tenantId, readRecord(baseDefinitions, "contractSettings"), result);
    await restoreHalls(tx, input.tenantId, readArray(baseDefinitions, "halls"), maps, result);
    await restoreSalons(tx, input.tenantId, readArray(baseDefinitions, "salons"), maps, result);
    await restoreServices(tx, input.tenantId, readArray(baseDefinitions, "services"), maps, result);
    await restoreMenus(tx, input.tenantId, readArray(baseDefinitions, "menus"), maps, result);
    await restorePaymentMethods(tx, input.tenantId, readArray(baseDefinitions, "paymentMethods"), maps, result);
    await restoreFinancialCategories(tx, input.tenantId, readArray(baseDefinitions, "financialCategories"), maps, result);
    await restoreNotificationTemplates(tx, input.tenantId, readArray(notificationSettings, "templates"), result);
    await restoreEventTypesFromContracts(tx, input.tenantId, contracts, maps, result);
    await restorePackagesFromContracts(tx, input.tenantId, contracts, maps, result);
    await restoreCustomers(tx, input.tenantId, customers, maps, result);
    await restoreContracts(tx, input.tenantId, contracts, maps, result);
    await restorePayments(tx, input.tenantId, payments, maps, result);
    await restoreExpenses(tx, input.tenantId, expenses, maps, result);
  }, { timeout: 30000 });

  if (result.importedContracts === 0 && result.importedCustomers === 0 && result.importedPayments === 0) {
    addWarning(result, "هیچ مشتری، قرارداد یا دریافتی جدیدی وارد نشد؛ احتمالاً فایل قبلاً بازیابی شده یا با داده‌های فعلی تکراری است.");
  }

  return result;
}
