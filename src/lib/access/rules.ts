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
  /** Create new events. */
  "events.create",
  /** Edit an event, its tickets and settings. */
  "events.manage",
  /** Delete an event that has no tickets, orders or money. */
  "events.delete",
  /** See door check-in and the live dashboard. */
  "events.checkin",
  /** View member and membership records. */
  "members.view",
  /** Add, edit or grant memberships. */
  "members.manage",
  /** Write, publish and delete announcements. */
  "announcements.manage",
  /** Edit the public website: sponsors, alumni, settings, text. */
  "content.manage",
  /** Edit the public Members page (who shows, order, titles, bios) and Achievements. */
  "showcase.manage",
  /** Add an event's past memories (photos and a recap) to its public page. */
  "memories.manage",
  /** See club-wide totals: event attendance and memberships (no personal details). */
  "reports.view",
  /** Assign people to groups and positions. */
  "groups.manage",
  /** Have a public profile (bio, links): anyone holding a position. */
  "profile.public",
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
  { permission: "profile.public", heldIn: "*", minPosition: "STAFF" },
  { permission: "uploads.create", heldIn: "*", minPosition: "STAFF" },

  // Every VP assigns people within their own department, and any VP may
  // post announcements, edit the website and see the club reports.
  ...[G.events, G.marketing, G.operations, G.social].flatMap((dept) => [
    { permission: "groups.manage" as const, heldIn: dept, minPosition: "VP" as const },
    { permission: "announcements.manage" as const, heldIn: dept, minPosition: "VP" as const },
    { permission: "content.manage" as const, heldIn: dept, minPosition: "VP" as const },
    { permission: "reports.view" as const, heldIn: dept, minPosition: "VP" as const },
  ]),

  // Events: the VP creates, runs and deletes events and sees each event's finances.
  { permission: "events.create", heldIn: G.events, minPosition: "VP" },
  { permission: "events.manage", heldIn: G.events, minPosition: "VP" },
  { permission: "budget.edit", heldIn: G.events, minPosition: "VP" },
  { permission: "events.delete", heldIn: G.events, minPosition: "VP" },
  { permission: "events.checkin", heldIn: G.events, minPosition: "STAFF" },

  // Event teams connect their own event's budget sheet and work the door.
  { permission: "budget.edit", heldIn: `${G.events}/*`, minPosition: "STAFF" },
  { permission: "events.checkin", heldIn: `${G.events}/*`, minPosition: "STAFF" },

  // Operations: the VP sees all members and the finances and edits budgets;
  // the Finance subgroup sees the finances.
  { permission: "members.view", heldIn: G.operations, minPosition: "VP", global: true },
  { permission: "members.manage", heldIn: G.operations, minPosition: "VP", global: true },
  { permission: "budget.edit", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.edit", heldIn: G.operations, minPosition: "VP" },
  { permission: "finance.view", heldIn: G.finance, minPosition: "STAFF" },

  // The public Members page and Achievements: the Operations VP, and anyone
  // they add to the Website group under Operations.
  { permission: "showcase.manage", heldIn: G.operations, minPosition: "VP" },
  { permission: "showcase.manage", heldIn: G.website, minPosition: "STAFF" },

  // Event memories on the public site: the Events VP and the Website group.
  { permission: "memories.manage", heldIn: G.events, minPosition: "VP" },
  { permission: "memories.manage", heldIn: G.website, minPosition: "STAFF" },
  { permission: "finance.edit", heldIn: G.finance, minPosition: "STAFF" },

];

/** Async so the rules can later come from the database without changing callers. */
export async function getRules(): Promise<Rule[]> {
  return RULES;
}
