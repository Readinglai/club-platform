-- Run as TWO separate queries: Postgres does not allow a new enum value to be
-- used in the same transaction that adds it.

-- Query 1
ALTER TYPE "Role" ADD VALUE 'USER';

-- Query 2 (after query 1 has committed)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
