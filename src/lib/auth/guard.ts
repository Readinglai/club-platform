/**
 * lib/auth/guard.ts
 *
 * 統一權限驗證工具
 *
 * requireAuth(minLevel)              — 用於 Server Components，未通過則 redirect
 * requireAuthJson(minLevel, request) — 用於 API Routes，未通過則回傳 JSON error
 *
 * requireAuthJson 同時支援：
 *  - Cookie session（NextAuth 標準流程）
 *  - Authorization: Bearer <token>（行動 App JWT）
 */

import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import { decode } from "@auth/core/jwt";
import type { Role } from "@/generated/prisma/client";

/** Guard 通過時的回傳型別 */
type GuardSuccess = { error: null; userId: string; role: Role; level: number };

/** Guard 失敗時的回傳型別（包含 JSON error response） */
type GuardFailure = { error: NextResponse };

/** Guard 結果聯合型別 */
type GuardResult = GuardSuccess | GuardFailure;

/**
 * Server Component 用：驗證 session 並確認角色層級。
 * 未登入時 redirect 到 /login，角色不足時 redirect 到 /unauthorized。
 *
 * @param minLevel 最低所需角色層級（預設為 1，即任何登入使用者）
 * @returns 包含 userId、role、level 的物件（error 永遠為 null）
 *
 * @example
 * // 在 admin layout 中確認 EXEC 以上
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
 * API Route 用：驗證 session 或 Bearer token，確認角色層級。
 * 同時支援 cookie session（NextAuth）和 Authorization: Bearer <JWT>（行動 App）。
 *
 * 回傳 GuardFailure 時，直接 `return guard.error` 即可回傳 JSON error response。
 * 回傳 GuardSuccess 時（guard.error === null），可讀取 guard.userId / guard.role / guard.level。
 *
 * @param minLevel 最低所需角色層級
 * @param request  NextRequest 物件（用於讀取 Authorization header）
 * @returns GuardResult（通過或失敗）
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const guard = await requireAuthJson(4, request);
 *   if (guard.error) return guard.error;
 *   // guard.userId, guard.role, guard.level 可用
 * }
 */
export async function requireAuthJson(
  minLevel: number,
  request: NextRequest
): Promise<GuardResult> {
  // 1. 嘗試 cookie session（NextAuth 標準流程）
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

  // 2. 嘗試 Authorization: Bearer <token>（行動 App JWT）
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
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
      // token 無效，繼續落到 401
    }
  }

  return {
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}
