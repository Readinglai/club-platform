/**
 * Checks event finance reports and the club summary against the [DEMO] data
 * (scripts/seed-demo-finance.ts). Leaves the demo data as it found it.
 *
 *   npx tsx --env-file=.env.local scripts/test-finance.ts
 */
import { db } from "../src/lib/db";
import { assertEditable, eventFinanceAccess, getClubFinanceSummary, getEventFinance, reviewReport, submitReport } from "../src/lib/finance/reports";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });

async function main() {
  const [eventsVp, eventStaff, opsVp, financeStaff, president, memberOnly] = await Promise.all(
    ["events-vp", "event-staff", "ops-vp", "finance-staff", "president", "member-only"].map(user)
  );
  const ski = await db.event.findFirstOrThrow({ where: { title: { startsWith: "[DEMO] Ski Trip" } } });
  const halloween = await db.event.findFirstOrThrow({ where: { title: "[DEMO] Halloween Party 2025" } });

  // Numbers
  const f = (await getEventFinance(ski.id))!;
  check("ski trip totals", f.totals.planned === 10100 && f.totals.spent === 10160 && f.totals.income === 9500, JSON.stringify(f.totals));
  const lift = f.byCategory.find((c) => c.category === "Activities & Tickets");
  check("budget vs actual per category", lift?.planned === 3000 && lift?.actual === 3040);
  check("ski trip is waiting for review", f.report.status === "SUBMITTED");

  const club = await getClubFinanceSummary();
  // Confirmed: 2000 + 1500 + Halloween (3200 - 2790) + New Year (1800 - 1525); pending: ski (9500 - 10160)
  check("confirmed balance", Math.round(club.balance.confirmed) >= 4185, String(club.balance.confirmed));
  check("pending part is the ski trip", Math.round(club.balance.pending) === -660, String(club.balance.pending));
  check("spending grouped by school year", club.spendingByYear.some((y) => y.schoolYear === "2025–26" && (y.categories["Venue"] ?? 0) >= 1800));

  // Who can do what
  const staffOnSki = await eventFinanceAccess(eventStaff.id, ski.id);
  check("event staff can edit and submit own event", staffOnSki.edit && staffOnSki.submit && !staffOnSki.review);
  check("Events VP can review", (await eventFinanceAccess(eventsVp.id, ski.id)).review);
  check("Ops VP can view but not review", (await eventFinanceAccess(opsVp.id, ski.id)).view && !(await eventFinanceAccess(opsVp.id, ski.id)).review);
  check("Finance staff can view", (await eventFinanceAccess(financeStaff.id, ski.id)).view);
  check("plain member sees nothing", !(await eventFinanceAccess(memberOnly.id, ski.id)).view);

  // Locking and reviewing
  check("submitted report is locked for edits", !(await assertEditable(eventStaff.id, ski.id)).ok);
  check("approved report is locked for edits", !(await assertEditable(eventStaff.id, halloween.id)).ok);
  let r = await reviewReport({ actorId: eventStaff.id, eventId: ski.id, decision: "APPROVED" });
  check("staff can't approve", !r.ok);
  r = await reviewReport({ actorId: eventsVp.id, eventId: ski.id, decision: "RETURNED" });
  check("returning needs a note", !r.ok);
  r = await reviewReport({ actorId: eventsVp.id, eventId: ski.id, decision: "RETURNED", note: "Food is over budget, add the receipt." });
  check("Events VP returns with a note", r.ok);
  check("returned report is editable again", (await assertEditable(eventStaff.id, ski.id)).ok);
  r = await submitReport(eventStaff.id, ski.id);
  check("team resubmits", r.ok);
  r = await reviewReport({ actorId: president.id, eventId: ski.id, decision: "APPROVED", note: "ok" });
  check("President can also review", r.ok);
  check("confirmed balance now includes the ski trip", Math.round((await getClubFinanceSummary()).balance.pending) === 0);

  // Put the demo back to "waiting for review".
  await db.eventSettings.update({
    where: { eventId: ski.id },
    data: { financeStatus: "SUBMITTED", financeReviewedAt: null, financeReviewedById: null, financeReviewNote: null, financeSubmittedById: eventStaff.id },
  });

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
