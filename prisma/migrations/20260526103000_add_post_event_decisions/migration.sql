-- Phase 29: forced post-event decision foundation for past event contracts.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostEventDecisionStatus') THEN
        CREATE TYPE "PostEventDecisionStatus" AS ENUM (
            'HELD',
            'NOT_HELD_CANCELLATION',
            'NOT_HELD_VALID_RESCHEDULE',
            'NOT_HELD_LATE_RESCHEDULE_OWNER_REVIEW'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostEventNotHeldReason') THEN
        CREATE TYPE "PostEventNotHeldReason" AS ENUM (
            'CANCELLATION',
            'RESCHEDULE'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PostEventDecision" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "hallId" TEXT,
    "decisionStatus" "PostEventDecisionStatus" NOT NULL,
    "notHeldReason" "PostEventNotHeldReason",
    "rescheduledToDate" TIMESTAMP(3),
    "rescheduleRegisteredAt" TIMESTAMP(3),
    "isLateReschedule" BOOLEAN NOT NULL DEFAULT false,
    "requiresOwnerReview" BOOLEAN NOT NULL DEFAULT false,
    "ownerReviewReason" TEXT,
    "cancellationFlowLinked" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReferenceId" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "operatorNote" TEXT,
    "ownerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PostEventDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PostEventDecision_contractId_key" ON "PostEventDecision"("contractId");
CREATE INDEX IF NOT EXISTS "PostEventDecision_tenantId_idx" ON "PostEventDecision"("tenantId");
CREATE INDEX IF NOT EXISTS "PostEventDecision_hallId_idx" ON "PostEventDecision"("hallId");
CREATE INDEX IF NOT EXISTS "PostEventDecision_decidedByUserId_idx" ON "PostEventDecision"("decidedByUserId");
CREATE INDEX IF NOT EXISTS "PostEventDecision_decisionStatus_idx" ON "PostEventDecision"("decisionStatus");
CREATE INDEX IF NOT EXISTS "PostEventDecision_tenantId_decisionStatus_idx" ON "PostEventDecision"("tenantId", "decisionStatus");
CREATE INDEX IF NOT EXISTS "PostEventDecision_tenantId_requiresOwnerReview_idx" ON "PostEventDecision"("tenantId", "requiresOwnerReview");
CREATE INDEX IF NOT EXISTS "PostEventDecision_tenantId_isLateReschedule_idx" ON "PostEventDecision"("tenantId", "isLateReschedule");
CREATE INDEX IF NOT EXISTS "PostEventDecision_decidedAt_idx" ON "PostEventDecision"("decidedAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PostEventDecision_tenantId_fkey'
    ) THEN
        ALTER TABLE "PostEventDecision"
        ADD CONSTRAINT "PostEventDecision_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PostEventDecision_contractId_fkey'
    ) THEN
        ALTER TABLE "PostEventDecision"
        ADD CONSTRAINT "PostEventDecision_contractId_fkey"
        FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PostEventDecision_hallId_fkey'
    ) THEN
        ALTER TABLE "PostEventDecision"
        ADD CONSTRAINT "PostEventDecision_hallId_fkey"
        FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'PostEventDecision_decidedByUserId_fkey'
    ) THEN
        ALTER TABLE "PostEventDecision"
        ADD CONSTRAINT "PostEventDecision_decidedByUserId_fkey"
        FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
