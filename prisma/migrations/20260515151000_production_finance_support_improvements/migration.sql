-- Production improvements: hall print logo, smart receipts/cheques, expense cheques, support tickets.

ALTER TABLE "TenantHallProfile"
  ADD COLUMN IF NOT EXISTS "hallLogoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "hallLogoKey" TEXT;

CREATE TABLE IF NOT EXISTS "PaymentInstallment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "contractId" TEXT,
  "installmentNumber" INTEGER NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentCheque" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "contractId" TEXT,
  "chequeNumber" TEXT NOT NULL,
  "bankName" TEXT,
  "branchName" TEXT,
  "ownerName" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentCheque_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExpenseCheque" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "chequeNumber" TEXT NOT NULL,
  "bankName" TEXT,
  "branchName" TEXT,
  "recipientName" TEXT,
  "amount" DECIMAL(14,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExpenseCheque_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "ticketNumber" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicketMessage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "senderUserId" TEXT,
  "senderType" TEXT NOT NULL DEFAULT 'USER',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SupportTicketAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "messageId" TEXT,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileKey" TEXT,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentInstallment_paymentId_installmentNumber_key" ON "PaymentInstallment"("paymentId", "installmentNumber");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_tenantId_idx" ON "PaymentInstallment"("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_paymentId_idx" ON "PaymentInstallment"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_contractId_idx" ON "PaymentInstallment"("contractId");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_status_idx" ON "PaymentInstallment"("status");
CREATE INDEX IF NOT EXISTS "PaymentInstallment_dueDate_idx" ON "PaymentInstallment"("dueDate");
CREATE INDEX IF NOT EXISTS "PaymentCheque_tenantId_idx" ON "PaymentCheque"("tenantId");
CREATE INDEX IF NOT EXISTS "PaymentCheque_paymentId_idx" ON "PaymentCheque"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentCheque_contractId_idx" ON "PaymentCheque"("contractId");
CREATE INDEX IF NOT EXISTS "PaymentCheque_status_idx" ON "PaymentCheque"("status");
CREATE INDEX IF NOT EXISTS "PaymentCheque_dueDate_idx" ON "PaymentCheque"("dueDate");
CREATE INDEX IF NOT EXISTS "ExpenseCheque_tenantId_idx" ON "ExpenseCheque"("tenantId");
CREATE INDEX IF NOT EXISTS "ExpenseCheque_expenseId_idx" ON "ExpenseCheque"("expenseId");
CREATE INDEX IF NOT EXISTS "ExpenseCheque_status_idx" ON "ExpenseCheque"("status");
CREATE INDEX IF NOT EXISTS "ExpenseCheque_dueDate_idx" ON "ExpenseCheque"("dueDate");
CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_tenantId_ticketNumber_key" ON "SupportTicket"("tenantId", "ticketNumber");
CREATE INDEX IF NOT EXISTS "SupportTicket_tenantId_idx" ON "SupportTicket"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdByUserId_idx" ON "SupportTicket"("createdByUserId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_category_idx" ON "SupportTicket"("category");
CREATE INDEX IF NOT EXISTS "SupportTicket_lastMessageAt_idx" ON "SupportTicket"("lastMessageAt");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_tenantId_idx" ON "SupportTicketMessage"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_ticketId_idx" ON "SupportTicketMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_senderUserId_idx" ON "SupportTicketMessage"("senderUserId");
CREATE INDEX IF NOT EXISTS "SupportTicketMessage_createdAt_idx" ON "SupportTicketMessage"("createdAt");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_tenantId_idx" ON "SupportTicketAttachment"("tenantId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_messageId_idx" ON "SupportTicketAttachment"("messageId");
CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_createdAt_idx" ON "SupportTicketAttachment"("createdAt");

ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentCheque" ADD CONSTRAINT "PaymentCheque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentCheque" ADD CONSTRAINT "PaymentCheque_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentCheque" ADD CONSTRAINT "PaymentCheque_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExpenseCheque" ADD CONSTRAINT "ExpenseCheque_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseCheque" ADD CONSTRAINT "ExpenseCheque_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "SupportTicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
