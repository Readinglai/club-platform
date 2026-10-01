/**
 * auth.config.ts — NextAuth Edge-safe 設定
 *
 * 此檔案只包含不依賴 Node.js 模組的設定（providers、callbacks、pages），
 * 可以在 Edge Runtime 中安全執行。
 *
 * 用途：
 *   1. 被 auth.ts 引入，與 Prisma Adapter 合併成完整設定（Server side）
 *   2. 被 src/proxy.ts 引入，僅用於 JWT 驗證和路由保護（Edge Runtime）
 *
 * ⚠️ 此檔案不可 import db、@prisma/* 或任何 Node.js-only 套件。
 */

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { Role } from "@/generated/prisma/client";

/** 需要登入才能訪問的路徑前綴 */
const PROTECTED_PREFIXES = ["/member", "/admin"];

export const authConfig: NextAuthConfig = {
  trustHost: true,

  pages: {
    signIn: "/zh/login",
    error: "/zh/login",
  },

  /**
   * OAuth Providers
   *
   * Email/Magic Link provider 會放在 auth.ts，
   * 因為 Gmail SMTP / Nodemailer 需要 Node.js runtime。
   */
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      // Allow linking a Google account to an existing User row that was
      // pre-inserted via SQL (no Account record yet). Safe because Google
      // verifies email ownership and our signIn callback guards access.
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  callbacks: {
    /**
     * authorized callback — 專供 proxy（Edge middleware）使用
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );

      if (isProtected && !isLoggedIn) {
        return false;
      }

      return true;
    },

    /**
     * jwt callback — 把 role 和 id 存入 JWT token
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },

    /**
     * session callback — 把 role 和 id 從 token 注入 session
     */
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};
