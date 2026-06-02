-- CreateEnum
CREATE TYPE "CalendarDayStatus" AS ENUM ('NOTE', 'BLOCKED', 'CLOSED', 'HOLIDAY', 'FOLLOW_UP');

-- CreateTable
CREATE TABLE "CalendarDayNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "CalendarDayStatus" NOT NULL DEFAULT 'NOTE',
    "title" TEXT,
    "note" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDayNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDayNote_tenantId_date_key" ON "CalendarDayNote"("tenantId", "date");

-- CreateIndex
CREATE INDEX "CalendarDayNote_tenantId_date_idx" ON "CalendarDayNote"("tenantId", "date");

-- AddForeignKey
ALTER TABLE "CalendarDayNote" ADD CONSTRAINT "CalendarDayNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
