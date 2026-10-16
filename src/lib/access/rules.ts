/**
 * Who may do what, as data.
 *
 * A rule grants `permission` to anyone holding at least `minPosition` in a
 * group matching `heldIn`. The grant covers that group and every group
 * below it (a VP of Events can manage every event team under Events), or
 * every group in the club when `global` is set (the President).
 *
 * `heldIn` is a group slug, or "<slug>/*" for any direct subgroup of it
 * (e.g. "events/*" = every event team).
 *
 * These rules live in code until the admin portal can edit them; callers
 * only use can() / getRules(), so moving them into a database table later
 * does not change any page or API.
 */

import type { GroupPosition } from "@/generated/prisma/client";
import { GROUP_SLUGS as G } from "./groups";

export const PERMISSIONS = [
  /** See the club budget, balance and cost history. */
  "finance.view",
  /** Edit budgets (club-wide, or an event's when scoped to its team). */
  "budget.edit",
  /** Submit an actual cost for an event. */
  "expense.submit",
  /** Approve or reject submitted costs. */
  "expense.approve",
  /** Create new events. */
  "events.create",
  /** Edit an event, its tickets and settings. */
  "events.manage",
  /** See door check-in and the live dashboard. */
  "events.checkin",
  /** View member and membership records. */
  "members.view",
  /** Add, edit or grant memberships. */
  "members.manage",
  /** Assign people to groups and positions. */
  "groups.manage",
  /** Decide approval requests (e.g. deleting an event). */
  "approvals.decide",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type Rule = {
  permission: Permission | "*";
  heldIn: string;
  minPosition: GroupPosition;
  /** Applies to every group, not just the one it is held in. */
  global?: boolean;
};

/** Highest first; a position satisfies every position after it. */
export const POSITION_RANK: Record<GroupPosition, number> = {
  PRESIDENT: 4,
  VP: 3,
  LEAD: 2,
  STAFF: 1,
};

const RULES: Rule[] = [
  // President: everything, everywhere.
  { permission: "*", heldIn: G.executive, minPosition: "PRESIDENT", global: true },

  // Every VP runs their own department.
  ...[G.events, G.marketing, G.operations, G.social].flatMap((dept) => [
    { permission: "groups.manage" as const, heldIn: dept, minPosition: "VP" as const },
    { permission: "members.view" as const, heldIn: dept, minPosition: "VP" as const },
  ]),

  // Events: the VP creates and oversees events and verifies their spending.
  { permission: "events.create", heldIn: G.events, minPosition: "VP" },
  { permission: "events.manage", heldIn: G.events, minPosition: "VP" },
  { permission: "budget.edit", heldIn: G.events, minPosition: "VP" },
  { permission: "expense.approve", heldIn: G.events, minPosition: "VP" },
  { permission: "events.checkin", heldIn: G.events, minPosition: "STAFF" },

  // Event teams: the lead manages their event, everyone on it submits costs.
  { permission: "events.manage", heldIn: `${G.events}/*`, minPosition: "LEAD" },
  { permission: "expense.submit", heldIn: `${G.events}/*`, minPosition: "STAFF" },
  { permission: "events.checkin", heldIn: `${G.events}/*`, minPosition: "STAFF" },

  // Operations: the VP edits budgets and sees finances; Finance sees finances.
  { permission: "budget.edit", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.finance, minPosition: "STAFF" },
];

/** Async so the rules can later come from the database without changing callers. */
export async function getRules(): Promise<Rule[]> {
  return RULES;
}
