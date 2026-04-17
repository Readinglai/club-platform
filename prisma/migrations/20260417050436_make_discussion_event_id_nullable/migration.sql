-- DropForeignKey
ALTER TABLE "Discussion" DROP CONSTRAINT "Discussion_eventId_fkey";

-- AlterTable
ALTER TABLE "Discussion" ALTER COLUMN "eventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
