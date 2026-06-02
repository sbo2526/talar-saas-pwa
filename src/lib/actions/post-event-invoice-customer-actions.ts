"use server";

import type { PostEventInvoiceOffInvoiceReportType, PostEventInvoiceOwnerReviewStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditCreate, auditUpdate } from "@/lib/audit/audit-action-helpers";
import { requireTenantRole } from "@/lib/auth/session";
import { createPortalToken, hashPortalToken, previewPortalToken } from "@/lib/crm/security";
import { getPrisma } from "@/lib/prisma";
import { getDefaultCustomerInvoiceExpiresAt, getIssuedPostEventInvoiceForCustomerToken } from "@/lib/post-event-invoice-customer/data";
import {
  customerInvoiceAccessKind,
  hashOptionalRequestValue,
  normalizeCustomerDate,
  normalizeCustomerText,
  parseCustomerMoney,
  parseMismatchType,
  parseOffInvoiceReportType,
} from "@/lib/post-event-invoice-customer/rules";

function requiredText(formData: FormData, key: string) {
  return normalizeCustomerText(formData.get(key), 220);
}

function yes(value: FormDataEntryValue | null) {
  return String(value ?? "") === "yes";
}

function trimToken(formData: FormData) {
  return String(formData.get("token") ?? "").trim();
}

type CustomerReportInput = {
  reportType: PostEventInvoiceOffInvoiceReportType;
  serviceTitle: string;
  amount: number;
  paidToName: string | null;
  paidToRole: string | null;
  paymentMethod: string | null;
  paymentDate: Date | null;
  receiptFileUrl: string | null;
  customerDescription: string | null;
};

function buildReport(input: Partial<CustomerReportInput> & { reportType: PostEventInvoiceOffInvoiceReportType; serviceTitle: string }, formData?: FormData, prefix?: string): CustomerReportInput {
  return {
    reportType: input.reportType,
    serviceTitle: input.serviceTitle,
    amount: input.amount ?? (prefix && formData ? parseCustomerMoney(formData.get(`${prefix}Amount`)) ?? 0 : 0),
    paidToName: input.paidToName ?? (prefix && formData ? requiredText(formData, `${prefix}PaidToName`) : null),
    paidToRole: input.paidToRole ?? (prefix && formData ? requiredText(formData, `${prefix}PaidToRole`) : null),
    paymentMethod: input.paymentMethod ?? (prefix && formData ? requiredText(formData, `${prefix}PaymentMethod`) : null),
    paymentDate: input.paymentDate ?? (prefix && formData ? normalizeCustomerDate(formData.get(`${prefix}PaymentDate`)) : null),
    receiptFileUrl: input.receiptFileUrl ?? null,
    customerDescription: input.customerDescription ?? (prefix && formData ? normalizeCustomerText(formData.get(`${prefix}Description`), 1200) : null),
  };
}

function parseGenericRows(formData: FormData) {
  const titles = formData.getAll("reportServiceTitle");
  const amounts = formData.getAll("reportAmount");
  const paidToNames = formData.getAll("reportPaidToName");
  const paidToRoles = formData.getAll("reportPaidToRole");
  const paymentMethods = formData.getAll("reportPaymentMethod");
  const descriptions = formData.getAll("reportDescription");
  const types = formData.getAll("reportType");
  const rows: CustomerReportInput[] = [];

  for (let index = 0; index < titles.length; index += 1) {
    const title = normalizeCustomerText(titles[index], 180);
    const amount = parseCustomerMoney(amounts[index]);
    const hasAny = Boolean(title || normalizeCustomerText(descriptions[index], 20) || amounts[index]?.toString().trim());
    if (!hasAny) continue;
    if (!title || amount === null) throw new Error("INVALID_REPORT_ROW");

    rows.push({
      reportType: parseOffInvoiceReportType(types[index] ?? null),
      serviceTitle: title,
      amount,
      paidToName: normalizeCustomerText(paidToNames[index], 160),
      paidToRole: normalizeCustomerText(paidToRoles[index], 120),
      paymentMethod: normalizeCustomerText(paymentMethods[index], 120),
      paymentDate: null,
      receiptFileUrl: null,
      customerDescription: normalizeCustomerText(descriptions[index], 1200),
    });
  }

  return rows;
}

