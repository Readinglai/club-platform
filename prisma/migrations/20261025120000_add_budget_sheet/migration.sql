-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "budgetSheetConnectedBy" TEXT,
ADD COLUMN     "budgetSheetData" TEXT,
ADD COLUMN     "budgetSheetId" TEXT,
ADD COLUMN     "budgetSheetSyncError" TEXT,
ADD COLUMN     "budgetSheetSyncedAt" TIMESTAMP(3);

