/**
 * Writes Hilo Party's real details into an event: date and time, venue,
 * description, time zone, and the ticket's sales window.
 *
 *   npx tsx scripts/hilo-event-details.ts <eventId>                    real sales window (Nov 14 3 PM – Nov 25 10 PM)
 *   npx tsx scripts/hilo-event-details.ts <eventId> --sales-open-now   on sale from now until Nov 25 10 PM (for testing)
 *
 * All times are Toronto wall-clock times. Toronto is on EST (UTC−5) from
 * Nov 1, 2026, so each one is written with an explicit −05:00 offset; the
 * database stores the matching UTC instant and the page shows it in Toronto time.
 *
 * The page's own wording (both languages) lives in messages/{en,zh}.json → hiloPage.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const TITLE = "One More Night in TAIPEI | ROCSAUT Annual Party";
const DESCRIPTION =
  "ROCSAUT's annual flagship party, brought to you by all three University of Toronto campuses. Taipei nightlife meets retro party culture. 19+ only, valid photo ID required. Admission only; drinks sold separately.";
const LOCATION = "HILO TORONTO, 1566 Queen St W, Toronto, ON M6R 1A6";
const TIME_ZONE = "America/Toronto";

const START = new Date("2026-11-25T22:00:00-05:00"); // Wed Nov 25, 10 PM
const END = new Date("2026-11-26T02:00:00-05:00"); //   Thu Nov 26, 2 AM
const SALES_START = new Date("2026-11-14T15:00:00-05:00"); // Sat Nov 14, 3 PM
const SALES_END = new Date("2026-11-25T22:00:00-05:00"); //   Wed Nov 25, 10 PM (doors)

async function main() {
  const eventId = process.argv[2];
  const openNow = process.argv.includes("--sales-open-now");
  if (!eventId || eventId.startsWith("--")) throw new Error("Usage: npx tsx scripts/hilo-event-details.ts <eventId> [--sales-open-now]");

  await db.event.findUniqueOrThrow({ where: { id: eventId }, select: { id: true } });

  await db.event.update({
    where: { id: eventId },
    data: { title: TITLE, description: DESCRIPTION, location: LOCATION, startAt: START, endAt: END },
  });
  await db.eventSettings.update({
    where: { eventId },
    data: { timezone: TIME_ZONE, currency: "CAD", ticketsEnabled: true, memberDiscountAmount: new Prisma.Decimal(5) },
  });
  const tiers = await db.ticketType.updateMany({
    where: { eventId, active: true },
    data: { capacity: 124, maxPerOrder: 1, salesStartAt: openNow ? new Date() : SALES_START, salesEndAt: SALES_END },
  });

  const toronto = (d: Date) => d.toLocaleString("en-CA", { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
  const after = await db.ticketType.findFirst({ where: { eventId, active: true }, select: { salesStartAt: true, salesEndAt: true } });
  console.log({
    title: TITLE,
    event: `${toronto(START)} – ${toronto(END)} (Toronto)`,
    sales: `${toronto(after!.salesStartAt!)} – ${toronto(after!.salesEndAt!)} (Toronto)`,
    ticketTypesUpdated: tiers.count,
  });
}

main().finally(() => db.$disconnect());
