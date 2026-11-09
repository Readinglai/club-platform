-- Hilo Party: guest member discount (one ticket per member per event),
-- order hold expiry, and a review flag for late payments. Additive only.

-- CreateEnum
CREATE TYPE "EventMemberRedemptionStatus" AS ENUM ('PENDING', 'USED', 'RELEASED');

-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "memberDiscountAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewNote" TEXT;

-- CreateTable
CREATE TABLE "EventMemberRedemption" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" "EventMemberRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMemberRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventMemberRedemption_orderId_key" ON "EventMemberRedemption"("orderId");

-- CreateIndex
CREATE INDEX "EventMemberRedemption_eventId_status_idx" ON "EventMemberRedemption"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventMemberRedemption_membershipId_eventId_key" ON "EventMemberRedemption"("membershipId", "eventId");

-- AddForeignKey
ALTER TABLE "EventMemberRedemption" ADD CONSTRAINT "EventMemberRedemption_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMemberRedemption" ADD CONSTRAINT "EventMemberRedemption_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventMemberRedemption" ADD CONSTRAINT "EventMemberRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

