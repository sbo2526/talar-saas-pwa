import { formatContractTime } from "@/lib/contracts/display";
import {
  contractStatusLabels,
  getPaidAmount,
  getRemainingAmount,
  toNumber,
} from "@/lib/contracts/display";
import { formatJalaliDate, formatJalaliDateTime, formatJalaliDayKey, formatJalaliWeekday, toPersianDigits } from "@/lib/date/jalali";
import { getExpenseStatusLabel } from "@/lib/expenses/display";
import { formatIRR, formatPersianNumber } from "@/lib/formatters";
import {
  formatPaymentMethodLabel,
  getPaymentRecordStatusLabel,
  getPaymentTypeLabel,
} from "@/lib/payments/display";
import { getPrisma } from "@/lib/prisma";
import type { CsvHeader } from "./csv";

type ExportRow = Record<string, unknown>;

type ExportResult<T extends ExportRow> = {
  headers: CsvHeader<T>[];
  rows: T[];
};

export const backupExportTypeLabels: Record<string, string> = {
  CONTRACTS: "خروجی قراردادها",
  CUSTOMERS: "خروجی مشتریان",
  PAYMENTS: "خروجی دریافت‌ها",
  EXPENSES: "خروجی هزینه‌ها",
  FINANCIAL_REPORT: "خروجی گزارش مالی",
  FULL_BACKUP: "نسخه پشتیبان کامل",
  FULL_BACKUP_REVIEW: "بازبینی نسخه پشتیبان کامل",
  FULL_BACKUP_RESTORE: "بازیابی نسخه پشتیبان کامل JSON",
  LEGACY_SQLITE_IMPORT: "بازگردانی بکاپ نرم‌افزار قدیمی",
};

export const backupExportStatusLabels: Record<string, string> = {
  COMPLETED: "انجام‌شده",
  FAILED: "ناموفق",
  PROCESSING: "در حال پردازش",
  REVIEW_REQUIRED: "نیازمند بررسی",
};

export const backupExportFormatLabels: Record<string, string> = {
  CSV: "CSV",
  JSON: "JSON",
  SQLITE: "SQLite DB",
};

export function createExportFileName(prefix: string, extension: "csv" | "json") {
  return `${prefix}-${toPersianDigits(formatJalaliDayKey(new Date()))}.${extension}`;
}

export function createAttachmentHeaders(fileName: string, contentType: string) {
  return {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Content-Type": contentType,
  };
}

export async function logBackupExport({
  tenantId,
  type,
  format,
  fileName,
  requestedBy,
  recordCount,
  status = "COMPLETED",
  errorMessage,
}: {
  tenantId: string;
  type: string;
  format: string;
  fileName?: string;
  requestedBy?: string;
  recordCount?: number;
  status?: "COMPLETED" | "FAILED" | "PROCESSING" | "REVIEW_REQUIRED";
  errorMessage?: string;
}) {
  try {
    const db = await getPrisma();

    await db.backupExportLog.create({
      data: {
        tenantId,
        type,
        format,
        fileName,
        requestedBy,
        recordCount,
        status,
        errorMessage,
      },
    });
  } catch (error) {
    console.error("Failed to write backup export log", error);
  }
}

