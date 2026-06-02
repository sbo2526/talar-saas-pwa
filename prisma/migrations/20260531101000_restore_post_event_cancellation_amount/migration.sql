-- Restore missing manual cancellation amount columns used by contract detail and settlement screens.
ALTER TABLE "PostEventConfirmation" ADD COLUMN IF NOT EXISTS "cancellationAmount" DECIMAL(14, 2);
ALTER TABLE "PostEventConfirmation" ADD COLUMN IF NOT EXISTS "cancellationAmountManual" BOOLEAN NOT NULL DEFAULT false;
