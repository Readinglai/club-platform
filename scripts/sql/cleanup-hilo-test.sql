-- Removes everything the Hilo Party tests created, before launch:
--   * the "[TEST] Hilo Party" event and its settings, ticket types, team group,
--     orders, tickets and member-discount rows
--   * the test memberships TEST-HILO-0001 / 0002 / 0003
-- Nothing else is touched: every statement is limited to that event's id or
-- to member codes starting with TEST-HILO-.
--
-- Run it in the Supabase SQL editor. It runs inside a transaction: check the
-- counts it prints, then it commits. To try it without deleting, change the
-- last line from COMMIT to ROLLBACK.

BEGIN;

CREATE TEMP TABLE hilo_test_event ON COMMIT DROP AS
  SELECT id FROM "Event" WHERE title = '[TEST] Hilo Party';

SELECT count(*) AS test_events_found FROM hilo_test_event;  -- expect 1

DELETE FROM "EventMemberRedemption" WHERE "eventId" IN (SELECT id FROM hilo_test_event)
   OR "membershipId" IN (SELECT id FROM "Membership" WHERE "memberCode" LIKE 'TEST-HILO-%');
DELETE FROM "Ticket"        WHERE "eventId" IN (SELECT id FROM hilo_test_event);
DELETE FROM "Order"         WHERE "eventId" IN (SELECT id FROM hilo_test_event);
DELETE FROM "TicketType"    WHERE "eventId" IN (SELECT id FROM hilo_test_event);
DELETE FROM "EventSettings" WHERE "eventId" IN (SELECT id FROM hilo_test_event);
DELETE FROM "Group"         WHERE "eventId" IN (SELECT id FROM hilo_test_event);
DELETE FROM "Event"         WHERE id        IN (SELECT id FROM hilo_test_event);
DELETE FROM "Membership"    WHERE "memberCode" LIKE 'TEST-HILO-%';

-- Should all be 0 now.
SELECT
  (SELECT count(*) FROM "Event" WHERE title = '[TEST] Hilo Party') AS events_left,
  (SELECT count(*) FROM "Membership" WHERE "memberCode" LIKE 'TEST-HILO-%') AS test_members_left;

COMMIT;
