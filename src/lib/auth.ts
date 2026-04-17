/**
 * auth.ts — NextAuth v5 (beta) 完整設定（Server-side only）
 *
 * 合併 auth.config.ts（edge-safe 設定）和 Prisma Adapter（需要 Node.js）。
 * 使用 JWT session 策略，確保 proxy（Edge Runtime）也能驗證 session，
 * 同時用 Prisma Adapter 將 User/Account 寫入 Supabase 資料庫。
 *
 * ⚠️ 此檔案只應在 Server Components、Server Actions 和 API Routes 中 import。
 *    不可在 proxy.ts（Edge Runtime）中引用此檔案。
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),

  session: {
    strategy: "jwt",
  },
});
