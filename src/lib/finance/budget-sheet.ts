/**
 * Reads the club's standard budget sheet ("ROCSAUT Standardized Event Budget")
 * from its two tabs' cells. Sections are found by their labels, not by fixed
 * cell addresses, so teams can insert rows without breaking the sync.
 *
 * Financial Overview: event info, budget cap, allocation by category, the
 *   approval block (Position / Name / Date / Approved? … Approval Status) and
 *   the "Summary for Master Budget" row.
 * Event Budget (Detailed): REVENUE and EXPENSES lines, planned on the left
 *   (columns A–G) and actual on the right (columns I–O).
 *
 * The "Type" column is a placeholder in the template, so it isn't used.
 */

export type Cell = string | number | boolean | null | undefined;
export type Grid = Cell[][];

export type BudgetLine = { item: string; quantity: number | null; unitPrice: number | null; total: number; note: string | null };
export type Section = { lines: BudgetLine[]; total: number };
export type ApprovalLine = { position: string; name: string; date: string; approved: boolean | null };
export type ApprovalState = "APPROVED" | "RETURNED" | "OPEN";

export type ParsedBudget = {
  event: { name: string | null; date: string | null; lead: string | null; preparedBy: string | null; lastUpdated: string | null };
  cap: number | null;
  allocation: Array<{ label: string; amount: number; note: string | null }>;
  approval: { status: string | null; state: ApprovalState; lines: ApprovalLine[] };
  planned: { revenue: Section; expense: Section };
  actual: { revenue: Section; expense: Section };
  summary: Record<string, string | number | null> | null;
  warnings: string[];
};

/** The spreadsheet id from a Google Sheets link (or the bare id). */
export function extractSheetId(input: string): string | null {
  const text = input.trim();
  const fromUrl = text.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : null;
}

const norm = (v: Cell) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const text = (v: Cell) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" ? null : s;
};

/** A number from a cell: numbers as-is; "$1,234.50", "(20)" and "1 200" as text. */
export function toNumber(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s === "-") return null;
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  const digits = s.replace(/[^0-9.]/g, "");
  if (!digits || digits === ".") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

const cell = (g: Grid, r: number, c: number) => g[r]?.[c];
const width = (g: Grid) => Math.max(0, ...g.map((row) => row?.length ?? 0));

function find(g: Grid, label: string, from = { r: 0, c: 0 }): { r: number; c: number } | null {
  const want = norm(label);
  for (let r = from.r; r < g.length; r++) {
    for (let c = r === from.r ? from.c : 0; c < (g[r]?.length ?? 0); c++) {
      if (norm(cell(g, r, c)) === want) return { r, c };
    }
  }
  return null;
}

/** First non-empty value to the right of a label, within `span` columns. */
function rightOf(g: Grid, at: { r: number; c: number }, span = 4): Cell {
  for (let c = at.c + 1; c <= at.c + span; c++) {
    if (text(cell(g, at.r, c)) !== null || typeof cell(g, at.r, c) === "number") return cell(g, at.r, c);
  }
  return null;
}

function approvedFlag(v: Cell): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  const s = norm(v);
  if (!s) return null;
  if (/^(true|yes|y|✓|✔|✅|approved)$/.test(s) || s.includes("✅") || s.includes("✓")) return true;
  if (/^(false|no|n|✗|✘|❌|rejected)$/.test(s) || s.includes("❌")) return false;
  return null;
}

/** The overall state from the sheet's "Approval Status" text. */
export function approvalState(status: string | null): ApprovalState {
  const s = norm(status);
  if (!s) return "OPEN";
  if (/(not|un|pending|waiting|in progress)/.test(s)) return "OPEN";
  if (/(reject|return|declin|denied)/.test(s)) return "RETURNED";
  if (/approv|✅|✓/.test(s)) return "APPROVED";
  return "OPEN";
}

