/**
 * Managing who is in which group.
 *
 * - President: anything, including appointing VPs and Presidents.
 * - VP: within their own department (groups.manage scope) — add/remove Staff,
 *   create subgroups, archive subgroups. VPs can't touch other VPs or the President.
 * Groups are archived, never deleted.
 */

import { db } from "@/lib/db";
import type { GroupPosition } from "@/generated/prisma/client";
import { can, getAccess, type Access } from "./can";
import { GROUP_SLUGS } from "./groups";

type Outcome<T = undefined> = { ok: true; value?: T } | { ok: false; status: number; message: string };

const fail = (status: number, message: string) => ({ ok: false as const, status, message });

export async function isPresident(userId: string) {
  const count = await db.groupMember.count({
    where: { userId, position: "PRESIDENT", group: { slug: GROUP_SLUGS.executive } },
  });
  return count > 0;
}

/** Groups this person may manage, with their members, as a tree-friendly flat list. */
export async function listManageableGroups(access: Access) {
  const groups = await db.group.findMany({
    where: { archived: false },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      eventId: true,
      members: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, position: true, user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return groups.filter((g) => can(access, "groups.manage", { groupId: g.id }));
}

export async function addToGroup(input: {
  actorId: string;
  groupId: string;
  email: string;
  position: GroupPosition;
}): Promise<Outcome> {
  const access = await getAccess(input.actorId);
  if (!can(access, "groups.manage", { groupId: input.groupId })) return fail(403, "You can't manage this group.");
  if (input.position !== "STAFF" && !(await isPresident(input.actorId))) {
    return fail(403, "Only the President can appoint VPs or the President.");
  }

  const group = await db.group.findUnique({ where: { id: input.groupId }, select: { slug: true, archived: true } });
  if (!group || group.archived) return fail(404, "Group not found.");
  if (input.position === "PRESIDENT" && group.slug !== GROUP_SLUGS.executive) {
    return fail(400, "The President belongs to the Executive group.");
  }

  const email = input.email.trim().toLowerCase();
  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  if (!user) return fail(404, "No account uses that email. They need to log in once first.");

  const existing = await db.groupMember.findUnique({
    where: { groupId_userId: { groupId: input.groupId, userId: user.id } },
    select: { position: true },
  });
  if (existing && existing.position !== "STAFF" && !(await isPresident(input.actorId))) {
    return fail(403, "Only the President can change a VP or President.");
  }

  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: input.groupId, userId: user.id } },
    create: { groupId: input.groupId, userId: user.id, position: input.position },
    update: { position: input.position },
  });
  return { ok: true };
}

export async function removeFromGroup(input: { actorId: string; memberId: string }): Promise<Outcome> {
  const member = await db.groupMember.findUnique({
    where: { id: input.memberId },
    select: { groupId: true, userId: true, position: true, group: { select: { slug: true } } },
  });
  if (!member) return fail(404, "Not found.");

  const access = await getAccess(input.actorId);
  if (!can(access, "groups.manage", { groupId: member.groupId })) return fail(403, "You can't manage this group.");
  if (member.position !== "STAFF" && !(await isPresident(input.actorId))) {
    return fail(403, "Only the President can remove a VP or President.");
  }
  if (member.position === "PRESIDENT") {
    const presidents = await db.groupMember.count({
      where: { position: "PRESIDENT", group: { slug: GROUP_SLUGS.executive } },
    });
    if (presidents <= 1) return fail(400, "The club must always have a President. Appoint the next one first.");
  }

  await db.groupMember.delete({ where: { id: input.memberId } });
  return { ok: true };
}

export async function createSubgroup(input: { actorId: string; parentId: string; name: string }): Promise<Outcome<string>> {
  const access = await getAccess(input.actorId);
  if (!can(access, "groups.manage", { groupId: input.parentId })) return fail(403, "You can't manage this group.");

  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return fail(400, "Please enter a name.");

  const parent = await db.group.findUnique({ where: { id: input.parentId }, select: { slug: true, archived: true } });
  if (!parent || parent.archived) return fail(404, "Group not found.");

  const base = `${parent.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group"}`;
  let slug = base;
  for (let n = 2; await db.group.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;

  const group = await db.group.create({ data: { name, slug, parentId: input.parentId } });
  return { ok: true, value: group.id };
}

/** Archive (never delete) a subgroup. Departments themselves can't be archived here. */
export async function archiveGroup(input: { actorId: string; groupId: string }): Promise<Outcome> {
  const group = await db.group.findUnique({ where: { id: input.groupId }, select: { parentId: true, archived: true } });
  if (!group || group.archived) return fail(404, "Group not found.");
  if (!group.parentId) return fail(400, "Departments can't be archived.");

  const access = await getAccess(input.actorId);
  if (!can(access, "groups.manage", { groupId: input.groupId })) return fail(403, "You can't manage this group.");

  await db.group.update({ where: { id: input.groupId }, data: { archived: true } });
  return { ok: true };
}
