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
import { authConfig } from "@/lib/auth.config";

// NOTE: PrismaAdapter temporarily disabled to isolate DB connectivity issue.
// DB at db.rbwchvwiuazfrsoabwni.supabase.co is unreachable from Vercel serverless,
// causing PrismaAdapter to throw → wrapped as error=Configuration.
// To restore: add PrismaAdapter back after fixing DATABASE_URL to pooler URL.

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  logger: {
    error(error) {
      console.error("[NextAuth][error]", error);
    },
    warn(code) {
      console.warn("[NextAuth][warn]", code);
    },
  },

  session: {
    strategy: "jwt",
  },
});