function parseOverview(g: Grid, warnings: string[]) {
  const info = (label: string) => {
    const at = find(g, label);
    return at ? text(rightOf(g, at, 3)) : null;
  };
  const event = {
    name: info("Event Name"),
    date: info("Event Date"),
    lead: info("Event Lead"),
    preparedBy: info("Prepared by"),
    lastUpdated: info("Last Updated"),
  };

  const capAt = find(g, "Budget Cap (Total)");
  const cap = capAt ? toNumber(rightOf(g, capAt, 4)) : null;
  if (!capAt) warnings.push('Couldn\'t find "Budget Cap (Total)" on the Financial Overview tab.');

  // Allocation: the rows under "Budget Allocation by Category", until a blank label.
  const allocation: ParsedBudget["allocation"] = [];
  const allocAt = find(g, "Budget Allocation by Category");
  const approvalHeader = find(g, "Approval");
  const noteAt = allocAt ? find(g, "Note", allocAt) : null;
  if (allocAt) {
    const stopCol = approvalHeader && approvalHeader.r === allocAt.r ? approvalHeader.c : allocAt.c + 4;
    for (let r = allocAt.r + 1; r < g.length; r++) {
      const label = text(cell(g, r, allocAt.c));
      if (!label) break;
      let amount: number | null = null;
      for (let c = allocAt.c + 1; c < stopCol; c++) {
        if (noteAt && noteAt.r === allocAt.r && c === noteAt.c) continue;
        amount = toNumber(cell(g, r, c));
        if (amount !== null) break;
      }
      const note = noteAt && noteAt.r === allocAt.r ? text(cell(g, r, noteAt.c)) : null;
      allocation.push({ label, amount: amount ?? 0, note });
    }
  } else {
    warnings.push('Couldn\'t find "Budget Allocation by Category" on the Financial Overview tab.');
  }

  // Approval: a header row with Position / Name / Date / Approved?, lines below
  // it, and "Approval Status" with its value after them.
  const lines: ApprovalLine[] = [];
  let status: string | null = null;
  const posAt = find(g, "Position");
  if (posAt) {
    const col = (label: string) => {
      for (let c = posAt.c; c < width(g); c++) if (norm(cell(g, posAt.r, c)) === norm(label)) return c;
      return -1;
    };
    const nameCol = col("Name");
    const dateCol = col("Date");
    const approvedCol = col("Approved?");
    const statusAt = find(g, "Approval Status", { r: posAt.r + 1, c: 0 });
    const lastRow = statusAt ? statusAt.r : posAt.r + 6;
    for (let r = posAt.r + 1; r < lastRow; r++) {
      const position = text(cell(g, r, posAt.c)) ?? "";
      const name = nameCol >= 0 ? text(cell(g, r, nameCol)) ?? "" : "";
      if (!position && !name) continue;
      lines.push({
        position,
        name,
        date: dateCol >= 0 ? text(cell(g, r, dateCol)) ?? "" : "",
        approved: approvedCol >= 0 ? approvedFlag(cell(g, r, approvedCol)) : null,
      });
    }
    if (statusAt) status = text(rightOf(g, statusAt, 4));
  } else {
    warnings.push("Couldn't find the approval block (Position / Name / Date / Approved?).");
  }

  // "Summary for Master Budget": a header row, then the first row with values.
  let summary: ParsedBudget["summary"] = null;
  for (let r = 0; r < g.length; r++) {
    const row = (g[r] ?? []).map(norm);
    if (row.includes("event name") && row.includes("budget cap") && row.includes("projected revenue")) {
      const values = g.slice(r + 1).find((next) => (next ?? []).some((v) => text(v) !== null || typeof v === "number"));
      if (values) {
        summary = {};
        (g[r] ?? []).forEach((h, c) => {
          const key = text(h);
          if (key) summary![key] = typeof values[c] === "number" ? (values[c] as number) : text(values[c]);
        });
      }
      break;
    }
  }

  const approvalStatus = status;
  const state = approvalStatus ? approvalState(approvalStatus) : lines.length && lines.every((l) => l.approved === true) ? "APPROVED" : "OPEN";
  return { event, cap, allocation, approval: { status: approvalStatus, state, lines }, summary };
}

