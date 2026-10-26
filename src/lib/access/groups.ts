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
