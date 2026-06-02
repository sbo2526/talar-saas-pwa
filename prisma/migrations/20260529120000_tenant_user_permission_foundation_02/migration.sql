-- TENANT_USER_PERMISSION_FOUNDATION_02
-- Design-approved schema foundation for tenant-scoped user access.
-- This migration is generated but NOT executed by this package.

ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTANT';
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';
ALTER TYPE "UserRole" ADD VALUE 'TENANT_OPERATOR';
ALTER TYPE "UserRole" ADD VALUE 'RECEPTION';
ALTER TYPE "UserRole" ADD VALUE 'VIEWER';

CREATE TYPE "TenantMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');

ALTER TABLE "TenantMember"
  ADD COLUMN "status" "TenantMemberStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "title" TEXT,
  ADD COLUMN "permissionsOverride" JSONB,
  ADD COLUMN "invitedByUserId" TEXT,
  ADD COLUMN "lastAccessAt" TIMESTAMP(3),
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TenantMember"
  ADD CONSTRAINT "TenantMember_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TenantMember_tenantId_role_idx" ON "TenantMember"("tenantId", "role");
CREATE INDEX "TenantMember_tenantId_status_idx" ON "TenantMember"("tenantId", "status");
CREATE INDEX "TenantMember_invitedByUserId_idx" ON "TenantMember"("invitedByUserId");
