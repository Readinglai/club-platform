/**
 * Who the public website shows as the club's team: people holding a position
 * (President, VP, Staff) in a department or one of its groups. Event teams
 * are temporary and left out, as are placeholder / test accounts (".invalid"
 * emails). Paying members are never listed publicly.
 *
 * The Operations VP and their Website group (showcase.manage) can hide people,
 * set their order and give them a public title and bio. That's stored as one
 * SiteConfig entry ("team_page"), keyed by user id.
 */

import { db } from "@/lib/db";
import { can, getAccess } from "@/lib/access/can";
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
  /** Set on the Members page admin screen. */
  title: string | null;
  bio: string | null;
  hidden: boolean;
  order: number | null;
};

export const TEAM_PAGE_KEY = "team_page";
/** Per person; `orders` is their position within each department they appear in. */
export type TeamEntry = { hidden?: boolean; orders?: Record<string, number>; title?: string; bio?: string };
type TeamSettings = Record<string, TeamEntry>;

async function readTeamSettings(): Promise<TeamSettings> {
  const row = await db.siteConfig.findUnique({ where: { key: TEAM_PAGE_KEY } });
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value) as TeamSettings;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

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

/**
 * The team by department: their chosen order first, then highest position.
 * Departments with nobody are left out; hidden people too unless asked for.
 */
export async function getPublicTeam(options: { includeHidden?: boolean } = {}) {
  const [rows, topOf, settings] = await Promise.all([
    db.groupMember.findMany({
      where: shown,
      select: {
        position: true,
        group: { select: { id: true, name: true, parentId: true } },
        user: { select: { id: true, name: true, image: true, major: true } },
      },
    }),
    departmentOf(),
    readTeamSettings(),
  ]);

  const departments = new Map<string, Map<string, TeamPerson>>();
  for (const r of rows) {
    const dept = topOf(r.group.id);
    if (!dept) continue;
    const people = departments.get(dept.slug) ?? new Map<string, TeamPerson>();
    const existing = people.get(r.user.id);
    // Someone in the department and one of its groups shows once, at their highest position.
    if (!existing || POSITION_RANK[r.position] > POSITION_RANK[existing.position]) {
      const entry = settings[r.user.id] ?? {};
      people.set(r.user.id, {
        id: r.user.id,
        name: r.user.name,
        image: r.user.image,
        major: r.user.major,
        position: r.position,
        group: r.group.parentId ? r.group.name : null,
        title: entry.title?.trim() || null,
        bio: entry.bio?.trim() || null,
        hidden: entry.hidden === true,
        order: typeof entry.orders?.[dept.slug] === "number" ? entry.orders[dept.slug] : null,
      });
    }
    departments.set(dept.slug, people);
  }

  const byOrder = (a: TeamPerson, b: TeamPerson) =>
    (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
    POSITION_RANK[b.position] - POSITION_RANK[a.position] ||
    a.name.localeCompare(b.name);
  return DEPARTMENT_ORDER.map((slug) => ({
    slug,
    people: [...(departments.get(slug)?.values() ?? [])].filter((p) => options.includeHidden || !p.hidden).sort(byOrder),
  })).filter((d) => d.people.length > 0);
}

/** One team member's public profile, or null when they're not on the public team. */
export async function getPublicTeamMember(userId: string) {
  const [user, topOf, settings] = await Promise.all([
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
    readTeamSettings(),
  ]);
  if (!user || user.groupMemberships.length === 0) return null;
  const entry = settings[user.id] ?? {};
  if (entry.hidden) return null;

  const positions = user.groupMemberships
    .map((m) => ({ position: m.position, department: topOf(m.group.id)?.slug ?? null, group: m.group.parentId ? m.group.name : null }))
    .sort((a, b) => POSITION_RANK[b.position] - POSITION_RANK[a.position]);
  return {
    id: user.id,
    name: user.name,
    image: user.image,
    // A bio written on the Members page admin screen wins over the person's own.
    bio: entry.bio?.trim() || user.bio,
    title: entry.title?.trim() || null,
    major: user.major,
    rocsautYear: user.rocsautYear,
    instagram: user.instagram,
    linkedin: user.linkedin,
    positions,
  };
}

export async function canEditTeamPage(userId: string) {
  return can(await getAccess(userId), "showcase.manage");
}

const LIMITS = { title: 60, bio: 600 };

/**
 * Save the Members page settings: { [userId]: { hidden, orders: { [department]: n }, title, bio } }.
 * Only people currently on the team can be set; anything else is dropped.
 */
export async function saveTeamPage(actorId: string, raw: unknown): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!(await canEditTeamPage(actorId))) return { ok: false, status: 403, message: "Only the Operations VP and the Website group can edit the Members page." };
  if (!raw || typeof raw !== "object") return { ok: false, status: 400, message: "Nothing to save." };

  const team = await getPublicTeam({ includeHidden: true });
  const onTeam = new Set(team.flatMap((d) => d.people.map((p) => p.id)));
  const next: TeamSettings = {};
  for (const [userId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!onTeam.has(userId) || !value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const title = typeof v.title === "string" ? v.title.trim() : "";
    const bio = typeof v.bio === "string" ? v.bio.trim() : "";
    if (title.length > LIMITS.title) return { ok: false, status: 400, message: `Titles can be ${LIMITS.title} characters at most.` };
    if (bio.length > LIMITS.bio) return { ok: false, status: 400, message: `Bios can be ${LIMITS.bio} characters at most.` };
    const entry: TeamEntry = {};
    if (v.hidden === true) entry.hidden = true;
    if (v.orders && typeof v.orders === "object") {
      const orders = Object.fromEntries(
        Object.entries(v.orders as Record<string, unknown>).filter(
          ([slug, n]) => (DEPARTMENT_ORDER as readonly string[]).includes(slug) && typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 1000
        )
      ) as Record<string, number>;
      if (Object.keys(orders).length) entry.orders = orders;
    }
    if (title) entry.title = title;
    if (bio) entry.bio = bio;
    if (Object.keys(entry).length) next[userId] = entry;
  }

  await db.siteConfig.upsert({
    where: { key: TEAM_PAGE_KEY },
    create: { key: TEAM_PAGE_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return { ok: true };
}
