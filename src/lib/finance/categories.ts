/**
 * Standard finance categories, shared by every event and year so spending can
 * be compared over time (e.g. Venue at Halloween 2025 vs 2026). Each event uses
 * only the ones it needs; the item text holds the detail. Edited here for now.
 */

export const EXPENSE_CATEGORIES = [
  "Venue",
  // The budget sheet template's categories (Financial Overview → allocation).
  "Alcohol & Beverages",
  "Game Incentives",
  "Decor",
  "Consumables",
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

/** A budget sheet allocation label → a category here (the template spells some differently). */
export function sheetCategory(label: string): ExpenseCategory {
  const key = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (/^alc?h?oh?ol/.test(key) || key.includes("beverage")) return "Alcohol & Beverages";
  if (key.startsWith("game")) return "Game Incentives";
  if (key.startsWith("decor")) return "Decor";
  if (key.startsWith("consumable")) return "Consumables";
  if (key.startsWith("venue")) return "Venue";
  const exact = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === key);
  return exact ?? "Other";
}
