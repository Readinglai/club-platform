/**
 * Checks the Members page logic: who may see and change members, adding by
 * hand, importing a list, staff memberships, the list and one member's page.
 * Uses the year 2099 so no real codes are taken; test data only
 * (@test.rocsaut.invalid, codes OTSA-2099-*), removed before and after.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-members-admin.ts
 */
import { db } from "../src/lib/db";
import {
  addMember,
  getMemberDetail,
  grantComplimentaryToStaff,
  importMembers,
  listMemberships,
  memberAccess,
  membersCsv,
} from "../src/lib/membership/admin";
import { termStartingIn } from "../src/lib/membership/term";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const cleanup = () =>
  db.membership.deleteMany({ where: { OR: [{ memberCode: { startsWith: "OTSA-2099-" } }, { memberCode: { startsWith: "PENDING-test-members-" } }] } });

async function main() {
  await cleanup();
  const term = termStartingIn(2099);
  const [president, eventsVp, opsVp, eventStaff, memberOnly] = await Promise.all(
    ["president", "events-vp", "ops-vp", "event-staff", "member-only"].map(user)
  );

  // --- Who may do what
  const ops = await memberAccess(opsVp.id);
  check("Ops VP can see and change members", ops.view && ops.manage);
  const p = await memberAccess(president.id);
  check("President can see and change members", p.view && p.manage);
  const ev = await memberAccess(eventsVp.id);
  check("Events VP can't see members", !ev.view && !ev.manage);
  check("Staff can't see members", !(await memberAccess(eventStaff.id)).view);

  // --- Adding by hand
  let r = await addMember(eventsVp.id, { name: "Nope", email: "nope@test.rocsaut.invalid" }, term);
  check("Events VP can't add members", !r.ok && r.status === 403);
  r = await addMember(opsVp.id, { name: "  Jane   Test ", email: "Jane@Test.rocsaut.invalid" }, term);
  check("Ops VP adds a member → first code 0300", r.ok && r.value === "OTSA-2099-0300", r.ok ? r.value : r.message);
  const jane = await db.membership.findFirstOrThrow({ where: { memberCode: "OTSA-2099-0300" } });
  check("name tidied, email lower-cased, MANUAL & ACTIVE", jane.name === "Jane Test" && jane.email === "jane@test.rocsaut.invalid" && jane.source === "MANUAL" && jane.status === "ACTIVE");
  check("term runs Sep 1 – Aug 31", jane.termStart.getTime() === term.termStart.getTime() && jane.termEnd.getTime() === term.termEnd.getTime());
  r = await addMember(opsVp.id, { name: "Jane again", email: "JANE@test.rocsaut.invalid" }, term);
  check("same email twice in a year is refused", !r.ok && r.status === 409);
  r = await addMember(opsVp.id, { name: "Bad", email: "not-an-email" }, term);
  check("invalid email is refused", !r.ok && r.status === 400);
  r = await addMember(president.id, { name: "Member Only", email: "member-only@test.rocsaut.invalid" }, term);
  check("existing account is linked", r.ok && (await db.membership.findFirst({ where: { memberCode: r.value, userId: memberOnly.id } })) !== null);

  // --- Import
  const csv = "name,email\nAmy Test,amy@test.rocsaut.invalid\n,missing-name@test.rocsaut.invalid\nJane Test,JANE@test.rocsaut.invalid\nAmy Again,amy@test.rocsaut.invalid\n";
  const dry = await importMembers(opsVp.id, csv, false, term);
  const marks = dry.ok ? dry.results.map((x) => x.result) : [];
  check("check marks ready / invalid / already / duplicate, header skipped", marks.join(",") === "ready,invalid,already:OTSA-2099-0300,duplicate", marks.join(","));
  check("checking adds nobody", (await db.membership.count({ where: { email: "amy@test.rocsaut.invalid" } })) === 0);
  const applied = await importMembers(opsVp.id, csv, true, term);
  const outcomes = applied.ok ? applied.results.map((x) => x.result) : [];
  check("import adds the ready rows only", outcomes.join(",") === "added:OTSA-2099-0302,invalid,already:OTSA-2099-0300,duplicate", outcomes.join(","));
  check("Events VP can't import", !(await importMembers(eventsVp.id, csv, false, term)).ok);

  // --- Staff memberships (only the test staff, so real staff are untouched)
  const testStaff = [eventsVp.id, eventStaff.id, memberOnly.id];
  // An abandoned checkout from yesterday (closed at Stripe) and one opened just now.
  const pendingCheckout = (userId: string, n: number, createdAt: Date) =>
    db.membership.create({
      data: { userId, memberCode: `PENDING-test-members-${n}`, status: "PENDING", source: "STRIPE", termStart: term.termStart, termEnd: term.termEnd, createdAt },
    });
  await pendingCheckout(eventStaff.id, 1, new Date(Date.now() - 86_400_000));
  await pendingCheckout(president.id, 2, new Date());
  const preview = await grantComplimentaryToStaff(opsVp.id, false, { term, onlyUserIds: [...testStaff, president.id] });
  const names = preview.ok ? preview.people.map((x) => x.email).sort() : [];
  check("preview lists staff without a membership", names.join(",") === "event-staff@test.rocsaut.invalid,events-vp@test.rocsaut.invalid", names.join(","));
  check("abandoned checkout doesn't count, open one does", names.includes("event-staff@test.rocsaut.invalid") && !names.includes("president@test.rocsaut.invalid"));
  check("preview grants nothing", (await db.membership.count({ where: { memberCode: { startsWith: "OTSA-2099-1" } } })) === 0);
  const granted = await grantComplimentaryToStaff(opsVp.id, true, { term, onlyUserIds: testStaff });
  const codes = granted.ok ? granted.people.map((x) => x.code).sort() : [];
  check("staff get 1xxx codes", codes.join(",") === "OTSA-2099-1001,OTSA-2099-1002", codes.join(","));
  const comp = await db.membership.findFirstOrThrow({ where: { memberCode: "OTSA-2099-1001" } });
  check("staff memberships are COMPLIMENTARY, $0", comp.source === "COMPLIMENTARY" && Number(comp.amountPaid) === 0);
  const again = await grantComplimentaryToStaff(opsVp.id, false, { term, onlyUserIds: testStaff });
  check("running again finds nobody", again.ok && again.people.length === 0);
  check("Events VP can't grant", !(await grantComplimentaryToStaff(eventsVp.id, false, { term })).ok);

  // --- List and detail
  const list = await listMemberships({ year: 2099 });
  check("list shows all 2099 members", list.rows.length === 5, String(list.rows.length));
  check("counts by status", list.counts.ACTIVE === 5);
  check("search by code", (await listMemberships({ year: 2099, q: "1002" })).rows.length === 1);
  check("search by name", (await listMemberships({ year: 2099, q: "amy" })).rows[0]?.email === "amy@test.rocsaut.invalid");
  check("filter by source", (await listMemberships({ year: 2099, source: "COMPLIMENTARY" })).rows.length === 2);
  check("other years not mixed in", (await listMemberships({ year: 2099 })).rows.every((x) => x.memberCode.startsWith("OTSA-2099-")));
  const csvOut = membersCsv(list.rows);
  check("CSV has header + one line each", csvOut.split("\n").length === 6 && csvOut.startsWith("member_code,name,email"));

  const detail = await getMemberDetail(comp.id);
  check("detail shows the person's positions", Boolean(detail && detail.positions.length > 0));
  check("detail lists their memberships", Boolean(detail?.memberships.some((m) => m.memberCode === "OTSA-2099-1001")));
  const noAccount = await getMemberDetail((await db.membership.findFirstOrThrow({ where: { email: "amy@test.rocsaut.invalid" } })).id);
  check("member without an account still opens", Boolean(noAccount && !noAccount.hasAccount && noAccount.email === "amy@test.rocsaut.invalid"));
  check("unknown member is null", (await getMemberDetail("nope")) === null);

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
