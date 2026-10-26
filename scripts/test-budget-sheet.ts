/**
 * Checks reading the club's budget sheet template (src/lib/finance/budget-sheet.ts)
 * against the real template layout (scripts/fixtures/budget-template.json),
 * blank and filled with sample numbers, including an inserted extra row.
 * No database or Google access needed.
 *
 *   npx tsx scripts/test-budget-sheet.ts
 */
import { extractSheetId, parseBudgetSheet, toNumber } from "../src/lib/finance/budget-sheet";
import { copy, filledBudget, template } from "./fixtures/filled-budget";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}

// --- Blank template: nothing to read, nothing breaks
const blank = parseBudgetSheet(template.overview, template.detailed);
check("blank template parses without warnings", blank.warnings.length === 0, blank.warnings.join(" | "));
check("blank: six allocation categories found", blank.allocation.length === 6, blank.allocation.map((a) => a.label).join(", "));
check("blank: no lines", blank.planned.expense.lines.length === 0 && blank.actual.revenue.lines.length === 0);

const { overview: o, detailed: d } = filledBudget();
const filled = parseBudgetSheet(o, d);
check("filled: no warnings", filled.warnings.length === 0, filled.warnings.join(" | "));
check("event name and lead", filled.event.name === "[TEST] Lunar New Year Night 2027" && filled.event.lead === "Jane Chen");
check("budget cap", filled.cap === 3000);
check("allocation amounts by category", filled.allocation.map((a) => a.amount).join(",") === "1200,600,300,250,400,250");
check("allocation note kept", filled.allocation[0].note === "Hart House deposit");
check("approval amounts don't leak into allocation", !filled.allocation.some((a) => a.label === "Approval Status"));
check("approval block ignored", !("approval" in filled));
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

// --- A sheet that isn't the template
const other = parseBudgetSheet([["Hello"]], [["World"]]);
check("not the template: warnings explain what's missing", other.warnings.length >= 4, `${other.warnings.length} warnings`);

console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
process.exitCode = failed ? 1 : 0;
