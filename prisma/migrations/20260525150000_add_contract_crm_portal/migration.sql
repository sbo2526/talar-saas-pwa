-- Adds phased contract portal, guest link, CRM, wedding profile and music request foundation.
CREATE TABLE IF NOT EXISTS "ContractAccessLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPreview" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractAccessLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContractFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "linkId" TEXT,
    "audience" TEXT NOT NULL,
    "fullName" TEXT,
    "mobile" TEXT,
    "ratingOverall" INTEGER,
    "ratingContractManager" INTEGER,
    "message" TEXT,
    "suggestion" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CONTRACT_PORTAL',
    "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContractFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerClubMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "contractId" TEXT,
    "source" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationalCode" TEXT,
    "city" TEXT,
    "birthDateText" TEXT,
    "marriedStatus" TEXT,
    "marriageDateText" TEXT,
    "consentClub" BOOLEAN NOT NULL DEFAULT false,
    "consentOccasionSms" BOOLEAN NOT NULL DEFAULT false,
    "consentPromotionSms" BOOLEAN NOT NULL DEFAULT false,
    "consentReminderSms" BOOLEAN NOT NULL DEFAULT false,
    "consentMusicStatusSms" BOOLEAN NOT NULL DEFAULT false,
    "sourceLinkKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerClubMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeddingProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "brideFirstName" TEXT,
    "brideLastName" TEXT,
    "bridePhone" TEXT,
    "brideBirthDateText" TEXT,
    "groomFirstName" TEXT,
    "groomLastName" TEXT,
    "groomPhone" TEXT,
    "groomBirthDateText" TEXT,
    "engagementDateText" TEXT,
    "weddingDateText" TEXT,
    "consentOccasionSms" BOOLEAN NOT NULL DEFAULT false,
    "consentReminderSms" BOOLEAN NOT NULL DEFAULT false,
    "consentPromotionSms" BOOLEAN NOT NULL DEFAULT false,
    "consentMusicStatusSms" BOOLEAN NOT NULL DEFAULT false,
    "musicEditDeadlineText" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeddingProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeddingMusicRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "weddingProfileId" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "songTitle" TEXT NOT NULL,
    "artistName" TEXT,
    "songUrl" TEXT,
    "playMoment" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "adminNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeddingMusicRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GuestOtpChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReminderRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT,
    "clubMemberId" TEXT,
    "weddingProfileId" TEXT,
    "reminderType" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientLabel" TEXT,
    "jalaliDateText" TEXT,
    "jalaliMonth" INTEGER,
    "jalaliDay" INTEGER,
    "nextRunAt" TIMESTAMP(3),
    "lastSentYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReminderRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContractAccessLink_tokenHash_key" ON "ContractAccessLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "ContractAccessLink_tenantId_idx" ON "ContractAccessLink"("tenantId");
CREATE INDEX IF NOT EXISTS "ContractAccessLink_contractId_idx" ON "ContractAccessLink"("contractId");
CREATE INDEX IF NOT EXISTS "ContractAccessLink_tenantId_kind_idx" ON "ContractAccessLink"("tenantId", "kind");
CREATE INDEX IF NOT EXISTS "ContractAccessLink_expiresAt_idx" ON "ContractAccessLink"("expiresAt");
CREATE INDEX IF NOT EXISTS "ContractAccessLink_revokedAt_idx" ON "ContractAccessLink"("revokedAt");

