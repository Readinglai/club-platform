/**
 * get-session-user.ts â€” æ”¯æ´ Cookie Session å’Œ Bearer Token å…©ç¨®é©—è­‰æ–¹å¼
 *
 * ç”¨æ³•ï¼š
 *   import { getSessionUser } from "@/lib/get-session-user";
 *   const sessionUser = await getSessionUser(request);
 *   if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   if (sessionUser.roleLevel < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 *
 * SessionUser æ¬„ä½ï¼š
 *   - id: string       (user ID)
 *   - role: Role       (è³‡æ–™åº« role å­—ä¸²)
 *   - roleLevel: number (MEMBER=2, EXEC=3, ADMIN=4, SUPER_ADMIN=5)
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export interface SessionUser {
  id: string;
  role: Role;
  roleLevel: number;
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  // 1. å˜—è©¦ Cookie Sessionï¼ˆWeb ç«¯ / NextAuth callbackï¼‰
  const session = await auth();
  if (session?.user?.id) {
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    return { id: session.user.id, role, roleLevel: ROLE_LEVEL[role] ?? 1 };
  }

  return null;
}