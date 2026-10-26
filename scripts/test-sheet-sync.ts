/**
 * Checks connecting and syncing an event's Google Sheet budget against the
 * database, using sample sheet cells instead of Google (scripts/fixtures).
 * Works on "[TEST] Lunar New Year Night 2027" and puts it back as it was.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-sheet-sync.ts
 */
import { db } from "../src/lib/db";
import { getClubFinanceSummary, getEventFinance } from "../src/lib/finance/reports";
import { connectBudgetSheet, SHEET_BATCH_PREFIX, syncBudgetSheet, syncBudgetSheetAs } from "../src/lib/finance/sheet-sync";
import { filledBudget, set } from "./fixtures/filled-budget";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const SHEET_LINK = "https://docs.google.com/spreadsheets/d/1TestTestTestTestTestTestTestTestTestTest0/edit#gid=0";

async function main() {
  const [eventsVp, memberOnly] = await Promise.all(["events-vp", "member-only"].map(user));
  const event = await db.event.findFirstOrThrow({ where: { title: "[TEST] Lunar New Year Night 2027" }, select: { id: true, settings: true } });
  const demo = await db.event.findFirstOrThrow({ where: { title: { startsWith: "[DEMO] Ski Trip" } }, select: { id: true } });
  const before = event.settings!;
  const fromSheet = { eventId: event.id, importBatchId: { startsWith: SHEET_BATCH_PREFIX } };

  try {
    // --- Who may connect, and what's refused
    let r = await connectBudgetSheet(memberOnly.id, event.id, SHEET_LINK);
    check("a plain member can't connect", !r.ok && r.status === 403);
    r = await connectBudgetSheet(eventsVp.id, event.id, "https://example.com/not-a-sheet");
    check("a non-sheet link is refused", !r.ok && r.status === 400);
    r = await connectBudgetSheet(eventsVp.id, demo.id, SHEET_LINK);
    check("an event with typed-in numbers can't be connected", !r.ok && r.status === 409);

    // --- Connecting saves the link; without the robot account the sync reports why
    r = await connectBudgetSheet(eventsVp.id, event.id, SHEET_LINK);
    let s = await db.eventSettings.findUniqueOrThrow({ where: { eventId: event.id } });
    check("connect saves the sheet and who added it", s.budgetSheetId === "1TestTestTestTestTestTestTestTestTestTest0" && s.budgetSheetConnectedBy === eventsVp.id);
    check("without the robot account the reason is shown", !r.ok && (s.budgetSheetSyncError ?? "").length > 0, s.budgetSheetSyncError ?? "");

    // --- A sync with the sample sheet
    r = await syncBudgetSheet(event.id, { ...filledBudget(), title: "[TEST] Lunar budget" });
    check("sync succeeds", r.ok, r.ok ? "" : r.message);
    s = await db.eventSettings.findUniqueOrThrow({ where: { eventId: event.id } });
    check("sync clears the error and records the time", s.budgetSheetSyncError === null && s.budgetSheetSyncedAt !== null);
    check("approval in the sheet → Approved here", s.financeStatus === "APPROVED");

    const lines = await db.eventBudgetLine.findMany({ where: fromSheet, orderBy: { sortOrder: "asc" } });
    check("six category budget lines", lines.length === 6, lines.map((l) => `${l.category}:${l.plannedAmount}`).join(", "));
    check("the template's 'Alchohol' spelling maps to Alcohol & Beverages", lines[1]?.category === "Alcohol & Beverages");
    check("'Others' maps to Other", lines[5]?.category === "Other");
    const records = await db.financeRecord.findMany({ where: fromSheet });
    const income = records.filter((x) => x.type === "INCOME").reduce((a, x) => a + Number(x.amount), 0);
    const spent = records.filter((x) => x.type === "EXPENSE").reduce((a, x) => a + Number(x.amount), 0);
    check("actual revenue and costs stored", income === 1900 && spent === 1785, `income ${income}, spent ${spent}`);

    const f = (await getEventFinance(event.id))!;
    check("finance page gets the sheet data", f.sheet?.data?.cap === 3000 && f.sheet.data.title === "[TEST] Lunar budget" && f.sheet.data.approval.lines.length === 2);
    const club = await getClubFinanceSummary();
    const inSummary = club.events.find((e) => e.id === event.id);
    check("club overview includes the synced event as approved", inSummary?.status === "APPROVED" && inSummary.spent === 1785);

    // --- The team changes the sheet and syncs again
    const changed = filledBudget();
    set(changed.overview, 12, 2, 1500); // Venue 1200 → 1500
    set(changed.overview, 15, 6, "Not approved yet");
    set(changed.detailed, 17, 8, "Lucky draw prizes"); // a new actual cost
    set(changed.detailed, 17, 12, 280);
    r = await syncBudgetSheet(event.id, changed);
    check("re-sync succeeds", r.ok);
    const lines2 = await db.eventBudgetLine.findMany({ where: fromSheet, orderBy: { sortOrder: "asc" } });
    check("re-sync replaces lines (no duplicates)", lines2.length === 6 && Number(lines2[0].plannedAmount) === 1500);
    const spent2 = (await db.financeRecord.findMany({ where: { ...fromSheet, type: "EXPENSE" } })).reduce((a, x) => a + Number(x.amount), 0);
    check("re-sync picks up the new cost", spent2 === 1785 + 280, String(spent2));
    s = await db.eventSettings.findUniqueOrThrow({ where: { eventId: event.id } });
    check("approval withdrawn in the sheet → not approved here", s.financeStatus === "OPEN");

    // --- A broken sheet keeps the last good data
    r = await syncBudgetSheet(event.id, { overview: [["Hello"]], detailed: [["World"]] });
    s = await db.eventSettings.findUniqueOrThrow({ where: { eventId: event.id } });
    check("a sheet that isn't the template is refused", !r.ok && (s.budgetSheetSyncError ?? "").includes("template"));
    check("the last good numbers stay", (await db.eventBudgetLine.count({ where: fromSheet })) === 6);

    // --- Sync button permissions
    check("a plain member can't press Sync now", !(await syncBudgetSheetAs(memberOnly.id, event.id)).ok);
  } finally {
    // Put the test event back exactly as it was.
    await db.$transaction([
      db.eventBudgetLine.deleteMany({ where: fromSheet }),
      db.financeRecord.deleteMany({ where: fromSheet }),
      db.eventSettings.update({
        where: { eventId: event.id },
        data: {
          budgetSheetId: before.budgetSheetId,
          budgetSheetConnectedBy: before.budgetSheetConnectedBy,
          budgetSheetSyncedAt: before.budgetSheetSyncedAt,
          budgetSheetSyncError: before.budgetSheetSyncError,
          budgetSheetData: before.budgetSheetData,
          financeStatus: before.financeStatus,
        },
      }),
    ]);
  }

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
