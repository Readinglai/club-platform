/**
 * Checks the permission rules against test users in the [TEST] event's team.
 * Creates labelled test data (users @test.rocsaut.invalid) if missing.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts
 */
import { db } from "../src/lib/db";
import { can, getAccess } from "../src/lib/access/can";
import { eventGroupSlug, GROUP_SLUGS as G } from "../src/lib/access/groups";
import type { GroupPosition } from "../src/generated/prisma/client";
import type { Permission } from "../src/lib/access/rules";

const TEST_EVENT_TITLE = "[TEST] Phase 0 ticketing";

async function user(key: string) {
  const email = `${key}@test.rocsaut.invalid`;
  return db.user.upsert({ where: { email }, create: { email, name: `[TEST] ${key}` }, update: {} });
}

async function place(userId: string, slug: string, position: GroupPosition) {
  const group = await db.group.findUniqueOrThrow({ where: { slug } });
  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, position },
    update: { position },
  });
}

async function main() {
  const event = await db.event.findFirstOrThrow({ where: { title: TEST_EVENT_TITLE } });
  const events = await db.group.findUniqueOrThrow({ where: { slug: G.events } });
  const team = await db.group.upsert({
    where: { slug: eventGroupSlug(event.id) },
    create: { slug: eventGroupSlug(event.id), name: TEST_EVENT_TITLE, parentId: events.id, eventId: event.id },
    update: {},
  });
  const marketing = await db.group.findUniqueOrThrow({ where: { slug: G.marketing } });
  const finance = await db.group.findUniqueOrThrow({ where: { slug: G.finance } });

  const president = await user("president"); await place(president.id, G.executive, "PRESIDENT");
  const eventsVp = await user("events-vp"); await place(eventsVp.id, G.events, "VP");
  const opsVp = await user("ops-vp"); await place(opsVp.id, G.operations, "VP");
  const financeStaff = await user("finance-staff"); await place(financeStaff.id, G.finance, "STAFF");
  const eventStaff = await user("event-staff"); await place(eventStaff.id, team.slug, "STAFF");
  const nobody = await user("member-only");

  const cases: Array<[string, string, Permission, { groupId: string; label: string } | undefined, boolean]> = [
    ["president", president.id, "finance.view", undefined, true],
    ["president", president.id, "approvals.decide", undefined, true],
    ["president", president.id, "events.manage", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "events.create", undefined, true],
    ["events VP", eventsVp.id, "events.manage", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "expense.approve", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "finance.view", undefined, false],
    ["events VP", eventsVp.id, "groups.manage", { groupId: marketing.id, label: "Marketing" }, false],
    ["events VP", eventsVp.id, "approvals.decide", undefined, false],
    ["ops VP", opsVp.id, "finance.view", undefined, true],
    ["ops VP", opsVp.id, "budget.edit", undefined, true],
    ["ops VP", opsVp.id, "groups.manage", { groupId: finance.id, label: "Finance" }, true],
    ["ops VP", opsVp.id, "events.manage", { groupId: team.id, label: "event team" }, false],
    ["finance staff", financeStaff.id, "finance.view", undefined, true],
    ["finance staff", financeStaff.id, "budget.edit", undefined, false],
    ["event staff", eventStaff.id, "expense.submit", { groupId: team.id, label: "event team" }, true],
    ["event staff", eventStaff.id, "events.manage", { groupId: team.id, label: "event team" }, false],
    ["events VP", eventsVp.id, "members.view", undefined, false],
    ["ops VP", opsVp.id, "members.view", { groupId: marketing.id, label: "Marketing" }, true],
    ["event staff", eventStaff.id, "events.checkin", { groupId: team.id, label: "event team" }, true],
    ["event staff", eventStaff.id, "expense.approve", { groupId: team.id, label: "event team" }, false],
    ["event staff", eventStaff.id, "tasks.use", undefined, true],
    ["finance staff", financeStaff.id, "tasks.use", undefined, true],
    ["event staff", eventStaff.id, "budget.edit", { groupId: team.id, label: "event team" }, true],
    ["event staff", eventStaff.id, "finance.view", undefined, false],
    ["event staff", eventStaff.id, "finance.edit", undefined, false],
    ["finance staff", financeStaff.id, "finance.edit", undefined, true],
    ["ops VP", opsVp.id, "finance.edit", undefined, true],
    ["events VP", eventsVp.id, "finance.edit", undefined, false],
    ["member only", nobody.id, "tasks.use", undefined, false],
    ["member only", nobody.id, "uploads.create", undefined, false],
    ["member only", nobody.id, "finance.view", undefined, false],
    ["member only", nobody.id, "expense.submit", { groupId: team.id, label: "event team" }, false],
  ];

  let failed = 0;
  for (const [who, id, permission, target, expected] of cases) {
    const got = can(await getAccess(id), permission, target);
    const ok = got === expected;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${who.padEnd(14)} ${permission.padEnd(17)} ${("(" + (target?.label ?? "anywhere") + ")").padEnd(13)} → ${got}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
