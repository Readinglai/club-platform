/**
 * Who the public website shows as the club's team: people holding a position
 * (President, VP, Staff) in a department or one of its groups. Event teams
 * are temporary and left out, as are placeholder / test accounts (".invalid"
 * emails). Paying members are never listed publicly.
 */

import { db } from "@/lib/db";
import type { GroupPosition } from "@/generated/prisma/client";
import { GROUP_SLUGS as G } from "@/lib/access/groups";
import { POSITION_RANK } from "@/lib/access/rules";

/** Departments in the order the website lists them. */
export const DEPARTMENT_ORDER = [G.executive, G.events, G.marketing, G.operations, G.social] as const;

export type TeamPerson = {
  id: string;
  name: string;
  image: string | null;
  major: string | null;
  position: GroupPosition;
  /** The group inside the department, e.g. "Finance"; null for the department itself. */
  group: string | null;
};

const shown = {
  group: { archived: false, eventId: null },
  user: { NOT: { email: { endsWith: ".invalid" } } },
};

async function departmentOf() {
  const groups = await db.group.findMany({ where: { archived: false, eventId: null }, select: { id: true, slug: true, name: true, parentId: true } });
  const byId = new Map(groups.map((g) => [g.id, g]));
  // Walk up to the top-level group (the department).
  return (groupId: string) => {
    let g = byId.get(groupId);
    while (g?.parentId && byId.has(g.parentId)) g = byId.get(g.parentId);
    return g ?? null;
  };
}

/** The team by department, highest position first. Departments with nobody are left out. */
export async function getPublicTeam() {
  const [rows, topOf] = await Promise.all([
    db.groupMember.findMany({
      where: shown,
      select: {
        position: true,
        group: { select: { id: true, name: true, parentId: true } },
        user: { select: { id: true, name: true, image: true, major: true } },
      },
    }),
    departmentOf(),
  ]);

  const departments = new Map<string, Map<string, TeamPerson>>();
  for (const r of rows) {
    const dept = topOf(r.group.id);
    if (!dept) continue;
    const people = departments.get(dept.slug) ?? new Map<string, TeamPerson>();
    const existing = people.get(r.user.id);
    // Someone in the department and one of its groups shows once, at their highest position.
    if (!existing || POSITION_RANK[r.position] > POSITION_RANK[existing.position]) {
      people.set(r.user.id, {
        id: r.user.id,
        name: r.user.name,
        image: r.user.image,
        major: r.user.major,
        position: r.position,
        group: r.group.parentId ? r.group.name : null,
      });
    }
    departments.set(dept.slug, people);
  }

  return DEPARTMENT_ORDER.filter((slug) => departments.has(slug)).map((slug) => ({
    slug,
    people: [...departments.get(slug)!.values()].sort(
      (a, b) => POSITION_RANK[b.position] - POSITION_RANK[a.position] || a.name.localeCompare(b.name)
    ),
  }));
}

/** One team member's public profile, or null when they're not on the public team. */
export async function getPublicTeamMember(userId: string) {
  const [user, topOf] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, ...shown.user },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        major: true,
        rocsautYear: true,
        instagram: true,
        linkedin: true,
        groupMemberships: { where: { group: shown.group }, select: { position: true, group: { select: { id: true, name: true, parentId: true } } } },
      },
    }),
    departmentOf(),
  ]);
  if (!user || user.groupMemberships.length === 0) return null;

  const positions = user.groupMemberships
    .map((m) => ({ position: m.position, department: topOf(m.group.id)?.slug ?? null, group: m.group.parentId ? m.group.name : null }))
    .sort((a, b) => POSITION_RANK[b.position] - POSITION_RANK[a.position]);
  return {
    id: user.id,
    name: user.name,
    image: user.image,
    bio: user.bio,
    major: user.major,
    rocsautYear: user.rocsautYear,
    instagram: user.instagram,
    linkedin: user.linkedin,
    positions,
  };
}
