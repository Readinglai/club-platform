/**
 * Demo finance data from the 2025–26 school year, for showing the finance
 * screens. Everything is labelled [DEMO]; events are unpublished.
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo-finance.ts            # create (skips what exists)
 *   npx tsx --env-file=.env.local scripts/seed-demo-finance.ts --remove   # remove all [DEMO] finance data
 *
 * Needs the test users from scripts/test-access-rules.ts (event-staff,
 * finance-staff @test.rocsaut.invalid) as the people who entered things.
 */
import { db } from "../src/lib/db";
import { eventGroupSlug, GROUP_SLUGS } from "../src/lib/access/groups";

const TAG = "[DEMO]";

type Line = { category: string; item: string; planned: number; actual?: number; qty?: number; unit?: number };

const EVENTS: Array<{
  title: string;
  location: string;
  /** UTC instants for Toronto local times. */
  startAt: string;
  endAt: string;
  income: Array<{ category: string; description: string; amount: number; date: string }>;
  lines: Line[];
}> = [
  {
    title: `${TAG} Halloween Party 2025`,
    location: "Toronto",
    startAt: "2025-10-15T23:00:00Z", // Oct 15, 7:00 PM EDT
    endAt: "2025-10-16T03:30:00Z",
    income: [{ category: "Ticket sales", description: "Ticket sales (128 tickets)", amount: 3200, date: "2025-10-15" }],
    lines: [
      { category: "Venue", item: "Venue rental, 4.5 hours", planned: 1200, actual: 1200 },
      { category: "Food & Drinks", item: "Drinks package", planned: 900, actual: 960 },
      { category: "Decorations", item: "Halloween decorations", planned: 250, actual: 230 },
      { category: "Entertainment", item: "DJ", planned: 400, actual: 400 },
    ],
  },
  {
    title: `${TAG} New Year Party 2026`,
    location: "Toronto",
    startAt: "2026-02-09T23:00:00Z", // Feb 9, 6:00 PM EST
    endAt: "2026-02-10T03:00:00Z",
    income: [{ category: "Ticket sales", description: "Ticket sales (90 tickets)", amount: 1800, date: "2026-02-09" }],
    lines: [
      { category: "Venue", item: "Hall rental", planned: 600, actual: 600 },
      { category: "Food & Drinks", item: "Catering, 90 people", qty: 90, unit: 7.78, planned: 700, actual: 745 },
      { category: "Prizes & Gifts", item: "Lucky draw prizes and red envelopes", planned: 200, actual: 180 },
    ],
  },
  {
    title: `${TAG} Ski Trip — Toronto to Blue Mountain`,
    location: "Blue Mountain, ON",
    startAt: "2026-02-18T12:00:00Z", // Feb 18, 7:00 AM EST
    endAt: "2026-02-21T01:00:00Z", // Feb 20, 8:00 PM EST
    income: [{ category: "Trip fees", description: "Trip fees (38 × $250)", amount: 9500, date: "2026-02-01" }],
    lines: [
      { category: "Transportation", item: "Coach bus, 56 seats, return", qty: 1, unit: 2400, planned: 2400, actual: 2400 },
      { category: "Lodging", item: "Chalet, 2 nights", qty: 2, unit: 2100, planned: 4200, actual: 4200 },
      { category: "Activities & Tickets", item: "Lift tickets, 2 days", qty: 38, unit: 78.95, planned: 3000, actual: 3040 },
      { category: "Food & Drinks", item: "Group dinners and snacks", planned: 500, actual: 520 },
    ],
  },
];

const CLUB_WIDE = [
  { type: "INCOME" as const, category: "Opening balance", description: "Carried over from 2024–25", amount: 2000, date: "2025-09-01" },
  { type: "INCOME" as const, category: "Sponsorship", description: "Sponsorship, fall term", amount: 1500, date: "2025-10-01" },
];

const testUser = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const dateAt = (day: string) => new Date(`${day}T17:00:00Z`); // midday Toronto, never shifts the date

async function remove() {
  const events = await db.event.findMany({ where: { title: { startsWith: TAG } }, select: { id: true } });
  const ids = events.map((e) => e.id);
  await db.financeRecord.deleteMany({ where: { OR: [{ eventId: { in: ids } }, { description: { startsWith: TAG } }] } });
  await db.eventBudgetLine.deleteMany({ where: { eventId: { in: ids } } });
  await db.eventSettings.deleteMany({ where: { eventId: { in: ids } } });
  const groups = await db.group.findMany({ where: { eventId: { in: ids } }, select: { id: true } });
  await db.groupMember.deleteMany({ where: { groupId: { in: groups.map((g) => g.id) } } });
  await db.group.deleteMany({ where: { id: { in: groups.map((g) => g.id) } } });
  await db.event.deleteMany({ where: { id: { in: ids } } });
  console.log(`removed ${ids.length} demo event(s) and their finance data`);
}

async function seed() {
  const [eventStaff, financeStaff] = await Promise.all(["event-staff", "finance-staff"].map(testUser));
  const eventsDept = await db.group.findUniqueOrThrow({ where: { slug: GROUP_SLUGS.events } });

  for (const c of CLUB_WIDE) {
    const description = `${TAG} ${c.description}`;
    if (await db.financeRecord.findFirst({ where: { description } })) continue;
    await db.financeRecord.create({
      data: { type: c.type, category: c.category, description, amount: c.amount, date: dateAt(c.date), createdById: financeStaff.id },
    });
  }

  for (const e of EVENTS) {
    if (await db.event.findFirst({ where: { title: e.title } })) {
      console.log(`exists   ${e.title}`);
      continue;
    }
    const event = await db.event.create({
      data: { title: e.title, location: e.location, startAt: new Date(e.startAt), endAt: new Date(e.endAt), published: false },
    });

    const team = await db.group.create({
      data: { slug: eventGroupSlug(event.id), name: e.title, parentId: eventsDept.id, eventId: event.id },
    });
    await db.groupMember.create({ data: { groupId: team.id, userId: eventStaff.id, position: "STAFF" } });

    await db.eventSettings.create({ data: { eventId: event.id, budgetEnabled: true } });

    await db.eventBudgetLine.createMany({
      data: e.lines.map((l, i) => ({
        eventId: event.id,
        category: l.category,
        item: l.item,
        quantity: l.qty ?? null,
        unitCost: l.unit ?? null,
        plannedAmount: l.planned,
        sortOrder: i,
      })),
    });

    const eventDay = e.startAt.slice(0, 10);
    await db.financeRecord.createMany({
      data: [
        ...e.lines
          .filter((l) => l.actual !== undefined)
          .map((l) => ({
            type: "EXPENSE" as const,
            category: l.category,
            description: `${TAG} ${l.item}`,
            amount: l.actual!,
            date: dateAt(eventDay),
            eventId: event.id,
            createdById: eventStaff.id,
          })),
        ...e.income.map((inc) => ({
          type: "INCOME" as const,
          category: inc.category,
          description: `${TAG} ${inc.description}`,
          amount: inc.amount,
          date: dateAt(inc.date),
          eventId: event.id,
          createdById: eventStaff.id,
        })),
      ],
    });
    console.log(`created  ${e.title}`);
  }
}

(process.argv.includes("--remove") ? remove() : seed()).finally(() => db.$disconnect());
