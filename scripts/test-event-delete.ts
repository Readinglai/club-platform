/**
 * Checks deleting events (src/lib/events/manage.ts deleteEvent): Events staff
 * delete drafts, only the Events VP and President delete published events,
 * never Halloween 2026, never an event with tickets or money. Creates its own [TEST] events and removes them.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-event-delete.ts
 */
import { db } from "../src/lib/db";
import { createEvent, deleteEvent } from "../src/lib/events/manage";
import { HALLOWEEN_2026_EVENT_ID } from "../src/lib/events/legacy";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });

async function newEvent(by: string, title: string) {
  const r = await createEvent(by, { title, startAt: "2027-03-01T19:00", timezone: "America/Toronto", ticketsEnabled: true });
  if (!r.ok || !r.value) throw new Error(`couldn't create ${title}`);
  return r.value;
}

async function main() {
  const [president, eventsVp, opsVp, eventStaff, eventsStaff] = await Promise.all(
    ["president", "events-vp", "ops-vp", "event-staff", "events-staff"].map(user)
  );
  const created: string[] = [];

  try {
    const a = await newEvent(eventsVp.id, "[TEST] Delete me A");
    const b = await newEvent(eventsVp.id, "[TEST] Delete me B");
    created.push(a, b);
    const team = await db.group.findUniqueOrThrow({ where: { eventId: a } });
    await db.groupMember.create({ data: { groupId: team.id, userId: eventStaff.id, position: "STAFF" } });
    await db.ticketType.create({ data: { eventId: a, name: "General", price: 0 } });

    // Who may delete
    let r = await deleteEvent(eventStaff.id, a);
    check("event team staff can't delete (event teams are switched off)", !r.ok && r.status === 403);
    r = await deleteEvent(opsVp.id, a);
    check("Operations VP can't delete", !r.ok && r.status === 403);

    // What can't be deleted
    r = await deleteEvent(president.id, HALLOWEEN_2026_EVENT_ID);
    check("Halloween 2026 is protected", !r.ok && r.status === 400);
    const demo = await db.event.findFirst({ where: { title: { startsWith: "[DEMO] Ski Trip" } }, select: { id: true } });
    if (demo) {
      r = await deleteEvent(president.id, demo.id);
      check("an event with money recorded is refused", !r.ok && r.status === 409);
    }

    // Events VP deletes directly
    r = await deleteEvent(eventsVp.id, a);
    check("Events VP deletes an empty event", r.ok, r.ok ? "" : r.message);
    check("the event, its settings and tiers are gone",
      !(await db.event.findUnique({ where: { id: a } })) &&
      !(await db.eventSettings.findUnique({ where: { eventId: a } })) &&
      (await db.ticketType.count({ where: { eventId: a } })) === 0);
    const archived = await db.group.findUniqueOrThrow({ where: { id: team.id } });
    check("its team is archived, not deleted", archived.archived && archived.eventId === null);

    // President deletes directly
    r = await deleteEvent(president.id, b);
    check("President deletes an empty event", r.ok, r.ok ? "" : r.message);

    // Events staff: create and delete drafts, but not published events
    const c = await newEvent(eventsStaff.id, "[TEST] Delete me C");
    const d = await newEvent(eventsStaff.id, "[TEST] Delete me D");
    created.push(c, d);
    check("Events staff create events", true);
    r = await deleteEvent(eventsStaff.id, c);
    check("Events staff delete an unpublished event", r.ok, r.ok ? "" : r.message);
    await db.event.update({ where: { id: d }, data: { published: true } });
    r = await deleteEvent(eventsStaff.id, d);
    check("Events staff can't delete a published event", !r.ok && r.status === 403);
    r = await deleteEvent(eventsVp.id, d);
    check("Events VP deletes a published event", r.ok, r.ok ? "" : r.message);
  } finally {
    // Anything a failed check left behind.
    for (const id of created) {
      if (await db.event.findUnique({ where: { id } })) await deleteEvent(president.id, id);
    }
    const teams = await db.group.findMany({ where: { name: { startsWith: "[TEST] Delete me" } }, select: { id: true } });
    await db.groupMember.deleteMany({ where: { groupId: { in: teams.map((t) => t.id) } } });
    await db.group.deleteMany({ where: { id: { in: teams.map((t) => t.id) } } });
  }

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
