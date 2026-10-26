-- CreateEnum
CREATE TYPE "FinanceReportStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'RETURNED');

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "financeReviewNote" TEXT,
ADD COLUMN     "financeReviewedAt" TIMESTAMP(3),
ADD COLUMN     "financeReviewedById" TEXT,
ADD COLUMN     "financeStatus" "FinanceReportStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "financeSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "financeSubmittedById" TEXT;

-- AlterTable
ALTER TABLE "FinanceRecord" ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "importBatchId" TEXT,
ADD COLUMN     "receiptUrl" TEXT;

-- CreateTable
CREATE TABLE "EventBudgetLine" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "quantity" DECIMAL(10,2),
    "unitCost" DECIMAL(12,2),
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventBudgetLine_eventId_idx" ON "EventBudgetLine"("eventId");

-- CreateIndex
CREATE INDEX "FinanceRecord_eventId_idx" ON "FinanceRecord"("eventId");

-- AddForeignKey
ALTER TABLE "EventSettings" ADD CONSTRAINT "EventSettings_financeSubmittedById_fkey" FOREIGN KEY ("financeSubmittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSettings" ADD CONSTRAINT "EventSettings_financeReviewedById_fkey" FOREIGN KEY ("financeReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBudgetLine" ADD CONSTRAINT "EventBudgetLine_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceRecord" ADD CONSTRAINT "FinanceRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supabase exposes new public tables to its anon/authenticated API roles by
-- default. The app connects as the table owner, so lock the API roles out.
ALTER TABLE "EventBudgetLine" ENABLE ROW LEVEL SECURITY;
