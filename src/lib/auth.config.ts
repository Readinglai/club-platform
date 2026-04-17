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

/** 允許登入的 email 網域白名單 */
const ALLOWED_DOMAINS = ["utoronto.ca", "mail.utoronto.ca", "gmail.com"];

/** 需要登入才能訪問的路徑前綴 */
const PROTECTED_PREFIXES = ["/member", "/admin"];

export const authConfig: NextAuthConfig = {
  trustHost: true,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  /**
   * OAuth Providers
   * clientId / clientSecret 由環境變數提供；不在此硬編碼。
   */
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    /**
     * authorized callback — 專供 proxy（Edge middleware）使用
     *
     * Next.js 在每次請求時呼叫此函數，決定是否允許訪問。
     * 回傳 true 放行，false 導向 signIn 頁面。
     *
     * @param auth    當前 session（可能為 null）
     * @param request 當前請求
     */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
      );

      if (isProtected && !isLoggedIn) {
        // 未登入嘗試訪問保護路徑 → 拒絕（NextAuth 會導向 signIn 頁）
        return false;
      }

      return true;
    },

    /**
     * signIn callback — 驗證 email 網域
     * 不符合白名單的 email 拒絕登入。
     */
    signIn({ user, account, profile, email, credentials }) {
      console.log("[signIn callback] user:", user);
      console.log("[signIn callback] account:", account);
      console.log("[signIn callback] profile:", profile);
      console.log("[signIn callback] email:", email);
      const userEmail = user.email ?? "";
      const domain = userEmail.split("@")[1] ?? "";
      console.log("[signIn callback] domain:", domain, "allowed:", ALLOWED_DOMAINS.includes(domain));

      const devAllowedEmails = process.env.DEV_ALLOWED_EMAILS?.split(",") ?? [];
      const isDevAllowed =
        process.env.NODE_ENV === "development" && devAllowedEmails.includes(userEmail);
      console.log("[signIn callback] DEV_ALLOWED_EMAILS:", process.env.DEV_ALLOWED_EMAILS);
      console.log("[signIn callback] NODE_ENV:", process.env.NODE_ENV);
      console.log("[signIn callback] userEmail:", userEmail);
      console.log("[signIn callback] isDevAllowed:", isDevAllowed);

      return isDevAllowed || ALLOWED_DOMAINS.includes(domain);
    },

    /**
     * jwt callback — 把 role 和 id 存入 JWT token
     *
     * 首次登入時 user 物件存在，後續刷新時只有 token。
     * 將 role/id 存入 token，讓 session callback 可以讀取。
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // user.role 來自 Prisma adapter 回傳的資料庫欄位
        token.role = (user as { role?: Role }).role;
      }
      return token;
    },

    /**
     * session callback — 把 role 和 id 從 token 注入 session
     *
     * 使用 JWT 策略時，session 由 token 建構（不查資料庫）。
     * 讓 client 端 useSession() 和 server 端 auth() 都能讀到 role。
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
