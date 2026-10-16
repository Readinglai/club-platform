/**
 * Permission checks based on group positions (see rules.ts).
 *
 *   const access = await getAccess(userId);
 *   if (!can(access, "finance.view")) …                       // anywhere
 *   if (!can(access, "events.manage", { groupId })) …        // this group or below
 *
 * Positions are always read from the database, never from a login token,
 * so removing someone from a group takes effect on their next request.
 */

import { db } from "@/lib/db";
import type { GroupPosition } from "@/generated/prisma/client";
import { getRules, POSITION_RANK, type Permission, type Rule } from "./rules";

type GroupNode = { id: string; slug: string; parentId: string | null };

export type Access = {
  userId: string;
  /** Group ids where each permission was granted ("*" = all permissions). */
  grants: Map<Permission | "*", Set<string>>;
  /** Permissions that apply in every group. */
  globalGrants: Set<Permission | "*">;
  /** Every group id → its parent id, for checking "this group or below". */
  parents: Map<string, string | null>;
};

export async function getAccess(userId: string): Promise<Access> {
  const [memberships, groups, rules] = await Promise.all([
    db.groupMember.findMany({
      where: { userId, group: { archived: false } },
      select: { groupId: true, position: true },
    }),
    db.group.findMany({ select: { id: true, slug: true, parentId: true } }),
    getRules(),
  ]);

  const byId = new Map(groups.map((g) => [g.id, g]));
  const grants = new Map<Permission | "*", Set<string>>();
  const globalGrants = new Set<Permission | "*">();

  for (const m of memberships) {
    const group = byId.get(m.groupId);
    if (!group) continue;
    for (const rule of rules) {
      if (!positionMeets(m.position, rule.minPosition)) continue;
      if (!heldInMatches(rule, group, byId)) continue;
      if (rule.global) globalGrants.add(rule.permission);
      const set = grants.get(rule.permission) ?? new Set<string>();
      set.add(group.id);
      grants.set(rule.permission, set);
    }
  }

  return {
    userId,
    grants,
    globalGrants,
    parents: new Map(groups.map((g) => [g.id, g.parentId])),
  };
}

export function can(access: Access, permission: Permission, target?: { groupId: string }): boolean {
  if (access.globalGrants.has("*") || access.globalGrants.has(permission)) return true;

  const granted = [access.grants.get("*"), access.grants.get(permission)];
  if (!target) return granted.some((set) => set && set.size > 0);

  // The grant covers its own group and everything below it.
  for (const groupId of ancestorsAndSelf(target.groupId, access.parents)) {
    if (granted.some((set) => set?.has(groupId))) return true;
  }
  return false;
}

function positionMeets(held: GroupPosition, required: GroupPosition) {
  return POSITION_RANK[held] >= POSITION_RANK[required];
}

function heldInMatches(rule: Rule, group: GroupNode, byId: Map<string, GroupNode>) {
  if (rule.heldIn.endsWith("/*")) {
    const parentSlug = rule.heldIn.slice(0, -2);
    const parent = group.parentId ? byId.get(group.parentId) : undefined;
    return parent?.slug === parentSlug;
  }
  return group.slug === rule.heldIn;
}

function* ancestorsAndSelf(groupId: string, parents: Map<string, string | null>) {
  const seen = new Set<string>();
  let current: string | null | undefined = groupId;
  while (current && !seen.has(current)) {
    seen.add(current);
    yield current;
    current = parents.get(current);
  }
}
