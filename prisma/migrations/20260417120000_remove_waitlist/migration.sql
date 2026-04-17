-- Migration: remove_waitlist
-- Permanently removes WAITLISTED from RegistrationStatus enum.
-- Existing WAITLISTED rows are converted to CANCELLED before the enum is altered.

-- Step 1: Convert any lingering WAITLISTED registrations to CANCELLED
UPDATE "Registration" SET status = 'CANCELLED' WHERE status = 'WAITLISTED';

-- Step 2: Recreate the enum without WAITLISTED
--         PostgreSQL does not support DROP VALUE on enums directly,
--         so we rename the old type, create a new one, migrate the column, then drop the old type.
ALTER TYPE "RegistrationStatus" RENAME TO "RegistrationStatus_old";
CREATE TYPE "RegistrationStatus" AS ENUM ('REGISTERED', 'CANCELLED');
ALTER TABLE "Registration"
  ALTER COLUMN status TYPE "RegistrationStatus"
  USING status::text::"RegistrationStatus";
DROP TYPE "RegistrationStatus_old";
