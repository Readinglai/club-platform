/**
 * auth.ts — NextAuth v5 (beta) 完整設定（Server-side only）
 *
 * 合併 auth.config.ts（edge-safe 設定）和 Prisma Adapter（需要 Node.js）。
 * 使用 JWT session 策略，確保 proxy（Edge Runtime）也能驗證 session，
 * 同時用 Prisma Adapter 將 User/Account 寫入 Supabase 資料庫。
 *
 * ⚠️ 此檔案只應在 Server Components、Server Actions 和 API Routes 中 import。
 *    不可在 proxy.ts（Edge Runtime）中引用此檔案。
 *
 * 導出：
 *   handlers  → 用於 /api/auth/[...nextauth]/route.ts
 *   auth      → 用於 Server Components 取得 session（await auth()）
 *   signIn    → 用於 Server Actions 觸發登入
 *   signOut   → 用於 Server Actions 觸發登出
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // 合併 edge-safe 設定（providers、callbacks、pages）
  ...authConfig,

  /**
   * Prisma Adapter：讓 NextAuth 使用 Supabase 資料庫儲存
   * User 和 Account 記錄（OAuth 憑證）。
   *
   * 使用 `as any` 是因為 @auth/prisma-adapter 的型別對應 @prisma/client，
   * 而本專案使用 Prisma 7 的自訂輸出路徑（src/generated/prisma），
   * 兩者 API 兼容但 TypeScript 型別路徑不同。
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),

  /**
   * JWT Session 策略
   *
   * 使用 JWT 而非資料庫 session，原因：
   * 1. Edge Runtime 相容：proxy.ts 可在不查資料庫的情況下驗證 session
   * 2. 效能更好：每次請求不需查詢 Session 表
   * 3. 與 Prisma Adapter 同時使用：User/Account 仍存於資料庫，
   *    只有 session 改用 JWT（存於 httpOnly cookie）
   */
  session: {
    strategy: "jwt",
  },
});
