/**
 * For API routes: a 403 response unless the person has the permission
 * (from their group positions, see rules.ts); null when they do.
 *
 *   const forbidden = await forbidUnless(userId, "events.manage");
 *   if (forbidden) return forbidden;
 */

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { can, getAccess } from "./can";
import { getCurrentUser } from "./current-user";
import type { Permission } from "./rules";

export async function forbidUnless(userId: string, permission: Permission) {
  if (can(await getAccess(userId), permission)) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

/**
 * Drop-in for the old requireAuthJson(level, request) in API routes, but
 * checking a permission instead of a role:
 *
 *   const guard = await requirePermissionJson("content.manage");
 *   if (guard.error) return guard.error;
 *   // guard.userId
 */
export async function requirePermissionJson(
  permission: Permission
): Promise<{ error: NextResponse } | { error: null; userId: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const forbidden = await forbidUnless(user.id, permission);
  if (forbidden) return { error: forbidden };
  return { error: null, userId: user.id };
}

/**
 * For portal pages: the signed-in person, or a redirect to sign in, or back
 * to the portal home when they lack the permission.
 */
export async function requirePagePermission(permission: Permission) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!can(await getAccess(user.id), permission)) redirect("/portal");
  return user;
}

/** For API routes open to anyone signed in: like requirePermissionJson, without a permission. */
export async function requireUserJson(): Promise<{ error: NextResponse } | { error: null; userId: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { error: null, userId: user.id };
}
