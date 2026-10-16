/**
 * Standard finance categories, shared by every event and year so spending can
 * be compared over time (e.g. Venue at Halloween 2025 vs 2026). Each event uses
 * only the ones it needs; the item text holds the detail. Edited here for now.
 */

export const EXPENSE_CATEGORIES = [
  "Venue",
  "Transportation",
  "Lodging",
  "Food & Drinks",
  "Decorations",
  "Entertainment",
  "Activities & Tickets",
  "Prizes & Gifts",
  "Marketing",
  "Supplies",
  "Fees & Insurance",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Ticket sales",
  "Trip fees",
  "Sponsorship",
  "Membership fees",
  "Opening balance",
  "Other income",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

/** Anything not on the list (e.g. older free-text entries) is charted as "Other". */
export function chartCategory(category: string, type: "INCOME" | "EXPENSE"): string {
  const list: readonly string[] = type === "EXPENSE" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  return list.includes(category) ? category : type === "EXPENSE" ? "Other" : "Other income";
}
