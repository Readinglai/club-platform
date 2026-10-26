/**
 * Connecting an event to its Google Sheet budget and syncing it.
 *
 * The sheet is the only place budgets are written and approved; the website
 * reads it. Each sync replaces this event's sheet-sourced rows:
 *   - allocation by category → EventBudgetLine (the event's budget)
 *   - actual revenue / expense lines → FinanceRecord (feeds the club overview)
 *   - everything else read (cap, planned lines, summary row, approval) →
 *     EventSettings.budgetSheetData as JSON
 * and the sheet's "Approval Status" sets EventSettings.financeStatus.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { extractSheetId, parseBudgetSheet, type Grid, type SheetData } from "./budget-sheet";
import { sheetCategory } from "./categories";
import { readBudgetGrids, SheetAccessError } from "./google-sheets";
import { eventFinanceAccess } from "./reports";

type Outcome = { ok: true } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });

/** Rows written by a sync carry this prefix in importBatchId. */
export const SHEET_BATCH_PREFIX = "sheet:";

/** Typed-in rows (e.g. the [DEMO] events) would be counted twice next to a sheet. */
async function hasTypedInNumbers(eventId: string) {
  const notFromSheet = { OR: [{ importBatchId: null }, { NOT: { importBatchId: { startsWith: SHEET_BATCH_PREFIX } } }] };
  const [lines, records] = await Promise.all([
    db.eventBudgetLine.count({ where: { eventId, ...notFromSheet } }),
    db.financeRecord.count({ where: { eventId, ...notFromSheet } }),
  ]);
  return lines + records > 0;
}

export async function connectBudgetSheet(actorId: string, eventId: string, link: unknown): Promise<Outcome> {
  if (!(await eventFinanceAccess(actorId, eventId)).connect) return fail(403, "Only the event's team or its VP can connect a budget sheet.");
  const sheetId = typeof link === "string" ? extractSheetId(link) : null;
  if (!sheetId) return fail(400, "Paste the link of the event's Google Sheet (it contains /spreadsheets/d/…).");
  if (await hasTypedInNumbers(eventId)) {
    return fail(409, "This event already has budget numbers typed in on the website, so a sheet would count them twice.");
  }

  await db.eventSettings.upsert({
    where: { eventId },
    create: { eventId, budgetSheetId: sheetId, budgetSheetConnectedBy: actorId },
    update: { budgetSheetId: sheetId, budgetSheetConnectedBy: actorId, budgetSheetSyncError: null },
  });
  return syncBudgetSheet(eventId);
}

export async function syncBudgetSheetAs(actorId: string, eventId: string): Promise<Outcome> {
  if (!(await eventFinanceAccess(actorId, eventId)).connect) return fail(403, "Only the event's team or its VP can sync its budget sheet.");
  return syncBudgetSheet(eventId);
}

/**
 * Reads the connected sheet and replaces the event's sheet-sourced numbers.
 * `grids` lets tests supply the cells without Google.
 */
export async function syncBudgetSheet(eventId: string, grids?: { overview: Grid; detailed: Grid; title?: string }): Promise<Outcome> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { startAt: true, settings: { select: { budgetSheetId: true, budgetSheetConnectedBy: true, currency: true } } },
  });
  const settings = event?.settings;
  if (!event || !settings?.budgetSheetId) return fail(404, "No budget sheet is connected to this event.");
  if (!settings.budgetSheetConnectedBy) return fail(409, "Connect the sheet again so the sync knows who added it.");

  let parsed: SheetData;
  try {
    const cells = grids ?? (await readBudgetGrids(settings.budgetSheetId));
    parsed = { ...parseBudgetSheet(cells.overview, cells.detailed), title: cells.title ?? null };
  } catch (error) {
    const message = error instanceof SheetAccessError ? error.message : "Couldn't read the sheet. Try again in a moment.";
    if (!(error instanceof SheetAccessError)) console.error(`Budget sheet sync failed for event ${eventId}:`, error);
    await db.eventSettings.update({ where: { eventId }, data: { budgetSheetSyncError: message } });
    return fail(502, message);
  }

  const found = parsed.allocation.length + parsed.planned.expense.lines.length + parsed.actual.expense.lines.length;
  if (parsed.warnings.length >= 3 && found === 0) {
    const message = "This sheet doesn't look like the club budget template, so nothing was synced.";
    await db.eventSettings.update({ where: { eventId }, data: { budgetSheetSyncError: message } });
    return fail(422, message);
  }

  const batch = `${SHEET_BATCH_PREFIX}${crypto.randomUUID()}`;
  const fromSheet = { eventId, importBatchId: { startsWith: SHEET_BATCH_PREFIX } };
  const money = (n: number) => new Prisma.Decimal(Math.round(n * 100) / 100);
  const describe = (item: string, note: string | null) => (note ? `${item} (${note})` : item);
  const createdById = settings.budgetSheetConnectedBy;

  await db.$transaction([
    db.eventBudgetLine.deleteMany({ where: fromSheet }),
    db.financeRecord.deleteMany({ where: fromSheet }),
    db.eventBudgetLine.createMany({
      data: parsed.allocation
        .filter((a) => a.amount !== 0)
        .map((a, i) => ({
          eventId,
          category: sheetCategory(a.label),
          item: a.label,
          plannedAmount: money(a.amount),
          note: a.note,
          sortOrder: i,
          importBatchId: batch,
        })),
    }),
    db.financeRecord.createMany({
      data: [
        ...parsed.actual.revenue.lines.map((l) => ({ type: "INCOME" as const, category: "Other income", line: l })),
        ...parsed.actual.expense.lines.map((l) => ({ type: "EXPENSE" as const, category: "Other", line: l })),
      ]
        .filter((r) => r.line.total !== 0)
        .map((r) => ({
          type: r.type,
          amount: money(r.line.total),
          currency: settings.currency,
          category: r.category,
          description: describe(r.line.item, r.line.note),
          date: event.startAt,
          createdById,
          eventId,
          importBatchId: batch,
        })),
    }),
    db.eventSettings.update({
      where: { eventId },
      data: {
        budgetSheetData: JSON.stringify(parsed),
        budgetSheetSyncedAt: new Date(),
        budgetSheetSyncError: null,
        financeStatus: parsed.approval.state,
      },
    }),
  ]);
  return { ok: true };
}

/** The daily sync: events with a sheet from 60 days ago to a year ahead. */
export async function syncActiveBudgetSheets() {
  const now = Date.now();
  const events = await db.eventSettings.findMany({
    where: {
      budgetSheetId: { not: null },
      event: { startAt: { gte: new Date(now - 60 * 86_400_000), lte: new Date(now + 365 * 86_400_000) } },
    },
    select: { eventId: true },
  });
  let synced = 0;
  const failed: string[] = [];
  for (const { eventId } of events) {
    const result = await syncBudgetSheet(eventId);
    if (result.ok) synced++;
    else failed.push(eventId);
  }
  return { synced, failed };
}
