/*
  Warnings:

  - You are about to drop the column `cancellationAmount` on the `PostEventConfirmation` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationAmountManual` on the `PostEventConfirmation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PostEventConfirmation" DROP COLUMN "cancellationAmount",
DROP COLUMN "cancellationAmountManual";