CREATE INDEX IF NOT EXISTS "ContractFeedback_tenantId_idx" ON "ContractFeedback"("tenantId");
CREATE INDEX IF NOT EXISTS "ContractFeedback_contractId_idx" ON "ContractFeedback"("contractId");
CREATE INDEX IF NOT EXISTS "ContractFeedback_linkId_idx" ON "ContractFeedback"("linkId");
CREATE INDEX IF NOT EXISTS "ContractFeedback_audience_idx" ON "ContractFeedback"("audience");
CREATE INDEX IF NOT EXISTS "ContractFeedback_createdAt_idx" ON "ContractFeedback"("createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerClubMember_tenantId_phone_key" ON "CustomerClubMember"("tenantId", "phone");
CREATE INDEX IF NOT EXISTS "CustomerClubMember_tenantId_idx" ON "CustomerClubMember"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerClubMember_customerId_idx" ON "CustomerClubMember"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerClubMember_contractId_idx" ON "CustomerClubMember"("contractId");
CREATE INDEX IF NOT EXISTS "CustomerClubMember_source_idx" ON "CustomerClubMember"("source");
CREATE INDEX IF NOT EXISTS "CustomerClubMember_consentOccasionSms_idx" ON "CustomerClubMember"("consentOccasionSms");

CREATE UNIQUE INDEX IF NOT EXISTS "WeddingProfile_contractId_key" ON "WeddingProfile"("contractId");
CREATE INDEX IF NOT EXISTS "WeddingProfile_tenantId_idx" ON "WeddingProfile"("tenantId");
CREATE INDEX IF NOT EXISTS "WeddingProfile_contractId_idx" ON "WeddingProfile"("contractId");
CREATE INDEX IF NOT EXISTS "WeddingProfile_isComplete_idx" ON "WeddingProfile"("isComplete");

CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_tenantId_idx" ON "WeddingMusicRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_contractId_idx" ON "WeddingMusicRequest"("contractId");
CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_weddingProfileId_idx" ON "WeddingMusicRequest"("weddingProfileId");
CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_requester_idx" ON "WeddingMusicRequest"("requester");
CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_status_idx" ON "WeddingMusicRequest"("status");
CREATE INDEX IF NOT EXISTS "WeddingMusicRequest_createdAt_idx" ON "WeddingMusicRequest"("createdAt");

CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_tenantId_idx" ON "GuestOtpChallenge"("tenantId");
CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_linkId_idx" ON "GuestOtpChallenge"("linkId");
CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_phone_idx" ON "GuestOtpChallenge"("phone");
CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_expiresAt_idx" ON "GuestOtpChallenge"("expiresAt");
CREATE INDEX IF NOT EXISTS "GuestOtpChallenge_usedAt_idx" ON "GuestOtpChallenge"("usedAt");

CREATE INDEX IF NOT EXISTS "ReminderRecord_tenantId_idx" ON "ReminderRecord"("tenantId");
CREATE INDEX IF NOT EXISTS "ReminderRecord_contractId_idx" ON "ReminderRecord"("contractId");
CREATE INDEX IF NOT EXISTS "ReminderRecord_clubMemberId_idx" ON "ReminderRecord"("clubMemberId");
CREATE INDEX IF NOT EXISTS "ReminderRecord_weddingProfileId_idx" ON "ReminderRecord"("weddingProfileId");
CREATE INDEX IF NOT EXISTS "ReminderRecord_reminderType_idx" ON "ReminderRecord"("reminderType");
CREATE INDEX IF NOT EXISTS "ReminderRecord_nextRunAt_idx" ON "ReminderRecord"("nextRunAt");
CREATE INDEX IF NOT EXISTS "ReminderRecord_isActive_idx" ON "ReminderRecord"("isActive");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ContractAccessLink_tenantId_fkey') THEN
        ALTER TABLE "ContractAccessLink" ADD CONSTRAINT "ContractAccessLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ContractAccessLink_contractId_fkey') THEN
        ALTER TABLE "ContractAccessLink" ADD CONSTRAINT "ContractAccessLink_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ContractFeedback_tenantId_fkey') THEN
        ALTER TABLE "ContractFeedback" ADD CONSTRAINT "ContractFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ContractFeedback_contractId_fkey') THEN
        ALTER TABLE "ContractFeedback" ADD CONSTRAINT "ContractFeedback_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ContractFeedback_linkId_fkey') THEN
        ALTER TABLE "ContractFeedback" ADD CONSTRAINT "ContractFeedback_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ContractAccessLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerClubMember_tenantId_fkey') THEN
        ALTER TABLE "CustomerClubMember" ADD CONSTRAINT "CustomerClubMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerClubMember_customerId_fkey') THEN
        ALTER TABLE "CustomerClubMember" ADD CONSTRAINT "CustomerClubMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CustomerClubMember_contractId_fkey') THEN
        ALTER TABLE "CustomerClubMember" ADD CONSTRAINT "CustomerClubMember_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WeddingProfile_tenantId_fkey') THEN
        ALTER TABLE "WeddingProfile" ADD CONSTRAINT "WeddingProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WeddingProfile_contractId_fkey') THEN
        ALTER TABLE "WeddingProfile" ADD CONSTRAINT "WeddingProfile_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WeddingMusicRequest_tenantId_fkey') THEN
        ALTER TABLE "WeddingMusicRequest" ADD CONSTRAINT "WeddingMusicRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WeddingMusicRequest_contractId_fkey') THEN
        ALTER TABLE "WeddingMusicRequest" ADD CONSTRAINT "WeddingMusicRequest_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'WeddingMusicRequest_weddingProfileId_fkey') THEN
        ALTER TABLE "WeddingMusicRequest" ADD CONSTRAINT "WeddingMusicRequest_weddingProfileId_fkey" FOREIGN KEY ("weddingProfileId") REFERENCES "WeddingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'GuestOtpChallenge_tenantId_fkey') THEN
        ALTER TABLE "GuestOtpChallenge" ADD CONSTRAINT "GuestOtpChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'GuestOtpChallenge_linkId_fkey') THEN
        ALTER TABLE "GuestOtpChallenge" ADD CONSTRAINT "GuestOtpChallenge_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ContractAccessLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ReminderRecord_tenantId_fkey') THEN
        ALTER TABLE "ReminderRecord" ADD CONSTRAINT "ReminderRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ReminderRecord_contractId_fkey') THEN
        ALTER TABLE "ReminderRecord" ADD CONSTRAINT "ReminderRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ReminderRecord_clubMemberId_fkey') THEN
        ALTER TABLE "ReminderRecord" ADD CONSTRAINT "ReminderRecord_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "CustomerClubMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ReminderRecord_weddingProfileId_fkey') THEN
        ALTER TABLE "ReminderRecord" ADD CONSTRAINT "ReminderRecord_weddingProfileId_fkey" FOREIGN KEY ("weddingProfileId") REFERENCES "WeddingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
