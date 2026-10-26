-- DropForeignKey
ALTER TABLE "EventSettings" DROP CONSTRAINT "EventSettings_financeSubmittedById_fkey";

-- DropForeignKey
ALTER TABLE "EventSettings" DROP CONSTRAINT "EventSettings_financeReviewedById_fkey";

-- DropForeignKey
ALTER TABLE "ApprovalRequest" DROP CONSTRAINT "ApprovalRequest_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "ApprovalRequest" DROP CONSTRAINT "ApprovalRequest_decidedById_fkey";

-- AlterTable
ALTER TABLE "EventSettings" DROP COLUMN "financeReviewNote",
DROP COLUMN "financeReviewedAt",
DROP COLUMN "financeReviewedById",
DROP COLUMN "financeStatus",
DROP COLUMN "financeSubmittedAt",
DROP COLUMN "financeSubmittedById";

-- DropTable
DROP TABLE "ApprovalRequest";

-- DropEnum
DROP TYPE "FinanceReportStatus";

-- DropEnum
DROP TYPE "ApprovalStatus";
