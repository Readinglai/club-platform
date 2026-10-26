-- Removes the unused LEAD position (VPs run their teams). Postgres cannot drop
-- a single enum value, so the type is rebuilt without it. Anyone still holding
-- LEAD becomes STAFF first.
BEGIN;
UPDATE "GroupMember" SET "position" = 'STAFF' WHERE "position" = 'LEAD';
UPDATE "ApprovalRequest" SET "approverPosition" = 'VP' WHERE "approverPosition" = 'LEAD';

CREATE TYPE "GroupPosition_new" AS ENUM ('PRESIDENT', 'VP', 'STAFF');
ALTER TABLE "GroupMember" ALTER COLUMN "position" DROP DEFAULT;
ALTER TABLE "ApprovalRequest" ALTER COLUMN "approverPosition" DROP DEFAULT;
ALTER TABLE "GroupMember" ALTER COLUMN "position" TYPE "GroupPosition_new" USING ("position"::text::"GroupPosition_new");
ALTER TABLE "ApprovalRequest" ALTER COLUMN "approverPosition" TYPE "GroupPosition_new" USING ("approverPosition"::text::"GroupPosition_new");
ALTER TYPE "GroupPosition" RENAME TO "GroupPosition_old";
ALTER TYPE "GroupPosition_new" RENAME TO "GroupPosition";
-- The old type (with LEAD) is kept, unused, as "GroupPosition_old" for now.
-- TODO: DROP TYPE "GroupPosition_old"; once agreed.
ALTER TABLE "GroupMember" ALTER COLUMN "position" SET DEFAULT 'STAFF';
ALTER TABLE "ApprovalRequest" ALTER COLUMN "approverPosition" SET DEFAULT 'PRESIDENT';
COMMIT;