function parseCustomerReports(formData: FormData) {
  const reports: CustomerReportInput[] = [];

  if (yes(formData.get("hasGeneralExtraPayment"))) {
    const genericRows = parseGenericRows(formData).filter((row) => row.reportType === "GENERAL_EXTRA_PAYMENT" || row.reportType === "OTHER");
    if (genericRows.length === 0) throw new Error("GENERAL_REPORT_REQUIRED");
    reports.push(...genericRows.map((row) => ({ ...row, reportType: row.reportType === "OTHER" ? "GENERAL_EXTRA_PAYMENT" : row.reportType })));
  }

  const photoVideoAnswer = String(formData.get("photoVideoPayment") ?? "no");
  if (photoVideoAnswer !== "no") {
    const title = requiredText(formData, "photoVideoServiceTitle") ?? "عکاسی / فیلمبرداری";
    const amount = parseCustomerMoney(formData.get("photoVideoAmount"));
    if (amount === null) throw new Error("PHOTO_VIDEO_REPORT_REQUIRED");
    reports.push(buildReport({ reportType: "PHOTO_VIDEO", serviceTitle: title, amount }, formData, "photoVideo"));
  }

  if (yes(formData.get("hasOtherServicePayment"))) {
    const serviceRows = parseGenericRows(formData).filter((row) => row.reportType !== "GENERAL_EXTRA_PAYMENT");
    if (serviceRows.length === 0) throw new Error("OTHER_SERVICE_REPORT_REQUIRED");
    reports.push(...serviceRows);
  }

  const staffAnswer = String(formData.get("staffRequestedPayment") ?? "no");
  if (staffAnswer !== "no") {
    const paid = staffAnswer === "paid";
    const amount = paid ? parseCustomerMoney(formData.get("staffAmount")) : 0;
    if (paid && amount === null) throw new Error("STAFF_PAYMENT_AMOUNT_REQUIRED");
    reports.push(buildReport({
      reportType: "STAFF_REQUESTED_PAYMENT",
      serviceTitle: requiredText(formData, "staffServiceTitle") ?? "درخواست یا دریافت مبلغ توسط عوامل اجرایی",
      amount: amount ?? 0,
    }, formData, "staff"));
  }

  return reports;
}

