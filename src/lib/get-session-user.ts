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
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";
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

  // 2. å˜—è©¦ Bearer Tokenï¼ˆReact Native App ç«¯ï¼‰
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)!,
        salt: "authjs.session-token",
      });
      if (decoded?.sub) {
        const user = await db.user.findUnique({
          where: { id: decoded.sub },
          select: { id: true, role: true },
        });
        if (user) {
          const role = (user.role as Role) ?? "MEMBER";
          return { id: user.id, role, roleLevel: ROLE_LEVEL[role] ?? 1 };
        }
      }
    } catch {
      // invalid / expired token â€” fall through to return null
    }
  }

  return null;
}