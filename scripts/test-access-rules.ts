/**
 * Checks the permission rules against test users in the [TEST] event's team.
 * Subgroups (event teams, Operations groups) and Social are switched off, so
 * the finance staff, event staff and Social VP test users get nothing from them.
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
  const eventsStaff = await user("events-staff"); await place(eventsStaff.id, G.events, "STAFF");
  const marketingStaff = await user("marketing-staff"); await place(marketingStaff.id, G.marketing, "STAFF");
  const socialVp = await user("social-vp"); await place(socialVp.id, G.social, "VP");
  const nobody = await user("member-only");

  const cases: Array<[string, string, Permission, { groupId: string; label: string } | undefined, boolean]> = [
    ["president", president.id, "finance.view", undefined, true],
    ["president", president.id, "events.delete", { groupId: team.id, label: "event team" }, true],
    ["president", president.id, "events.deletePublished", { groupId: team.id, label: "event team" }, true],
    ["president", president.id, "events.manage", { groupId: team.id, label: "event team" }, true],
    ["president", president.id, "content.manage", undefined, true],
    ["president", president.id, "showcase.manage", undefined, true],
    ["events VP", eventsVp.id, "events.create", undefined, true],
    ["events VP", eventsVp.id, "events.manage", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "events.delete", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "events.deletePublished", { groupId: team.id, label: "event team" }, true],
    ["events VP", eventsVp.id, "finance.view", undefined, false],
    ["events VP", eventsVp.id, "finance.edit", undefined, false],
    ["events VP", eventsVp.id, "groups.manage", { groupId: marketing.id, label: "Marketing" }, false],
    ["events VP", eventsVp.id, "members.view", undefined, false],
    ["events VP", eventsVp.id, "content.manage", undefined, true],
    ["events VP", eventsVp.id, "showcase.manage", undefined, false],
    ["events VP", eventsVp.id, "memories.manage", undefined, true],
    ["events staff", eventsStaff.id, "events.create", undefined, true],
    ["events staff", eventsStaff.id, "events.manage", { groupId: team.id, label: "event team" }, true],
    ["events staff", eventsStaff.id, "events.delete", { groupId: team.id, label: "event team" }, true],
    ["events staff", eventsStaff.id, "events.deletePublished", { groupId: team.id, label: "event team" }, false],
    ["events staff", eventsStaff.id, "events.checkin", { groupId: team.id, label: "event team" }, true],
    ["events staff", eventsStaff.id, "budget.edit", { groupId: team.id, label: "event team" }, true],
    ["events staff", eventsStaff.id, "memories.manage", undefined, true],
    ["events staff", eventsStaff.id, "groups.manage", undefined, false],
    ["events staff", eventsStaff.id, "announcements.manage", undefined, false],
    ["events staff", eventsStaff.id, "finance.view", undefined, false],
    ["events staff", eventsStaff.id, "profile.public", undefined, true],
    ["marketing staff", marketingStaff.id, "memories.manage", undefined, true],
    ["marketing staff", marketingStaff.id, "events.manage", { groupId: team.id, label: "event team" }, false],
    ["marketing staff", marketingStaff.id, "events.checkin", { groupId: team.id, label: "event team" }, false],
    ["marketing staff", marketingStaff.id, "content.manage", undefined, false],
    ["marketing staff", marketingStaff.id, "uploads.create", undefined, true],
    ["ops VP", opsVp.id, "events.delete", { groupId: team.id, label: "event team" }, false],
    ["ops VP", opsVp.id, "events.manage", { groupId: team.id, label: "event team" }, false],
    ["ops VP", opsVp.id, "finance.view", undefined, true],
    ["ops VP", opsVp.id, "finance.edit", undefined, true],
    ["ops VP", opsVp.id, "budget.edit", undefined, true],
    ["ops VP", opsVp.id, "groups.manage", { groupId: finance.id, label: "Finance" }, true],
    ["ops VP", opsVp.id, "members.view", { groupId: marketing.id, label: "Marketing" }, true],
    ["ops VP", opsVp.id, "members.manage", undefined, true],
    ["ops VP", opsVp.id, "content.manage", undefined, true],
    ["ops VP", opsVp.id, "showcase.manage", undefined, true],
    ["ops VP", opsVp.id, "memories.manage", undefined, false],
    // Switched off: positions in subgroups and Social grant nothing.
    ["finance staff", financeStaff.id, "finance.view", undefined, false],
    ["finance staff", financeStaff.id, "finance.edit", undefined, false],
    ["finance staff", financeStaff.id, "profile.public", undefined, false],
    ["event staff", eventStaff.id, "events.checkin", { groupId: team.id, label: "event team" }, false],
    ["event staff", eventStaff.id, "budget.edit", { groupId: team.id, label: "event team" }, false],
    ["event staff", eventStaff.id, "uploads.create", undefined, false],
    ["social VP", socialVp.id, "announcements.manage", undefined, false],
    ["social VP", socialVp.id, "groups.manage", undefined, false],
    ["member only", nobody.id, "profile.public", undefined, false],
    ["member only", nobody.id, "uploads.create", undefined, false],
    ["member only", nobody.id, "finance.view", undefined, false],
    ["member only", nobody.id, "events.delete", { groupId: team.id, label: "event team" }, false],
  ];

  let failed = 0;
  for (const [who, id, permission, target, expected] of cases) {
    const got = can(await getAccess(id), permission, target);
    const ok = got === expected;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${who.padEnd(16)} ${permission.padEnd(23)} ${("(" + (target?.label ?? "anywhere") + ")").padEnd(13)} → ${got}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
