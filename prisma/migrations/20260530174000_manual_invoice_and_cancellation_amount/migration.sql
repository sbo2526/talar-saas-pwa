-- Add manual cancellation amount support for post-event non-held contracts.
ALTER TABLE "PostEventConfirmation" ADD COLUMN "cancellationAmount" DECIMAL(14,2);
ALTER TABLE "PostEventConfirmation" ADD COLUMN "cancellationAmountManual" BOOLEAN NOT NULL DEFAULT false;
