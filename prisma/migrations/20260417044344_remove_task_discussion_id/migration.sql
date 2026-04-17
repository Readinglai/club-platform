/*
  Warnings:

  - You are about to drop the column `discussionId` on the `Task` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_discussionId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "discussionId";