export async function createPostEventInvoiceCustomerLinkAction(formData: FormData) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  if (!invoiceId) redirect("/dashboard/post-event-invoices?error=invalid-link-request");
  const db = await getPrisma();
  const token = createPortalToken();
  const tokenHash = hashPortalToken(token);
  let createdId: string | null = null;

  const invoice = await db.postEventInvoice.findFirst({
    where: { id: invoiceId, tenantId: membership.tenantId, status: "ISSUED" },
    include: { contract: { select: { id: true, customerId: true, contractNo: true } } },
  });

  if (!invoice) redirect(`/dashboard/post-event-invoices/${invoiceId}?error=issued-invoice-required`);

  const existing = await db.postEventInvoiceAccessLink.findFirst({
    where: { tenantId: membership.tenantId, invoiceId: invoice.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) redirect(`/dashboard/post-event-invoices/${invoice.id}?link=exists`);

  const link = await db.postEventInvoiceAccessLink.create({
    data: {
      tenantId: membership.tenantId,
      invoiceId: invoice.id,
      contractId: invoice.contractId,
      customerId: invoice.contract.customerId,
      tokenHash,
      tokenPreview: previewPortalToken(token),
      expiresAt: getDefaultCustomerInvoiceExpiresAt(),
      createdByUserId: membership.userId,
      notes: customerInvoiceAccessKind,
    },
  });
  createdId = link.id;

  await auditCreate({
    membership,
    entityType: "POST_EVENT_INVOICE_ACCESS_LINK",
    entityLabel: "لینک مشتری صورتحساب",
    entityId: link.id,
    recordLabel: invoice.invoiceNumber,
    title: "ایجاد لینک امن صورتحساب مشتری",
    afterData: { invoiceId: invoice.id, contractId: invoice.contractId, tokenPreview: link.tokenPreview },
    href: `/dashboard/post-event-invoices/${invoice.id}`,
  });

  revalidatePath(`/dashboard/post-event-invoices/${invoice.id}`);
  revalidatePath("/dashboard/post-event-invoices");
  redirect(`/dashboard/post-event-invoices/${invoice.id}?createdToken=${encodeURIComponent(token)}&linkId=${createdId}`);
}

export async function submitPostEventInvoiceCustomerFeedbackAction(formData: FormData) {
  const token = trimToken(formData);
  const link = await getIssuedPostEventInvoiceForCustomerToken(token);
  if (!link) redirect("/portal/invoices/invalid?error=invalid-token");

  const db = await getPrisma();
  const existing = await db.postEventInvoiceCustomerFeedback.findFirst({ where: { accessLinkId: link.id } });
  if (existing) redirect(`/portal/invoices/${encodeURIComponent(token)}?submitted=already`);

  const reports = parseCustomerReports(formData);
  const hasOffInvoicePayment = reports.length > 0;
  const hasMismatch = String(formData.get("invoiceMismatch") ?? "no") === "yes";
  const mismatchType = hasMismatch ? parseMismatchType(formData.get("mismatchType")) : null;
  const mismatchDescription = hasMismatch ? normalizeCustomerText(formData.get("mismatchDescription"), 1500) : null;

  if (hasMismatch && (!mismatchType || !mismatchDescription)) {
    redirect(`/portal/invoices/${encodeURIComponent(token)}?error=mismatch-required`);
  }

  const feedbackStatus = hasOffInvoicePayment || hasMismatch ? "OWNER_REVIEW_REQUIRED" : "SUBMITTED";

  const feedback = await db.postEventInvoiceCustomerFeedback.create({
    data: {
      tenantId: link.tenantId,
      invoiceId: link.invoiceId,
      contractId: link.contractId,
      customerId: link.customerId,
      accessLinkId: link.id,
      feedbackStatus,
      customerConfirmedInvoice: !hasMismatch,
      hasMismatch,
      mismatchType,
      mismatchDescription,
      hasOffInvoicePayment,
      customerGeneralNote: normalizeCustomerText(formData.get("customerGeneralNote"), 1200),
      customerIpHash: hashOptionalRequestValue(formData.get("customerIp")?.toString()),
      userAgentHash: hashOptionalRequestValue(formData.get("userAgent")?.toString()),
      offInvoiceReports: {
        create: reports.map((report) => ({
          tenantId: link.tenantId,
          invoiceId: link.invoiceId,
          contractId: link.contractId,
          reportType: report.reportType,
          serviceTitle: report.serviceTitle,
          amount: report.amount,
          paidToName: report.paidToName,
          paidToRole: report.paidToRole,
          paymentMethod: report.paymentMethod,
          paymentDate: report.paymentDate,
          receiptFileUrl: report.receiptFileUrl,
          customerDescription: report.customerDescription,
          ownerReviewStatus: "OWNER_REVIEW_REQUIRED",
        })),
      },
    },
  });

  await db.auditLog.create({
    data: {
      tenantId: link.tenantId,
      userId: null,
      action: "CREATE",
      entityType: "POST_EVENT_INVOICE_CUSTOMER_FEEDBACK",
      entityId: feedback.id,
      title: hasOffInvoicePayment ? "گزارش پرداخت خارج از صورتحساب ثبت شد" : "پاسخ مشتری به صورتحساب ثبت شد",
      message: hasOffInvoicePayment ? "گزارش پرداخت خارج از صورتحساب نیازمند بررسی مالک است." : "مشتری پاسخ صورتحساب را ثبت کرد.",
      afterData: { invoiceId: link.invoiceId, contractId: link.contractId, hasOffInvoicePayment, hasMismatch, reportCount: reports.length },
      href: "/dashboard/reports/off-invoice",
    },
  });

  revalidatePath(`/portal/invoices/${token}`);
  revalidatePath("/dashboard/reports/off-invoice");
  revalidatePath(`/dashboard/post-event-invoices/${link.invoiceId}`);
  redirect(`/portal/invoices/${encodeURIComponent(token)}?submitted=1`);
}

export async function reviewOffInvoiceReportAction(formData: FormData) {
  const membership = await requireTenantRole(["OWNER", "ADMIN"]);
  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("ownerReviewStatus") ?? "").trim();
  const allowed: PostEventInvoiceOwnerReviewStatus[] = ["OWNER_REVIEW_REQUIRED", "CONFIRMED_OFF_INVOICE", "REJECTED", "MARKED_AS_ALLOWED_SIDE_SERVICE"];
  if (!reportId || !allowed.includes(status as PostEventInvoiceOwnerReviewStatus)) redirect("/dashboard/reports/off-invoice?error=invalid-review");
  const ownerReviewStatus = status as PostEventInvoiceOwnerReviewStatus;

  const db = await getPrisma();
  const report = await db.postEventInvoiceOffInvoiceReport.findFirst({ where: { id: reportId, tenantId: membership.tenantId } });
  if (!report) redirect("/dashboard/reports/off-invoice?error=not-found");

  await db.postEventInvoiceOffInvoiceReport.update({
    where: { id: report.id },
    data: {
      ownerReviewStatus,
      ownerDecision: ownerReviewStatus,
      ownerNote: normalizeCustomerText(formData.get("ownerNote"), 1200),
    },
  });

  await auditUpdate({
    membership,
    entityType: "POST_EVENT_INVOICE_OFF_INVOICE_REPORT",
    entityLabel: "گزارش پرداخت خارج از فاکتور",
    entityId: report.id,
    recordLabel: report.serviceTitle,
    title: "ثبت نظر مالک برای گزارش خارج از فاکتور",
    actionLabel: "بررسی مالک",
    afterData: { ownerReviewStatus },
    href: "/dashboard/reports/off-invoice",
  });

  revalidatePath("/dashboard/reports/off-invoice");
  redirect("/dashboard/reports/off-invoice?reviewed=1");
}
