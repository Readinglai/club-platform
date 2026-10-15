/**
 * Creates (or reuses) an unpublished "[TEST]" event with a free and a paid
 * ticket type, for trying the Order/Ticket flow locally.
 *
 *   npx tsx scripts/seed-test-event.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const TITLE = "[TEST] Phase 0 ticketing";

async function main() {
  const startAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  startAt.setUTCHours(23, 0, 0, 0); // 7 PM Toronto (EDT)

  const event =
    (await db.event.findFirst({ where: { title: TITLE } })) ??
    (await db.event.create({
      data: {
        title: TITLE,
        description: "Test data for the new ticketing flow. Safe to delete.",
        startAt,
        endAt: new Date(startAt.getTime() + 3 * 60 * 60 * 1000),
        location: "Test location",
        published: false,
      },
    }));

  await db.eventSettings.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, ticketsEnabled: true, checkInEnabled: true },
    update: {},
  });

  const types = [
    { name: "Free Entry", price: 0, capacity: 50, color: "#0b6e4f", perks: "Welcome drink", sortOrder: 0 },
    { name: "Standard", price: 15, capacity: 2, color: "#1d4ed8", perks: "2 drink tickets", sortOrder: 1 },
  ];
  for (const t of types) {
    const existing = await db.ticketType.findFirst({ where: { eventId: event.id, name: t.name } });
    if (!existing) await db.ticketType.create({ data: { ...t, eventId: event.id } });
  }

  const created = await db.ticketType.findMany({
    where: { eventId: event.id },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, price: true, capacity: true },
  });
  console.log(JSON.stringify({ eventId: event.id, ticketTypes: created }, null, 2));
}

main().finally(() => db.$disconnect());
