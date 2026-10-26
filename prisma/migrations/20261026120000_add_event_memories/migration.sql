-- AlterTable
ALTER TABLE "EventSettings" ADD COLUMN     "memoriesRecap" TEXT;

-- CreateTable
CREATE TABLE "EventMemoryPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMemoryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMemoryPhoto_eventId_idx" ON "EventMemoryPhoto"("eventId");

-- AddForeignKey
ALTER TABLE "EventMemoryPhoto" ADD CONSTRAINT "EventMemoryPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Same as every new table: no access through the public API keys.
ALTER TABLE "EventMemoryPhoto" ENABLE ROW LEVEL SECURITY;
