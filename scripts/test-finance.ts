/**
 * Checks the read-only event finance views and the club summary against the
 * [DEMO] data (scripts/seed-demo-finance.ts). Budgets are kept and approved in
 * Google Sheets, so the website has no entry or approval steps left to test.
 *
 *   npx tsx --env-file=.env.local scripts/test-finance.ts
 */
import { db } from "../src/lib/db";
import { eventFinanceAccess, getClubFinanceSummary, getEventFinance } from "../src/lib/finance/reports";

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

  // Who can see an event's money
  check("event staff can see their event", (await eventFinanceAccess(eventStaff.id, ski.id)).view);
  check("Events VP can see it", (await eventFinanceAccess(eventsVp.id, ski.id)).view);
  check("Ops VP can see it", (await eventFinanceAccess(opsVp.id, ski.id)).view);
  check("Finance staff can see it", (await eventFinanceAccess(financeStaff.id, ski.id)).view);
  check("President can see it", (await eventFinanceAccess(president.id, ski.id)).view);
  check("plain member sees nothing", !(await eventFinanceAccess(memberOnly.id, ski.id)).view);

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
