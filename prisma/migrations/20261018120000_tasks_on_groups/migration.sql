-- AlterTable
ALTER TABLE "Discussion" ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "groupId" TEXT,
ALTER COLUMN "taskGroupId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "groupId" TEXT,
ALTER COLUMN "taskGroupId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Discussion_groupId_key" ON "Discussion"("groupId");

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
