/**
 * The blank budget template (budget-template.json) and a copy filled the way a
 * team would, shared by scripts/test-budget-sheet.ts and scripts/test-sheet-sync.ts.
 */
import { readFileSync } from "fs";
import { join } from "path";
import type { Grid } from "../../src/lib/finance/budget-sheet";

export const template = JSON.parse(readFileSync(join(__dirname, "budget-template.json"), "utf8")) as { overview: Grid; detailed: Grid };
export const copy = (g: Grid): Grid => g.map((row) => [...(row ?? [])]);
export const set = (g: Grid, r: number, c: number, v: string | number | boolean) => {
  while (g.length <= r) g.push([]);
  const row = g[r] ?? (g[r] = []);
  while (row.length <= c) row.push(null);
  row[c] = v;
};

/** Cap 3000, six category amounts, two approval lines + "Approved", planned and actual lines. */
export function filledBudget(): { overview: Grid; detailed: Grid } {
  const o = copy(template.overview);
  const d = copy(template.detailed);
  // Cells at their template positions (0-based rows/cols).
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

  return { overview: o, detailed: d };
}
