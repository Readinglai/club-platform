/**
 * For API routes: a 403 response unless the person has the permission
 * (from their group positions, see rules.ts); null when they do.
 *
 *   const forbidden = await forbidUnless(userId, "tasks.use");
 *   if (forbidden) return forbidden;
 */

import { NextResponse } from "next/server";
import { can, getAccess } from "./can";
import type { Permission } from "./rules";

export async function forbidUnless(userId: string, permission: Permission) {
  if (can(await getAccess(userId), permission)) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
