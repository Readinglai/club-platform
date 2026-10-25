/**
 * Checks reading the club's budget sheet template (src/lib/finance/budget-sheet.ts)
 * against the real template layout (scripts/fixtures/budget-template.json),
 * blank and filled with sample numbers, including an inserted extra row.
 * No database or Google access needed.
 *
 *   npx tsx scripts/test-budget-sheet.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { approvalState, extractSheetId, parseBudgetSheet, toNumber, type Grid } from "../src/lib/finance/budget-sheet";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}

const template = JSON.parse(readFileSync(join(__dirname, "fixtures", "budget-template.json"), "utf8")) as { overview: Grid; detailed: Grid };
const copy = (g: Grid): Grid => g.map((row) => [...(row ?? [])]);
const set = (g: Grid, r: number, c: number, v: string | number | boolean) => {
  while (g.length <= r) g.push([]);
  const row = g[r] ?? (g[r] = []);
  while (row.length <= c) row.push(null);
  row[c] = v;
};

// --- Blank template: nothing to read, nothing breaks
const blank = parseBudgetSheet(template.overview, template.detailed);
check("blank template parses without warnings", blank.warnings.length === 0, blank.warnings.join(" | "));
check("blank: six allocation categories found", blank.allocation.length === 6, blank.allocation.map((a) => a.label).join(", "));
check("blank: no lines", blank.planned.expense.lines.length === 0 && blank.actual.revenue.lines.length === 0);
check("blank: not approved", blank.approval.state === "OPEN" && blank.approval.lines.length === 0);

// --- Filled the way a team would (cells at their template positions; 0-based rows/cols)
const o = copy(template.overview);
const d = copy(template.detailed);
set(o, 3, 2, "[TEST] Lunar New Year Night 2027"); // Event Name → C4
set(o, 5, 2, "Jane Chen"); // Event Lead → C6
set(o, 10, 2, 3000); // Budget Cap (Total) → C11
[1200, 600, 300, 250, 400, 250].forEach((amount, i) => set(o, 12 + i, 2, amount)); // allocation → C13:C18
set(o, 12, 3, "Hart House deposit"); // a note → D13
set(o, 13, 5, "Events VP"); // approval line 1 → F14:I14
set(o, 13, 6, "Mei Lin");
set(o, 13, 7, "2027-01-20");
set(o, 13, 8, true);
set(o, 14, 5, "President"); // approval line 2 → F15:I15
set(o, 14, 6, "John Wu");
set(o, 14, 7, "2027-01-21");
set(o, 14, 8, "✓");
set(o, 15, 6, "Approved"); // Approval Status value → G16
set(o, 28, 0, "[TEST] Lunar New Year Night 2027"); // master summary row → A29:K29
set(o, 28, 1, 3000);
set(o, 28, 2, 2400);
set(o, 28, 10, "✅ Good");

// Planned revenue (B5:G…) and actual revenue (I5:N…)
set(d, 4, 1, "Tickets (regular)"); set(d, 4, 2, 80); set(d, 4, 3, 25); set(d, 4, 5, 2000);
set(d, 5, 1, "Tickets (members)"); set(d, 5, 2, 20); set(d, 5, 3, 18); set(d, 5, 5, 360);
set(d, 4, 8, "Tickets (regular)"); set(d, 4, 9, 76); set(d, 4, 10, 25); set(d, 4, 12, 1900);
set(d, 12, 5, 2360); set(d, 12, 12, 1900); // the sheet's own totals
// Planned expenses (B16:G…) and actual (I16:O…)
set(d, 15, 1, "Venue deposit"); set(d, 15, 2, 1); set(d, 15, 3, 1200); set(d, 15, 5, 1200);
set(d, 16, 1, "Drinks"); set(d, 16, 2, 10); set(d, 16, 3, 55); set(d, 16, 5, "$550.00"); set(d, 16, 6, "Costco");
set(d, 17, 1, "Lucky draw prizes"); set(d, 17, 5, 300);
set(d, 15, 8, "Venue deposit"); set(d, 15, 12, 1200);
set(d, 16, 8, "Drinks"); set(d, 16, 9, 10); set(d, 16, 10, 58.5); // no Total typed: computed 585
set(d, 26, 5, "2,050.00"); set(d, 26, 12, 1785);

const filled = parseBudgetSheet(o, d);
check("filled: no warnings", filled.warnings.length === 0, filled.warnings.join(" | "));
check("event name and lead", filled.event.name === "[TEST] Lunar New Year Night 2027" && filled.event.lead === "Jane Chen");
check("budget cap", filled.cap === 3000);
check("allocation amounts by category", filled.allocation.map((a) => a.amount).join(",") === "1200,600,300,250,400,250");
check("allocation note kept", filled.allocation[0].note === "Hart House deposit");
check("approval amounts don't leak into allocation", !filled.allocation.some((a) => a.label === "Approval Status"));
check("two approval lines read", filled.approval.lines.length === 2, JSON.stringify(filled.approval.lines));
check("approval ticks read (TRUE and ✓)", filled.approval.lines.every((l) => l.approved === true));
check("approval status 'Approved' → APPROVED", filled.approval.status === "Approved" && filled.approval.state === "APPROVED");
check("planned revenue lines and total", filled.planned.revenue.lines.length === 2 && filled.planned.revenue.total === 2360);
check("actual revenue", filled.actual.revenue.lines.length === 1 && filled.actual.revenue.total === 1900);
check("planned expenses incl. '$550.00' text", filled.planned.expense.lines.length === 3 && filled.planned.expense.lines[1].total === 550);
check("planned expense total from '2,050.00'", filled.planned.expense.total === 2050);
check("actual expense total computed from # × $ when Total is blank", filled.actual.expense.lines[1].total === 585);
check("notes kept", filled.planned.expense.lines[1].note === "Costco");
check("master summary row read", filled.summary?.["Budget Cap"] === 3000 && filled.summary?.["Status"] === "✅ Good");

// --- A team inserts an extra expense row above the totals
const d2 = copy(d);
d2.splice(18, 0, [null, "Photo booth", 1, 150, null, 150]);
const shifted = parseBudgetSheet(o, d2);
check("inserted row: still found, 4 planned expenses", shifted.planned.expense.lines.length === 4 && shifted.planned.expense.lines[3].item === "Photo booth");
check("inserted row: totals row still found", shifted.planned.expense.total === 2050);

// --- Helpers
check("sheet id from a share link", extractSheetId("https://docs.google.com/spreadsheets/d/1qOmpNd5xV-RhvwaBBdYXyPFX4CtIE8lbINS9nEKGTuw/edit?gid=1728473132#gid=1728473132") === "1qOmpNd5xV-RhvwaBBdYXyPFX4CtIE8lbINS9nEKGTuw");
check("sheet id: not a sheet link", extractSheetId("https://example.com/hello") === null);
check("numbers: $1,234.50 / (20) / -", toNumber("$1,234.50") === 1234.5 && toNumber("(20)") === -20 && toNumber("-") === null);
check("approval wording", approvalState("Approved ✅") === "APPROVED" && approvalState("Not approved") === "OPEN" && approvalState("Rejected") === "RETURNED" && approvalState(null) === "OPEN");

// --- A sheet that isn't the template
const other = parseBudgetSheet([["Hello"]], [["World"]]);
check("not the template: warnings explain what's missing", other.warnings.length >= 4, `${other.warnings.length} warnings`);

console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
process.exitCode = failed ? 1 : 0;
