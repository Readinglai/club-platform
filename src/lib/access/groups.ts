/** Slugs of the built-in groups (created by scripts/setup-groups.ts). */
export const GROUP_SLUGS = {
  executive: "executive",
  events: "events",
  marketing: "marketing",
  operations: "operations",
  social: "social",
  sponsorship: "operations-sponsorship",
  finance: "operations-finance",
  it: "operations-it",
  /** People the Operations VP delegates to edit the public Members page and Achievements. */
  website: "operations-website",
} as const;

/** Slug for an event's own team, created under Events with the event. */
export function eventGroupSlug(eventId: string) {
  return `event-${eventId}`;
}

/**
 * Switched off for now; the code and data stay so they can be turned back on.
 * While off, positions held in these groups grant nothing and the groups are
 * hidden from Departments & groups:
 * - every subgroup under a department (the Operations groups and event teams);
 * - the departments listed in SWITCHED_OFF_DEPARTMENTS.
 * Each event still keeps its team group behind the scenes: it anchors the
 * event's permissions under Events.
 */
export const SUBGROUPS_ENABLED = false;
export const SWITCHED_OFF_DEPARTMENTS: readonly string[] = [GROUP_SLUGS.social];

export function isSwitchedOff(group: { slug: string; parentId: string | null }) {
  return group.parentId ? !SUBGROUPS_ENABLED : SWITCHED_OFF_DEPARTMENTS.includes(group.slug);
}
