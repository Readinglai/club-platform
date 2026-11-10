/**
 * Creates (or reuses, via HILO_EVENT_ID) the unpublished Hilo test event and three test
 * memberships, for trying /hilo locally against the real database.
 * Everything it makes is easy to find and delete before launch:
 *   - the event is the one HILO_EVENT_ID points at (see scripts/sql/cleanup-hilo-test.sql)
 *   - member codes start with "TEST-HILO-", emails end in "@rocsaut.invalid"
 *
 *   npx tsx scripts/seed-hilo-test-event.ts
 *
 * Then put the printed event id in .env.local as HILO_EVENT_ID.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const TITLE = "One More Night in TAIPEI | ROCSAUT Annual Party";
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  const startAt = new Date(Date.now() + 21 * DAY);
  startAt.setUTCHours(1, 0, 0, 0); // 8–9 PM Toronto the evening before

  const event =
    (process.env.HILO_EVENT_ID ? await db.event.findUnique({ where: { id: process.env.HILO_EVENT_ID } }) : null) ??
    (await db.event.create({
      data: {
        title: TITLE,
        description: "Test event for the Hilo Party ticket page. Safe to delete.\nSecond line to check line breaks.",
        startAt,
        endAt: new Date(startAt.getTime() + 4 * 60 * 60 * 1000),
        location: "Test venue, Toronto",
        published: false,
      },
    }));

  await db.eventSettings.upsert({
    where: { eventId: event.id },
    create: {
      eventId: event.id,
      ticketsEnabled: true,
      checkInEnabled: true,
      dashboardEnabled: true,
      memberDiscountAmount: new Prisma.Decimal(5),
    },
    update: { ticketsEnabled: true, memberDiscountAmount: new Prisma.Decimal(5) },
  });

  // Its own team under Events, like events made in the portal (dashboard access).
  const eventsDept = await db.group.findUnique({ where: { slug: "events" }, select: { id: true } });
  if (eventsDept && !(await db.group.findUnique({ where: { eventId: event.id } }))) {
    await db.group.create({
      data: { slug: `event-${event.id}`, name: TITLE, parentId: eventsDept.id, eventId: event.id },
    });
  }

  const tier =
    (await db.ticketType.findFirst({ where: { eventId: event.id, name: "General Admission" } })) ??
    (await db.ticketType.create({
      data: {
        eventId: event.id,
        name: "General Admission",
        price: new Prisma.Decimal(35),
        capacity: 124,
        maxPerOrder: 1,
        color: "#6b21a8",
      },
    }));

  // Test memberships: active, active (for the concurrency test), expired.
  const now = Date.now();
  const members = [
    { memberCode: "TEST-HILO-0001", name: "Test Member", termStart: new Date(now - 30 * DAY), termEnd: new Date(now + 300 * DAY) },
    { memberCode: "TEST-HILO-0002", name: "Race Tester", termStart: new Date(now - 30 * DAY), termEnd: new Date(now + 300 * DAY) },
    { memberCode: "TEST-HILO-0003", name: "Old Member", termStart: new Date(now - 400 * DAY), termEnd: new Date(now - 35 * DAY) },
  ];
  for (const m of members) {
    await db.membership.upsert({
      where: { memberCode: m.memberCode },
      create: {
        ...m,
        email: `${m.memberCode.toLowerCase()}@rocsaut.invalid`,
        status: "ACTIVE",
        source: "MANUAL",
      },
      update: { name: m.name, status: "ACTIVE", termStart: m.termStart, termEnd: m.termEnd },
    });
  }

  console.log(JSON.stringify({ eventId: event.id, ticketTypeId: tier.id, members: members.map((m) => `${m.memberCode} / ${m.name}`) }, null, 2));
  console.log(`\nAdd to .env.local:  HILO_EVENT_ID=${event.id}`);
}

main().finally(() => db.$disconnect());
