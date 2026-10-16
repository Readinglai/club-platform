/**
 * Who may do what, as data.
 *
 * A rule grants `permission` to anyone holding at least `minPosition` in a
 * group matching `heldIn`. The grant covers that group and every group
 * below it (a VP of Events can manage every event team under Events), or
 * every group in the club when `global` is set (the President).
 *
 * `heldIn` is a group slug, "<slug>/*" for any direct subgroup of it
 * (e.g. "events/*" = every event team), or "*" for any group at all.
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
  /** Add or edit club-wide income and costs (not tied to an event). */
  "finance.edit",
  /** Edit budgets (club-wide, or an event's budget and costs when scoped to its team). */
  "budget.edit",
  /** Submit an event's finance report for review. */
  "expense.submit",
  /** Review (approve or return) an event's finance report. */
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
  /** Tasks, task groups, discussions and votes (staff only). */
  "tasks.use",
  /** Upload images beyond one's own profile photo. */
  "uploads.create",
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
  PRESIDENT: 3,
  VP: 2,
  STAFF: 1,
};

const RULES: Rule[] = [
  // President: everything, everywhere.
  { permission: "*", heldIn: G.executive, minPosition: "PRESIDENT", global: true },

  // Anyone holding a position in any group is staff.
  { permission: "tasks.use", heldIn: "*", minPosition: "STAFF" },
  { permission: "uploads.create", heldIn: "*", minPosition: "STAFF" },

  // Every VP assigns people within their own department.
  ...[G.events, G.marketing, G.operations, G.social].flatMap((dept) => [
    { permission: "groups.manage" as const, heldIn: dept, minPosition: "VP" as const },
  ]),

  // Events: the VP creates and runs events and reviews each event's finances.
  { permission: "events.create", heldIn: G.events, minPosition: "VP" },
  { permission: "events.manage", heldIn: G.events, minPosition: "VP" },
  { permission: "budget.edit", heldIn: G.events, minPosition: "VP" },
  { permission: "expense.approve", heldIn: G.events, minPosition: "VP" },
  { permission: "events.checkin", heldIn: G.events, minPosition: "STAFF" },

  // Event teams run their own event's budget and costs, and submit the
  // finance report once; they also work the door.
  { permission: "budget.edit", heldIn: `${G.events}/*`, minPosition: "STAFF" },
  { permission: "expense.submit", heldIn: `${G.events}/*`, minPosition: "STAFF" },
  { permission: "events.checkin", heldIn: `${G.events}/*`, minPosition: "STAFF" },

  // Operations: the VP sees all members and the finances and edits budgets;
  // the Finance subgroup sees the finances.
  { permission: "members.view", heldIn: G.operations, minPosition: "VP", global: true },
  { permission: "members.manage", heldIn: G.operations, minPosition: "VP", global: true },
  { permission: "budget.edit", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.edit", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.finance, minPosition: "STAFF" },
  { permission: "finance.edit", heldIn: G.finance, minPosition: "STAFF" },

  // Marketing and Social: department management only for now; content
  // permissions (website, announcements) come later.
];

/** Async so the rules can later come from the database without changing callers. */
export async function getRules(): Promise<Rule[]> {
  return RULES;
}
