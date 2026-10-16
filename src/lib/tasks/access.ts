/**
 * Who can work with a department's or group's tasks, discussion and votes.
 *
 * - Anyone with a position in the group works in it (create/edit tasks,
 *   comment, vote).
 * - People who manage the group (its VP, the President) can also delete
 *   tasks and remove any comment.
 * - Assignees from elsewhere see and update the tasks assigned to them.
 */

import { db } from "@/lib/db";
import { can, getAccess } from "@/lib/access/can";

export type GroupRights = { work: boolean; manage: boolean };

export async function groupRights(userId: string, groupId: string): Promise<GroupRights> {
  const [membership, access] = await Promise.all([
    db.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, select: { id: true } }),
    getAccess(userId),
  ]);
  const manage = can(access, "groups.manage", { groupId });
  return { work: Boolean(membership) || manage, manage };
}

/** Departments and groups this person works in or manages (for the Tasks page). */
export async function myTaskGroups(userId: string) {
  const access = await getAccess(userId);
  const groups = await db.group.findMany({
    where: { archived: false },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      members: { where: { userId }, select: { id: true } },
      _count: { select: { tasks: { where: { status: { not: "DONE" } } } } },
    },
  });
  return groups
    .filter((g) => g.members.length > 0 || can(access, "groups.manage", { groupId: g.id }))
    .map((g) => ({ id: g.id, name: g.name, parentId: g.parentId, openTasks: g._count.tasks }));
}

/** Staff (anyone with a position) can be assigned tasks. */
export async function isStaff(userId: string) {
  return (await db.groupMember.count({ where: { userId, group: { archived: false } } })) > 0;
}