export async function getContractsExportData(
  tenantId: string,
): Promise<ExportResult<ExportRow>> {
  const db = await getPrisma();
  const contracts = await db.contract.findMany({
    where: { tenantId },
    include: {
      customer: {
        select: {
          fullName: true,
          phone: true,
          nationalCode: true,
          nationalId: true,
        },
      },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
      payments: {
        select: {
          amount: true,
          status: true,
          type: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    headers: [
      { key: "contractNo", label: "شماره قرارداد" },
      { key: "customerName", label: "نام مشتری" },
      { key: "customerPhone", label: "شماره همراه" },
      { key: "customerNationalCode", label: "کد ملی" },
      { key: "eventType", label: "نوع مراسم" },
      { key: "eventDate", label: "تاریخ مراسم" },
      { key: "eventDay", label: "روز مراسم" },
      { key: "startTime", label: "ساعت شروع" },
      { key: "endTime", label: "ساعت پایان" },
      { key: "guestCount", label: "تعداد مهمان" },
      { key: "hall", label: "تالار" },
      { key: "salon", label: "سالن" },
      { key: "status", label: "وضعیت قرارداد" },
      { key: "servicesTotal", label: "جمع خدمات" },
      { key: "menuTotal", label: "جمع منو" },
      { key: "discountAmount", label: "تخفیف" },
      { key: "depositAmount", label: "بیعانه" },
      { key: "finalTotal", label: "مبلغ نهایی" },
      { key: "paidAmount", label: "دریافت‌شده" },
      { key: "remainingAmount", label: "مانده" },
      { key: "createdAt", label: "تاریخ ثبت" },
    ],
    rows: contracts.map((contract) => {
      const paidAmount = getPaidAmount(contract.payments, contract.depositAmount);
      const remainingAmount = contract.status === "CANCELED" ? 0 : getRemainingAmount(contract.finalTotal, paidAmount);

      return {
        contractNo: toPersianDigits(contract.contractNo),
        customerName: contract.customer?.fullName ?? "ثبت نشده",
        customerPhone: contract.customer?.phone
          ? toPersianDigits(contract.customer.phone)
          : "ثبت نشده",
        customerNationalCode:
          contract.customer?.nationalCode || contract.customer?.nationalId
            ? toPersianDigits(contract.customer.nationalCode ?? contract.customer.nationalId ?? "")
            : "ثبت نشده",
        eventType: contract.eventTypeName ?? "ثبت نشده",
        eventDate: formatJalaliDate(contract.eventDate),
        eventDay: formatJalaliWeekday(contract.eventDate),
        startTime: formatContractTime(contract.eventStartTime),
        endTime: formatContractTime(contract.eventEndTime),
        guestCount: formatPersianNumber(contract.guestCount),
        hall: contract.hall?.name ?? "ثبت نشده",
        salon: contract.salon?.name ?? "ثبت نشده",
        status: contractStatusLabels[contract.status],
        servicesTotal: formatIRR(toNumber(contract.servicesTotal)),
        menuTotal: formatIRR(toNumber(contract.menuTotal)),
        discountAmount: formatIRR(toNumber(contract.discountAmount)),
        depositAmount: formatIRR(toNumber(contract.depositAmount)),
        finalTotal: formatIRR(toNumber(contract.finalTotal)),
        paidAmount: formatIRR(paidAmount),
        remainingAmount: formatIRR(remainingAmount),
        createdAt: formatJalaliDateTime(contract.createdAt),
      };
    }),
  };
}

export async function getCustomersExportData(
  tenantId: string,
): Promise<ExportResult<ExportRow>> {
  const db = await getPrisma();
  const customers = await db.customer.findMany({
    where: { tenantId },
    include: {
      contracts: {
        select: {
          finalTotal: true,
          depositAmount: true,
          payments: {
            select: {
              amount: true,
              status: true,
              type: true,
            },
          },
        },
      },
      _count: {
        select: { contracts: true, payments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    headers: [
      { key: "fullName", label: "نام مشتری" },
      { key: "phone", label: "شماره همراه" },
      { key: "nationalCode", label: "کد ملی" },
      { key: "address", label: "نشانی" },
      { key: "contractsCount", label: "تعداد قرارداد" },
      { key: "paymentsCount", label: "تعداد دریافت" },
      { key: "totalContracts", label: "جمع قراردادها" },
      { key: "paidAmount", label: "دریافت‌شده" },
      { key: "remainingAmount", label: "مانده" },
      { key: "status", label: "وضعیت" },
      { key: "createdAt", label: "تاریخ ثبت" },
    ],
    rows: customers.map((customer) => {
      const paidAmount = customer.contracts.reduce(
        (sum, contract) => sum + getPaidAmount(contract.payments, contract.depositAmount),
        0,
      );
      const totalContracts = customer.contracts.reduce((sum, contract) => {
        const paid = getPaidAmount(contract.payments, contract.depositAmount);
        return sum + (contract.status === "CANCELED" ? paid : toNumber(contract.finalTotal));
      }, 0);

      return {
        fullName: customer.fullName,
        phone: customer.phone ? toPersianDigits(customer.phone) : "ثبت نشده",
        nationalCode:
          customer.nationalCode || customer.nationalId
            ? toPersianDigits(customer.nationalCode ?? customer.nationalId ?? "")
            : "ثبت نشده",
        address: customer.address ?? "ثبت نشده",
        contractsCount: formatPersianNumber(customer._count.contracts),
        paymentsCount: formatPersianNumber(customer._count.payments),
        totalContracts: formatIRR(totalContracts),
        paidAmount: formatIRR(paidAmount),
        remainingAmount: formatIRR(Math.max(0, totalContracts - paidAmount)),
        status: customer.isActive ? "فعال" : "غیرفعال",
        createdAt: formatJalaliDateTime(customer.createdAt),
      };
    }),
  };
}

export async function getPaymentsExportData(
  tenantId: string,
): Promise<ExportResult<ExportRow>> {
  const db = await getPrisma();
  const payments = await db.payment.findMany({
    where: { tenantId },
    include: {
      contract: {
        select: {
          contractNo: true,
          eventDate: true,
        },
      },
      customer: { select: { fullName: true, phone: true } },
      paymentMethod: {
        select: {
          title: true,
          type: true,
        },
      },
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    headers: [
      { key: "type", label: "نوع دریافت" },
      { key: "status", label: "وضعیت" },
      { key: "amount", label: "مبلغ" },
      { key: "paidAt", label: "تاریخ دریافت" },
      { key: "contractNo", label: "شماره قرارداد" },
      { key: "eventDate", label: "تاریخ مراسم" },
      { key: "customerName", label: "مشتری" },
      { key: "customerPhone", label: "شماره همراه" },
      { key: "paymentMethod", label: "روش دریافت" },
      { key: "reference", label: "شناسه پیگیری" },
      { key: "chequeDueDate", label: "سررسید چک" },
      { key: "note", label: "یادداشت" },
    ],
    rows: payments.map((payment) => ({
      type: getPaymentTypeLabel(payment.type),
      status: getPaymentRecordStatusLabel(payment.status),
      amount: formatIRR(toNumber(payment.amount)),
      paidAt: formatJalaliDate(payment.paidAt),
      contractNo: payment.contract?.contractNo
        ? toPersianDigits(payment.contract.contractNo)
        : "ثبت نشده",
      eventDate: payment.contract?.eventDate
        ? formatJalaliDate(payment.contract.eventDate)
        : "ثبت نشده",
      customerName: payment.customer?.fullName ?? "ثبت نشده",
      customerPhone: payment.customer?.phone
        ? toPersianDigits(payment.customer.phone)
        : "ثبت نشده",
      paymentMethod: formatPaymentMethodLabel(payment.paymentMethod),
      reference: payment.trackingCode || payment.referenceNumber || payment.chequeNumber || payment.reference
        ? toPersianDigits(
            payment.trackingCode ??
              payment.referenceNumber ??
              payment.chequeNumber ??
              payment.reference ??
              "",
          )
        : "ثبت نشده",
      chequeDueDate: payment.chequeDueDate
        ? formatJalaliDate(payment.chequeDueDate)
        : "ثبت نشده",
      note: payment.note ?? "ثبت نشده",
    })),
  };
}

export async function getExpensesExportData(
  tenantId: string,
): Promise<ExportResult<ExportRow>> {
  const db = await getPrisma();
  const expenses = await db.expense.findMany({
    where: { tenantId },
    include: {
      contract: { select: { contractNo: true } },
      customer: { select: { fullName: true } },
      hall: { select: { name: true } },
      salon: { select: { name: true } },
      financialCategory: { select: { title: true } },
      paymentMethod: { select: { title: true, type: true } },
    },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    headers: [
      { key: "title", label: "عنوان هزینه" },
      { key: "amount", label: "مبلغ" },
      { key: "occurredAt", label: "تاریخ هزینه" },
      { key: "status", label: "وضعیت" },
      { key: "category", label: "دسته‌بندی مالی" },
      { key: "paymentMethod", label: "روش دریافت" },
      { key: "contractNo", label: "شماره قرارداد" },
      { key: "customerName", label: "مشتری" },
      { key: "hall", label: "تالار" },
      { key: "salon", label: "سالن" },
      { key: "vendorName", label: "دریافت‌کننده" },
      { key: "referenceNumber", label: "شماره رسید" },
      { key: "description", label: "شرح" },
    ],
    rows: expenses.map((expense) => ({
      title: expense.title,
      amount: formatIRR(toNumber(expense.amount)),
      occurredAt: formatJalaliDate(expense.occurredAt),
      status: getExpenseStatusLabel(expense.status),
      category: expense.financialCategory?.title ?? "ثبت نشده",
      paymentMethod: formatPaymentMethodLabel(expense.paymentMethod),
      contractNo: expense.contract?.contractNo
        ? toPersianDigits(expense.contract.contractNo)
        : "ثبت نشده",
      customerName: expense.customer?.fullName ?? "ثبت نشده",
      hall: expense.hall?.name ?? "ثبت نشده",
      salon: expense.salon?.name ?? "ثبت نشده",
      vendorName: expense.vendorName ?? "ثبت نشده",
      referenceNumber: expense.referenceNumber
        ? toPersianDigits(expense.referenceNumber)
        : "ثبت نشده",
      description: expense.description ?? expense.note ?? "ثبت نشده",
    })),
  };
}

export async function getFullBackupData(tenantId: string) {
  const db = await getPrisma();
  const now = new Date();

  const [
    tenant,
    hallInfo,
    customers,
    contracts,
    payments,
    expenses,
    halls,
    salons,
    services,
    menus,
    paymentMethods,
    financialCategories,
    contractSettings,
    telegramSetting,
    smsSetting,
    notificationTemplates,
  ] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, status: true, createdAt: true },
    }),
    db.tenantHallProfile.findUnique({ where: { tenantId } }),
    db.customer.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.contract.findMany({
      where: { tenantId },
      include: {
        lineItems: true,
        customer: { select: { id: true, fullName: true, phone: true } },
        hall: { select: { id: true, name: true } },
        salon: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.payment.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.expense.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.hall.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.salon.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
    db.service.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.menu.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.paymentMethod.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.financialCategory.findMany({ where: { tenantId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    db.contractSetting.findUnique({ where: { tenantId } }),
    db.telegramIntegrationSetting.findUnique({ where: { tenantId } }),
    db.smsIntegrationSetting.findUnique({ where: { tenantId } }),
    db.notificationTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }),
  ]);

  const telegram = telegramSetting
    ? {
        isEnabled: telegramSetting.isEnabled,
        chatIdConfigured: Boolean(telegramSetting.chatId),
        chatTitle: telegramSetting.chatTitle,
        botTokenConfigured: Boolean(telegramSetting.botTokenEncrypted),
        botTokenMasked: telegramSetting.botTokenMasked,
        sendContractEvents: telegramSetting.sendContractEvents,
        sendPaymentEvents: telegramSetting.sendPaymentEvents,
        sendExpenseEvents: telegramSetting.sendExpenseEvents,
        sendCustomerEvents: telegramSetting.sendCustomerEvents,
        sendSecurityEvents: telegramSetting.sendSecurityEvents,
        sendDailyReports: telegramSetting.sendDailyReports,
        sendWeeklyReports: telegramSetting.sendWeeklyReports,
        sendMonthlyReports: telegramSetting.sendMonthlyReports,
        sendEventReminders: telegramSetting.sendEventReminders,
        sendOutstandingBalanceReminders: telegramSetting.sendOutstandingBalanceReminders,
        lastSuccessAt: telegramSetting.lastSuccessAt,
        lastErrorAt: telegramSetting.lastErrorAt,
      }
    : null;

  const sms = smsSetting
    ? {
        isEnabled: smsSetting.isEnabled,
        provider: smsSetting.provider,
        senderNumber: smsSetting.senderNumber,
        managerMobile: smsSetting.managerMobile,
        apiKeyConfigured: Boolean(smsSetting.apiKeyEncrypted),
        apiKeyMasked: smsSetting.apiKeyMasked,
        sendToManager: smsSetting.sendToManager,
        sendToCustomer: smsSetting.sendToCustomer,
        sendContractEvents: smsSetting.sendContractEvents,
        sendPaymentEvents: smsSetting.sendPaymentEvents,
        sendExpenseEvents: smsSetting.sendExpenseEvents,
        sendCustomerEvents: smsSetting.sendCustomerEvents,
        sendDailyReports: smsSetting.sendDailyReports,
        sendWeeklyReports: smsSetting.sendWeeklyReports,
        sendMonthlyReports: smsSetting.sendMonthlyReports,
        sendEventReminders: smsSetting.sendEventReminders,
        sendOutstandingBalanceReminders: smsSetting.sendOutstandingBalanceReminders,
        lastSuccessAt: smsSetting.lastSuccessAt,
        lastErrorAt: smsSetting.lastErrorAt,
      }
    : null;

  return {
    meta: {
      app: "Talar Manager",
      tenantName: tenant?.name ?? "ثبت نشده",
      exportedAt: now.toISOString(),
      exportedAtJalali: formatJalaliDateTime(now),
      version: 1,
    },
    tenant,
    hallInfo,
    customers,
    contracts,
    payments,
    expenses,
    baseDefinitions: {
      halls,
      salons,
      services,
      menus,
      paymentMethods,
      financialCategories,
      contractSettings,
    },
    notificationSettings: {
      telegram,
      sms,
      templates: notificationTemplates,
    },
  };
}