/** One REVENUE or EXPENSES block, starting at its header cell. */
function readSection(g: Grid, at: { r: number; c: number }, endCol: number): Section {
  const header = (g[at.r] ?? []).map(norm);
  const colOf = (match: (h: string) => boolean) => {
    for (let c = at.c + 1; c < endCol; c++) if (match(header[c] ?? "")) return c;
    return -1;
  };
  const qtyCol = colOf((h) => h === "#");
  const priceCol = colOf((h) => h === "$");
  const totalCol = colOf((h) => h === "total");
  const noteCol = colOf((h) => h === "notes" || h === "note");

  const lines: BudgetLine[] = [];
  let sheetTotal: number | null = null;
  for (let r = at.r + 1; r < g.length; r++) {
    // The block ends at its "Total …" row (label in the item column or just left of it).
    const label = norm(cell(g, r, at.c)) || norm(cell(g, r, at.c - 1));
    if (label.startsWith("total")) {
      sheetTotal = totalCol >= 0 ? toNumber(cell(g, r, totalCol)) : null;
      break;
    }
    // Another section's header below this one also ends it.
    if (["revenue", "expenses", "net income"].includes(norm(cell(g, r, at.c)))) break;

    const item = text(cell(g, r, at.c));
    const quantity = qtyCol >= 0 ? toNumber(cell(g, r, qtyCol)) : null;
    const unitPrice = priceCol >= 0 ? toNumber(cell(g, r, priceCol)) : null;
    const total = (totalCol >= 0 ? toNumber(cell(g, r, totalCol)) : null) ?? (quantity !== null && unitPrice !== null ? quantity * unitPrice : null);
    if (!item && !total) continue;
    lines.push({ item: item ?? "(no description)", quantity, unitPrice, total: total ?? 0, note: noteCol >= 0 ? text(cell(g, r, noteCol)) : null });
  }
  const sum = lines.reduce((s, l) => s + l.total, 0);
  return { lines, total: sheetTotal ?? sum };
}

function parseDetailed(g: Grid, warnings: string[]) {
  const empty = (): Section => ({ lines: [], total: 0 });
  const result = { planned: { revenue: empty(), expense: empty() }, actual: { revenue: empty(), expense: empty() } };

  for (const [label, key] of [["revenue", "revenue"], ["expenses", "expense"]] as const) {
    // The first row holding the label: left occurrence = planned, right = actual.
    let headerRow = -1;
    for (let r = 0; r < g.length && headerRow < 0; r++) if ((g[r] ?? []).some((v) => norm(v) === label)) headerRow = r;
    if (headerRow < 0) {
      warnings.push(`Couldn't find the ${label.toUpperCase()} section on the Event Budget (Detailed) tab.`);
      continue;
    }
    const cols = (g[headerRow] ?? []).map((v, c) => (norm(v) === label ? c : -1)).filter((c) => c >= 0);
    const end = width(g);
    result.planned[key] = readSection(g, { r: headerRow, c: cols[0] }, cols[1] ?? end);
    if (cols[1] !== undefined) result.actual[key] = readSection(g, { r: headerRow, c: cols[1] }, cols[2] ?? end);
    else warnings.push(`Couldn't find the actual ${label.toUpperCase()} side on the Event Budget (Detailed) tab.`);
  }
  return result;
}

export function parseBudgetSheet(overview: Grid, detailed: Grid): ParsedBudget {
  const warnings: string[] = [];
  const o = parseOverview(overview, warnings);
  const d = parseDetailed(detailed, warnings);
  return { ...o, ...d, warnings };
}

/** What a sync stores in EventSettings.budgetSheetData. */
export type SheetData = ParsedBudget & { title: string | null };

export function readSheetData(json: string | null): SheetData | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as SheetData;
  } catch {
    return null;
  }
}
