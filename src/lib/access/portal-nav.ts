/**
 * Which portal sections a person sees, from their permissions and positions.
 * Used by the portal menu and the portal home, so they always agree.
 */

import { db } from "@/lib/db";
import { can, getAccess } from "./can";

export type PortalSections = {
  events: boolean;
  team: boolean;
  finance: boolean;
  /** Any group position at all (staff). */
  staff: boolean;
  members: boolean;
  announcements: boolean;
  website: boolean;
  reports: boolean;
};

export async function getPortalSections(userId: string): Promise<PortalSections> {
  const access = await getAccess(userId);
  const positions = await db.groupMember.findMany({
    where: { userId, group: { archived: false } },
    select: { position: true },
  });

  return {
    events: can(access, "events.create") || can(access, "events.manage") || can(access, "events.checkin"),
    team: can(access, "groups.manage"),
    finance: can(access, "finance.view") || can(access, "budget.edit"),
    staff: positions.length > 0,
    members: can(access, "members.view"),
    announcements: can(access, "announcements.manage"),
    website: can(access, "content.manage") || can(access, "showcase.manage") || can(access, "memories.manage"),
    reports: can(access, "reports.view"),
  };
}
