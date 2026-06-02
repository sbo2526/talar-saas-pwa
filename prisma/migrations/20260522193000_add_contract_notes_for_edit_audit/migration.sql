-- Adds an optional internal contract notes field used by the controlled contract edit screen.
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "notes" TEXT;
