/**
 * Checks event management, member pricing and the dashboard with a [TEST]
 * event (removed and recreated each run). Uses only free orders, so no
 * Stripe sessions are created.
 *
 *   npx tsx --env-file=.env.local scripts/test-events.ts
 */
import { db } from "../src/lib/db";
import { createEvent, createTicketType, setPublished, updateEvent, updateTicketType } from "../src/lib/events/manage";
import { getPublicEvent } from "../src/lib/events/public";
import { canSeeDashboard, getEventDashboard } from "../src/lib/events/dashboard";
import { createOrder } from "../src/lib/ticketing/orders";
import { termFor } from "../src/lib/membership/term";
import { getMyTickets, splitByTime } from "../src/lib/tickets/mine";

const TITLE = "[TEST] Phase 6 Taipei night";
let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });

async function cleanup() {
  const events = await db.event.findMany({ where: { title: TITLE }, select: { id: true } });
  const ids = events.map((e) => e.id);
  await db.ticket.deleteMany({ where: { eventId: { in: ids } } });
  await db.order.deleteMany({ where: { eventId: { in: ids } } });
  await db.ticketType.deleteMany({ where: { eventId: { in: ids } } });
  await db.eventSettings.deleteMany({ where: { eventId: { in: ids } } });
  await db.group.deleteMany({ where: { eventId: { in: ids } } });
  await db.event.deleteMany({ where: { id: { in: ids } } });
  await db.membership.deleteMany({ where: { memberCode: "TEST-EVENTS-0001" } });
}

async function main() {
  await cleanup();
  const [eventsVp, eventStaff, memberOnly, buyer] = await Promise.all(["events-vp", "event-staff", "member-only", "buyer"].map(user));
  const term = termFor();
  await db.membership.create({
    data: { userId: memberOnly.id, memberCode: "TEST-EVENTS-0001", status: "ACTIVE", source: "MANUAL", termStart: term.termStart, termEnd: term.termEnd },
  });

  const details = { title: TITLE, startAt: "2027-01-20T19:00", endAt: "2027-01-20T22:00", timezone: "Asia/Taipei", location: "Taipei", ticketsEnabled: true, checkInEnabled: true, dashboardEnabled: true };
  const denied = await createEvent(eventStaff.id, details);
  check("event staff can't create events", !denied.ok);
  const created = await createEvent(eventsVp.id, details);
  check("Events VP creates an event", created.ok);
  const eventId = created.ok ? created.value! : "";
  const ev = await db.event.findUniqueOrThrow({ where: { id: eventId }, include: { settings: true, team: true } });
  check("stored in Taipei time (19:00 → 11:00 UTC)", ev.startAt.toISOString() === "2027-01-20T11:00:00.000Z", ev.startAt.toISOString());
  check("settings and event team created", ev.settings?.timezone === "Asia/Taipei" && Boolean(ev.team));
  check("starts unpublished", !ev.published);

  check("event staff can't edit details", !(await updateEvent(eventStaff.id, eventId, details)).ok);
  check("Events VP edits details", (await updateEvent(eventsVp.id, eventId, { ...details, location: "Taipei 101" })).ok);

  await createTicketType(eventsVp.id, eventId, { name: "Regular", price: 20, memberPrice: 0, capacity: 3, sortOrder: 0 });
  await createTicketType(eventsVp.id, eventId, { name: "Members only", price: 0, membersOnly: true, capacity: 5, sortOrder: 1 });
  check("event staff can't add tiers", !(await createTicketType(eventStaff.id, eventId, { name: "X", price: 1 })).ok);
  const [regular, membersOnly] = await db.ticketType.findMany({ where: { eventId }, orderBy: { sortOrder: "asc" } });

  // Visibility
  check("unpublished: hidden from the public", (await getPublicEvent(eventId, null)) === null);
  check("unpublished: visible to the Events VP (preview)", (await getPublicEvent(eventId, eventsVp.id))?.preview === true);
  await setPublished(eventsVp.id, eventId, true);
  const pub = await getPublicEvent(eventId, memberOnly.id);
  check("published: visible, member recognised, details pre-filled", pub?.viewer?.isMember === true && pub.viewer.prefill.email === memberOnly.email);

  // Member pricing
  const base = { eventId, waiverAccepted: true, origin: "http://localhost:3000" };
  let r = await createOrder({ ...base, ticketTypeId: membersOnly.id, buyer: { name: "Guest", email: "guest@test.rocsaut.invalid" } });
  check("members-only refused when not logged in", !r.ok && r.status === 403);
  r = await createOrder({ ...base, ticketTypeId: membersOnly.id, buyer: { name: "Buyer", email: buyer.email }, userId: buyer.id });
  check("members-only refused for a non-member account", !r.ok && r.status === 403);

  r = await createOrder({ ...base, ticketTypeId: regular.id, buyer: { name: "Member", email: memberOnly.email }, userId: memberOnly.id });
  const t1 = r.ok && r.free ? await db.ticket.findUnique({ where: { token: r.ticketToken } }) : null;
  check("member gets member price ($0 instead of $20)", Boolean(t1 && t1.memberPricing && t1.pricePaid.toNumber() === 0));
  r = await createOrder({ ...base, ticketTypeId: membersOnly.id, buyer: { name: "Member", email: memberOnly.email }, userId: memberOnly.id });
  check("member price only once per event", !r.ok && r.status === 409, !r.ok ? r.message : "");
  check("page shows member price as used", (await getPublicEvent(eventId, memberOnly.id))?.viewer?.memberPriceUsed === true);

  // Capacity edits
  check("capacity can't go below tickets sold", !(await updateTicketType(eventsVp.id, eventId, regular.id, { name: "Regular", price: 20, memberPrice: 0, capacity: 0 })).ok);

  // Dashboard
  check("event staff (not on this team) can't see the dashboard", !(await canSeeDashboard(eventStaff.id, eventId)));
  check("Events VP sees the dashboard", await canSeeDashboard(eventsVp.id, eventId));
  const dash = (await getEventDashboard(eventId))!;
  const reg = dash.tiers.find((t) => t.name === "Regular");
  check("dashboard counts the sold ticket", dash.totals.sold === 1 && reg?.sold === 1 && reg?.capacity === 3);
  const pubAfter = await getPublicEvent(eventId, null);
  check("availability shown (2 of 3 left)", pubAfter?.tiers.find((t) => t.name === "Regular")?.remaining === 2);

  // My tickets: linked to the account, and found by email when bought logged out.
  const mine = await getMyTickets(memberOnly.id, memberOnly.email);
  check("my tickets: ticket linked to the account", mine.some((x) => x.eventTitle === TITLE));
  const free = await db.ticketType.findFirstOrThrow({ where: { eventId, name: "Regular" } });
  await db.ticketType.update({ where: { id: free.id }, data: { price: 0 } });
  const guest = await createOrder({ ...base, ticketTypeId: free.id, buyer: { name: "Guest", email: "GUEST-MINE@test.rocsaut.invalid" } });
  const byEmail = await getMyTickets(buyer.id, "guest-mine@test.rocsaut.invalid");
  check("my tickets: found by email (any case) without an account link", guest.ok && byEmail.some((x) => x.eventTitle === TITLE));
  check("my tickets: a 2027 event counts as upcoming", splitByTime(byEmail).upcoming.some((x) => x.eventTitle === TITLE));

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
