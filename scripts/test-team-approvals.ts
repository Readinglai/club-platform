/**
 * Checks team management and approvals with labelled test data
 * (@test.rocsaut.invalid users from test-access-rules.ts, [TEST] events).
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts      # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-team-approvals.ts
 */
import { db } from "../src/lib/db";
import { GROUP_SLUGS as G } from "../src/lib/access/groups";
import { addToGroup, archiveGroup, createSubgroup, removeFromGroup } from "../src/lib/access/team";
import { decideApproval, requestApproval } from "../src/lib/access/approvals";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const group = (slug: string) => db.group.findUniqueOrThrow({ where: { slug } });

async function main() {
  const [president, eventsVp, opsVp, eventStaff, memberOnly] = await Promise.all(
    ["president", "events-vp", "ops-vp", "event-staff", "member-only"].map(user)
  );
  const [events, marketing, finance, executive] = await Promise.all([G.events, G.marketing, G.finance, G.executive].map(group));

  // --- Team management
  await db.groupMember.deleteMany({ where: { userId: memberOnly.id } });

  let r = await addToGroup({ actorId: eventsVp.id, groupId: events.id, email: "MEMBER-ONLY@test.rocsaut.invalid", position: "STAFF" });
  check("Events VP adds Staff to Events (email any case)", r.ok);
  r = await addToGroup({ actorId: eventsVp.id, groupId: marketing.id, email: "member-only@test.rocsaut.invalid", position: "STAFF" });
  check("Events VP can't add to Marketing", !r.ok && r.status === 403);
  r = await addToGroup({ actorId: eventsVp.id, groupId: events.id, email: "member-only@test.rocsaut.invalid", position: "VP" });
  check("Events VP can't appoint a VP", !r.ok && r.status === 403);
  r = await addToGroup({ actorId: opsVp.id, groupId: finance.id, email: "member-only@test.rocsaut.invalid", position: "STAFF" });
  check("Ops VP adds Staff to Finance subgroup", r.ok);
  r = await addToGroup({ actorId: eventStaff.id, groupId: events.id, email: "member-only@test.rocsaut.invalid", position: "STAFF" });
  check("Staff can't manage groups", !r.ok && r.status === 403);
  r = await addToGroup({ actorId: eventsVp.id, groupId: events.id, email: "nobody@test.rocsaut.invalid", position: "STAFF" });
  check("unknown email is reported, not created", !r.ok && r.status === 404);

  const vpMembership = await db.groupMember.findFirstOrThrow({ where: { userId: eventsVp.id, groupId: events.id } });
  r = await removeFromGroup({ actorId: opsVp.id, memberId: vpMembership.id });
  check("Ops VP can't remove the Events VP", !r.ok);

  const presMembership = await db.groupMember.findFirstOrThrow({ where: { userId: president.id, groupId: executive.id } });
  const presidents = await db.groupMember.count({ where: { position: "PRESIDENT", groupId: executive.id } });
  check(`club has ${presidents} President(s) (test + placeholder)`, presidents >= 1);

  const sub = await createSubgroup({ actorId: eventsVp.id, parentId: events.id, name: "[TEST] Welcome Week" });
  check("Events VP creates a subgroup", sub.ok);
  const subId = sub.ok ? sub.value! : "";
  const nope = await createSubgroup({ actorId: eventsVp.id, parentId: marketing.id, name: "[TEST] Nope" });
  check("Events VP can't create under Marketing", !nope.ok);
  r = await archiveGroup({ actorId: eventsVp.id, groupId: subId });
  check("Events VP archives own subgroup", r.ok);
  r = await archiveGroup({ actorId: president.id, groupId: events.id });
  check("departments can't be archived", !r.ok);

  const staffRow = await db.groupMember.findFirstOrThrow({ where: { userId: memberOnly.id, groupId: events.id } });
  r = await removeFromGroup({ actorId: eventsVp.id, memberId: staffRow.id });
  check("Events VP removes Staff", r.ok);
  void presMembership;

  // --- Approvals: deleting an event
  await db.approvalRequest.deleteMany({ where: { details: { path: ["title"], string_starts_with: "[TEST]" } } });
  const mk = (title: string) => db.event.create({ data: { title, startAt: new Date(Date.now() + 864e5), published: false } });

  const halloween = await requestApproval({ userId: president.id, action: "event.delete", targetId: "00b84455-309c-4dba-9722-b031f9042081" });
  check("Halloween can never be requested for deletion", !halloween.ok);

  const withTickets = await db.event.findFirstOrThrow({ where: { title: "[TEST] Phase 0 ticketing" } });
  const sold = await requestApproval({ userId: eventsVp.id, action: "event.delete", targetId: withTickets.id });
  check("event with tickets can't be requested", !sold.ok);

  const e1 = await mk("[TEST] Delete me (VP asks)");
  const q1 = await requestApproval({ userId: eventsVp.id, action: "event.delete", targetId: e1.id });
  check("Events VP requests deletion", q1.ok);
  const dup = await requestApproval({ userId: eventsVp.id, action: "event.delete", targetId: e1.id });
  check("duplicate request refused", !dup.ok && dup.status === 409);
  const byStaff = await requestApproval({ userId: eventStaff.id, action: "event.delete", targetId: e1.id });
  check("Staff can't request deletion", !byStaff.ok && byStaff.status === 403);
  let d = await decideApproval({ userId: eventsVp.id, requestId: q1.ok ? q1.id! : "", decision: "APPROVED" });
  check("requester can't approve own request", !d.ok && d.status === 403);
  d = await decideApproval({ userId: opsVp.id, requestId: q1.ok ? q1.id! : "", decision: "APPROVED" });
  check("Ops VP can't approve", !d.ok && d.status === 403);
  d = await decideApproval({ userId: president.id, requestId: q1.ok ? q1.id! : "", decision: "APPROVED", note: "ok" });
  check("President approves → event deleted", d.ok && !(await db.event.findUnique({ where: { id: e1.id } })));

  const e2 = await mk("[TEST] Delete me (President asks)");
  const q2 = await requestApproval({ userId: president.id, action: "event.delete", targetId: e2.id });
  check("President requests deletion", q2.ok);
  d = await decideApproval({ userId: president.id, requestId: q2.ok ? q2.id! : "", decision: "APPROVED" });
  check("President can't approve own request", !d.ok);
  d = await decideApproval({ userId: eventsVp.id, requestId: q2.ok ? q2.id! : "", decision: "REJECTED", note: "keep it" });
  check("Events VP decides the President's request (rejects)", d.ok && Boolean(await db.event.findUnique({ where: { id: e2.id } })));
  d = await decideApproval({ userId: eventsVp.id, requestId: q2.ok ? q2.id! : "", decision: "APPROVED" });
  check("decided request can't be decided again", !d.ok);
  await db.event.delete({ where: { id: e2.id } });

  // Leave the "member only" test user without any group again.
  await db.groupMember.deleteMany({ where: { userId: memberOnly.id } });

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
