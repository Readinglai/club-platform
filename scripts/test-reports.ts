/**
 * Checks the Reports totals: event attendance against direct counts of the
 * real tickets, and memberships per month using a few 2099 test memberships
 * (codes OTSA-2099-R*, removed before and after). Also who may see reports.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-reports.ts
 */
import { db } from "../src/lib/db";
import { can, getAccess } from "../src/lib/access/can";
import { termStartingIn } from "../src/lib/membership/term";
import { attendanceCsv, eventAttendance, membershipsByMonth, membershipsCsv } from "../src/lib/reports/summary";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const cleanup = () => db.membership.deleteMany({ where: { memberCode: { startsWith: "OTSA-2099-R" } } });

async function main() {
  await cleanup();
  const [president, eventsVp, eventStaff, memberOnly] = await Promise.all(["president", "events-vp", "event-staff", "member-only"].map(user));
  const sees = async (id: string) => can(await getAccess(id), "reports.view");
  check("President sees reports", await sees(president.id));
  check("Events VP sees reports", await sees(eventsVp.id));
  check("Staff don't", !(await sees(eventStaff.id)));
  check("members don't", !(await sees(memberOnly.id)));

  // --- Event attendance, against direct counts
  const rows = await eventAttendance();
  let allMatch = true;
  for (const r of rows) {
    const [sold, used, oldSold, oldUsed] = await Promise.all([
      db.ticket.count({ where: { eventId: r.eventId, status: "VALID" } }),
      db.ticket.count({ where: { eventId: r.eventId, status: "VALID", checkedInAt: { not: null } } }),
      db.eventTicket.count({ where: { eventId: r.eventId, status: "valid" } }),
      db.eventTicket.count({ where: { eventId: r.eventId, status: "valid", checkedIn: true } }),
    ]);
    if (r.sold !== sold + oldSold || r.checkedIn !== used + oldUsed) allMatch = false;
  }
  check("every event's sold / checked-in matches the tickets", allMatch, `${rows.length} events`);
  const halloween = rows.find((r) => /halloween/i.test(r.title));
  check("Halloween (older tickets) is included", Boolean(halloween && halloween.sold > 0), halloween ? `${halloween.sold} sold` : "");
  check("events without tickets are left out", rows.every((r) => r.sold > 0));
  check("newest first", rows.every((r, i) => i === 0 || rows[i - 1].startAt >= r.startAt));
  check("rate is whole percent", rows.every((r) => r.rate === Math.round((r.checkedIn / r.sold) * 100)));
  const csv = attendanceCsv(rows).split("\n");
  check("events CSV: header + one line each", csv.length === rows.length + 1 && csv[0].startsWith("event,date"));
  check("CSV date is the Toronto date", !halloween || csv.some((l) => l.includes("Halloween") && l.includes(",2026-10-23,")));

  // --- Memberships by month (school year 2099–00)
  const term = termStartingIn(2099);
  const add = (n: number, source: "STRIPE" | "MANUAL" | "COMPLIMENTARY", createdAt: string, status: "ACTIVE" | "CANCELLED" = "ACTIVE") =>
    db.membership.create({
      data: { memberCode: `OTSA-2099-R${n}`, status, source, termStart: term.termStart, termEnd: term.termEnd, createdAt: new Date(createdAt) },
    });
  await add(1, "STRIPE", "2099-09-03T15:00:00Z");
  await add(2, "STRIPE", "2099-09-30T23:30:00-04:00"); // still September in Toronto
  await add(3, "MANUAL", "2100-01-10T15:00:00Z");
  await add(4, "COMPLIMENTARY", "2099-08-20T15:00:00Z"); // before the year began → September
  await add(5, "STRIPE", "2099-10-05T15:00:00Z", "CANCELLED"); // not counted

  const m = await membershipsByMonth(2099);
  check("12 months, September to August", m.months.length === 12 && m.months[0].month === "2099-09" && m.months[11].month === "2100-08", `${m.months[0].month}…${m.months[11].month}`);
  check("total leaves out cancelled", m.total === 4, String(m.total));
  check("September: 2 online + 1 early staff", m.months[0].total === 3 && m.months[0].STRIPE === 2 && m.months[0].COMPLIMENTARY === 1);
  check("Toronto time decides the month", m.months[1].total === 0);
  check("January: 1 added by hand", m.months[4].MANUAL === 1 && m.months[4].total === 1);
  check("totals by source", m.totals.STRIPE === 2 && m.totals.MANUAL === 1 && m.totals.COMPLIMENTARY === 1 && m.totals.IMPORTED === 0);
  const mcsv = membershipsCsv(m.months).split("\n");
  check("memberships CSV: header + 12 months", mcsv.length === 13 && mcsv[1].startsWith("2099-09,3,2,0,1,0"), mcsv[1]);

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
