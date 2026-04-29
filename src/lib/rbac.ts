/**
 * rbac.ts — Role-Based Access Control 工具函數
 *
 * 定義角色層級並提供權限檢查函數，供 Server Components、
 * Server Actions 和 API Routes 使用。
 *
 * 角色層級（數字越大，權限越高）：
 *   SUPER_ADMIN = 5  跨社團最高管理員
 *   ADMIN       = 4  社團管理員
 *   EXEC        = 3  社團執行委員
 *   MEMBER      = 2  一般社員
 *   PUBLIC      = 1  未登入訪客
 */

import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/client";

// ─────────────────────────────────────────────
// 角色層級對照表
// ─────────────────────────────────────────────

/** 每個角色對應的數字層級 */
export const ROLE_LEVEL: Record<Role | "PUBLIC", number> = {
  SUPER_ADMIN: 5,
  ADMIN:       4,
  EXEC:        3,
  MEMBER:      2,
  PUBLIC:      1,
};

// ─────────────────────────────────────────────
// 核心工具函數
// ─────────────────────────────────────────────

/**
 * 檢查用戶角色是否達到所需角色層級。
 *
 * 使用大於等於比較，因此 SUPER_ADMIN 自動滿足所有低層級需求。
 *
 * @param userRole    用戶的實際角色
 * @param requiredRole 所需的最低角色
 * @returns true 代表有權限，false 代表無權限
 *
 * @example
 * hasRole("EXEC", "MEMBER")   // true  （EXEC 層級 3 ≥ MEMBER 層級 2）
 * hasRole("MEMBER", "EXEC")   // false （MEMBER 層級 2 < EXEC 層級 3）
 */
export function hasRole(
  userRole: Role | "PUBLIC",
  requiredRole: Role | "PUBLIC"
): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[requiredRole];
}

/**
 * 從目前 session 取得已登入的用戶資訊。
 * 若未登入，拋出錯誤（適用於 Server Components / Server Actions）。
 *
 * @returns session.user 物件（含 id、email、name、role）
 * @throws Error 若 session 不存在或 user 為 null
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED: 請先登入才能存取此資源。");
  }

  return session.user;
}

/**
 * 取得已登入的用戶，並確認其角色達到所需層級。
 * 未登入或角色不足時均拋出錯誤。
 *
 * @param requiredRole 所需的最低角色
 * @returns session.user 物件
 * @throws Error 若未登入或角色不足
 *
 * @example
 * // 在 Server Action 中保護只有 ADMIN 以上才能操作
 * const user = await requireRole("ADMIN");
 * // user.role 一定是 ADMIN 或以上
 */
export async function requireRole(requiredRole: Role | "PUBLIC") {
  const user = await requireAuth();

  // user.role 來自 next-auth.d.ts 的型別擴展
  const userRole = (user.role as Role | undefined) ?? "PUBLIC";

  if (!hasRole(userRole, requiredRole)) {
    throw new Error(
      `FORBIDDEN: 此操作需要 ${requiredRole} 以上的角色，您目前的角色為 ${userRole}。`
    );
  }

  return user;
}
