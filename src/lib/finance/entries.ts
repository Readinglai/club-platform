/**
 * Adding and removing an event's budget lines and actual costs/income.
 * Only the event's team (or the Events VP / President) may, and only while
 * the event's finance report is OPEN or RETURNED.
 */

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./categories";
import { assertEditable } from "./reports";

type Outcome = { ok: true } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });

const money = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

export async function addBudgetLine(actorId: string, eventId: string, raw: Record<string, unknown>): Promise<Outcome> {
  const allowed = await assertEditable(actorId, eventId);
  if (!allowed.ok) return allowed;

  const category = String(raw.category ?? "");
  const item = String(raw.item ?? "").trim();
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return fail(400, "Pick a category from the list.");
  if (!item) return fail(400, "Describe the item.");

  const quantity = money(raw.quantity);
  const unitCost = money(raw.unitCost);
  const planned = quantity !== null && unitCost !== null ? Math.round(quantity * unitCost * 100) / 100 : money(raw.plannedAmount);
  if (planned === null || planned < 0) return fail(400, "Enter the planned amount (or quantity and unit cost).");

  const last = await db.eventBudgetLine.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await db.eventBudgetLine.create({
    data: {
      eventId,
      category,
      item,
      quantity,
      unitCost,
      plannedAmount: planned,
      note: typeof raw.note === "string" && raw.note.trim() ? raw.note.trim() : null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  return { ok: true };
}

export async function removeBudgetLine(actorId: string, eventId: string, lineId: string): Promise<Outcome> {
  const allowed = await assertEditable(actorId, eventId);
  if (!allowed.ok) return allowed;
  const { count } = await db.eventBudgetLine.deleteMany({ where: { id: lineId, eventId } });
  return count ? { ok: true } : fail(404, "Budget line not found.");
}

export async function addEventRecord(actorId: string, eventId: string, raw: Record<string, unknown>): Promise<Outcome> {
  const allowed = await assertEditable(actorId, eventId);
  if (!allowed.ok) return allowed;

  const type = raw.type === "INCOME" ? "INCOME" : raw.type === "EXPENSE" ? "EXPENSE" : null;
  if (!type) return fail(400, "Choose cost or income.");
  const category = String(raw.category ?? "");
  const categories: readonly string[] = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  if (!categories.includes(category)) return fail(400, "Pick a category from the list.");

  const amount = money(raw.amount);
  if (amount === null || amount <= 0) return fail(400, "Enter an amount above zero.");
  const description = String(raw.description ?? "").trim();
  if (!description) return fail(400, "Describe what it was for.");
  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? new Date(`${raw.date}T17:00:00Z`) : null;
  if (!date) return fail(400, "Enter the date.");

  const receiptUrl = typeof raw.receiptUrl === "string" && raw.receiptUrl.trim() ? raw.receiptUrl.trim() : null;
  if (receiptUrl && !/^https?:\/\//i.test(receiptUrl)) return fail(400, "The receipt link must start with http(s)://");

  await db.financeRecord.create({
    data: {
      type,
      category,
      description,
      amount: new Prisma.Decimal(amount),
      date,
      eventId,
      receiptUrl,
      createdById: actorId,
    },
  });
  return { ok: true };
}

export async function removeEventRecord(actorId: string, eventId: string, recordId: string): Promise<Outcome> {
  const allowed = await assertEditable(actorId, eventId);
  if (!allowed.ok) return allowed;
  const { count } = await db.financeRecord.deleteMany({ where: { id: recordId, eventId } });
  return count ? { ok: true } : fail(404, "Entry not found.");
}
