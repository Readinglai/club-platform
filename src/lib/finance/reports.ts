/**
 * Event finance reports and club-wide finance summaries.
 *
 * Nothing here is stored: budget vs actual, balances and per-year charts are
 * calculated from EventBudgetLine (planned) and FinanceRecord (actual).
 *
 * The website only shows money; budgets are kept in each event's Google
 * Sheet, which is also where they are approved. Report statuses already
 * recorded (e.g. the [DEMO] events) are shown as they are.
 */

import { db } from "@/lib/db";
import type { FinanceReportStatus } from "@/generated/prisma/client";
import { can, getAccess } from "@/lib/access/can";
import { termFor } from "@/lib/membership/term";
import { chartCategory } from "./categories";
import { readSheetData } from "./budget-sheet";

/** The event's team group, which scopes who may work on its finances. */
export async function eventTeamGroupId(eventId: string) {
  const group = await db.group.findUnique({ where: { eventId }, select: { id: true } });
  return group?.id ?? null;
}

/** Whether this person may see one event's finances, and connect or sync its budget sheet. */
export async function eventFinanceAccess(userId: string, eventId: string) {
  const access = await getAccess(userId);
  const groupId = await eventTeamGroupId(eventId);
  const target = groupId ? { groupId } : undefined;
  // Without a team group, only club-wide grants (the President) apply.
  const scoped = (permission: Parameters<typeof can>[1]) =>
    target
      ? can(access, permission, target)
      : access.globalGrants.has("*") || access.globalGrants.has(permission);
  const connect = scoped("budget.edit") || scoped("expense.approve");
  return { view: connect || can(access, "finance.view"), connect };
}

const num = (d: { toNumber(): number } | number | null | undefined) =>
  d === null || d === undefined ? 0 : typeof d === "number" ? d : d.toNumber();

export async function getEventFinance(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      location: true,
      settings: {
        select: {
          financeStatus: true,
          financeSubmittedAt: true,
          financeReviewedAt: true,
          financeReviewNote: true,
          financeSubmittedBy: { select: { name: true } },
          financeReviewedBy: { select: { name: true } },
          budgetSheetId: true,
          budgetSheetSyncedAt: true,
          budgetSheetSyncError: true,
          budgetSheetData: true,
        },
      },
      budgetLines: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      financeRecords: {
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
  if (!event) return null;

  const categories = new Map<string, { planned: number; actual: number }>();
  const bucket = (c: string) => {
    const row = categories.get(c) ?? { planned: 0, actual: 0 };
    categories.set(c, row);
    return row;
  };
  for (const line of event.budgetLines) bucket(chartCategory(line.category, "EXPENSE")).planned += num(line.plannedAmount);

  let income = 0;
  let spent = 0;
  for (const r of event.financeRecords) {
    if (r.type === "EXPENSE") {
      bucket(chartCategory(r.category, "EXPENSE")).actual += num(r.amount);
      spent += num(r.amount);
    } else {
      income += num(r.amount);
    }
  }
  const planned = event.budgetLines.reduce((sum, l) => sum + num(l.plannedAmount), 0);

  return {
    event: { id: event.id, title: event.title, startAt: event.startAt, endAt: event.endAt, location: event.location },
    report: {
      status: event.settings?.financeStatus ?? "OPEN",
      submittedAt: event.settings?.financeSubmittedAt ?? null,
      submittedBy: event.settings?.financeSubmittedBy?.name ?? null,
      reviewedAt: event.settings?.financeReviewedAt ?? null,
      reviewedBy: event.settings?.financeReviewedBy?.name ?? null,
      reviewNote: event.settings?.financeReviewNote ?? null,
    },
    sheet: event.settings?.budgetSheetId
      ? {
          id: event.settings.budgetSheetId,
          url: `https://docs.google.com/spreadsheets/d/${event.settings.budgetSheetId}/edit`,
          syncedAt: event.settings.budgetSheetSyncedAt,
          error: event.settings.budgetSheetSyncError,
          data: readSheetData(event.settings.budgetSheetData),
        }
      : null,
    totals: { planned, spent, income, net: income - spent },
    byCategory: [...categories.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.planned + b.actual - (a.planned + a.actual)),
    budgetLines: event.budgetLines.map((l) => ({
      id: l.id,
      category: l.category,
      item: l.item,
      quantity: l.quantity === null ? null : num(l.quantity),
      unitCost: l.unitCost === null ? null : num(l.unitCost),
      plannedAmount: num(l.plannedAmount),
      note: l.note,
    })),
    records: event.financeRecords.map((r) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      description: r.description,
      amount: num(r.amount),
      date: r.date,
      receiptUrl: r.receiptUrl,
      enteredBy: r.createdBy.name,
    })),
  };
}

/** Club balance and spending history. "Confirmed" = club-wide entries + approved events. */
export async function getClubFinanceSummary() {
  const records = await db.financeRecord.findMany({
    select: {
      type: true,
      amount: true,
      category: true,
      date: true,
      eventId: true,
      event: { select: { id: true, title: true, startAt: true, settings: { select: { financeStatus: true } } } },
    },
    orderBy: { date: "asc" },
  });

  let confirmed = 0;
  let pending = 0;
  const byYear = new Map<number, Map<string, number>>();
  const byEvent = new Map<string, { id: string; title: string; startAt: Date; status: FinanceReportStatus; income: number; spent: number }>();

  for (const r of records) {
    const signed = r.type === "INCOME" ? num(r.amount) : -num(r.amount);
    const status = r.event ? r.event.settings?.financeStatus ?? "OPEN" : null;
    if (status === null || status === "APPROVED") confirmed += signed;
    else pending += signed;

    if (r.type === "EXPENSE") {
      const year = termFor(r.date).startYear;
      const cats = byYear.get(year) ?? new Map<string, number>();
      const c = chartCategory(r.category, "EXPENSE");
      cats.set(c, (cats.get(c) ?? 0) + num(r.amount));
      byYear.set(year, cats);
    }

    if (r.event) {
      const row = byEvent.get(r.event.id) ?? {
        id: r.event.id,
        title: r.event.title,
        startAt: r.event.startAt,
        status: status ?? "OPEN",
        income: 0,
        spent: 0,
      };
      if (r.type === "INCOME") row.income += num(r.amount);
      else row.spent += num(r.amount);
      byEvent.set(r.event.id, row);
    }
  }

  return {
    balance: { confirmed, includingPending: confirmed + pending, pending },
    spendingByYear: [...byYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([startYear, cats]) => ({
        schoolYear: `${startYear}–${String(startYear + 1).slice(2)}`,
        categories: Object.fromEntries(cats),
      })),
    events: [...byEvent.values()].sort((a, b) => b.startAt.getTime() - a.startAt.getTime()),
  };
}
