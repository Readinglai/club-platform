/**
 * lib/auth/guard.ts
 *
 * çµ±ä¸€æ¬Šé™é©—è­‰å·¥å…·
 *
 * requireAuth(minLevel)              â€” ç”¨æ–¼ Server Componentsï¼Œæœªé€šéŽå‰‡ redirect
 * requireAuthJson(minLevel, request) â€” ç”¨æ–¼ API Routesï¼Œæœªé€šéŽå‰‡å›žå‚³ JSON error
 *
 * requireAuthJson åŒæ™‚æ”¯æ´ï¼š
 *  - Cookie sessionï¼ˆNextAuth æ¨™æº–æµç¨‹ï¼‰
 *  - Authorization: Bearer <token>ï¼ˆè¡Œå‹• App JWTï¼‰
 */

import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import { decode } from "@auth/core/jwt";
import type { Role } from "@/generated/prisma/client";

/** Guard é€šéŽæ™‚çš„å›žå‚³åž‹åˆ¥ */
type GuardSuccess = { error: null; userId: string; role: Role; level: number };

/** Guard å¤±æ•—æ™‚çš„å›žå‚³åž‹åˆ¥ï¼ˆåŒ…å« JSON error responseï¼‰ */
type GuardFailure = { error: NextResponse };

/** Guard çµæžœè¯åˆåž‹åˆ¥ */
type GuardResult = GuardSuccess | GuardFailure;

/**
 * Server Component ç”¨ï¼šé©—è­‰ session ä¸¦ç¢ºèªè§’è‰²å±¤ç´šã€‚
 * æœªç™»å…¥æ™‚ redirect åˆ° /loginï¼Œè§’è‰²ä¸è¶³æ™‚ redirect åˆ° /unauthorizedã€‚
 *
 * @param minLevel æœ€ä½Žæ‰€éœ€è§’è‰²å±¤ç´šï¼ˆé è¨­ç‚º 1ï¼Œå³ä»»ä½•ç™»å…¥ä½¿ç”¨è€…ï¼‰
 * @returns åŒ…å« userIdã€roleã€level çš„ç‰©ä»¶ï¼ˆerror æ°¸é ç‚º nullï¼‰
 *
 * @example
 * // åœ¨ admin layout ä¸­ç¢ºèª EXEC ä»¥ä¸Š
 * const { userId, role } = await requireAuth(4);
 */
export async function requireAuth(minLevel: number = 1): Promise<GuardSuccess> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  const level = ROLE_LEVEL[role] ?? 1;
  if (level < minLevel) redirect("/unauthorized");
  return { error: null, userId: session.user.id!, role, level };
}

/**
 * API Route ç”¨ï¼šé©—è­‰ session æˆ– Bearer tokenï¼Œç¢ºèªè§’è‰²å±¤ç´šã€‚
 * åŒæ™‚æ”¯æ´ cookie sessionï¼ˆNextAuthï¼‰å’Œ Authorization: Bearer <JWT>ï¼ˆè¡Œå‹• Appï¼‰ã€‚
 *
 * å›žå‚³ GuardFailure æ™‚ï¼Œç›´æŽ¥ `return guard.error` å³å¯å›žå‚³ JSON error responseã€‚
 * å›žå‚³ GuardSuccess æ™‚ï¼ˆguard.error === nullï¼‰ï¼Œå¯è®€å– guard.userId / guard.role / guard.levelã€‚
 *
 * @param minLevel æœ€ä½Žæ‰€éœ€è§’è‰²å±¤ç´š
 * @param request  NextRequest ç‰©ä»¶ï¼ˆç”¨æ–¼è®€å– Authorization headerï¼‰
 * @returns GuardResultï¼ˆé€šéŽæˆ–å¤±æ•—ï¼‰
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const guard = await requireAuthJson(4, request);
 *   if (guard.error) return guard.error;
 *   // guard.userId, guard.role, guard.level å¯ç”¨
 * }
 */
export async function requireAuthJson(
  minLevel: number,
  request: NextRequest
): Promise<GuardResult> {
  // 1. å˜—è©¦ cookie sessionï¼ˆNextAuth æ¨™æº–æµç¨‹ï¼‰
  const session = await auth();
  if (session?.user) {
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    const level = ROLE_LEVEL[role] ?? 1;
    if (level < minLevel) {
      return {
        error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      };
    }
    return { error: null, userId: session.user.id!, role, level };
  }

  // 2. å˜—è©¦ Authorization: Bearer <token>ï¼ˆè¡Œå‹• App JWTï¼‰
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
        const role = ((decoded as { role?: Role }).role) ?? "MEMBER";
        const level = ROLE_LEVEL[role] ?? 1;
        if (level < minLevel) {
          return {
            error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
          };
        }
        return { error: null, userId: decoded.sub, role, level };
      }
    } catch {
      // token ç„¡æ•ˆï¼Œç¹¼çºŒè½åˆ° 401
    }
  }

  return {
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

