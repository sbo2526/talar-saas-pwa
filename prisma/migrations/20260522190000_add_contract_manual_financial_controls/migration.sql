-- Add manual financial control markers for contract category totals, final total, and remaining amount.
ALTER TABLE "Contract"
  ADD COLUMN "servicesTotalManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "menuTotalManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "finalTotalManual" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remainingAmountManual" BOOLEAN NOT NULL DEFAULT false;
