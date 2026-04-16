/**
 * proxy.ts — Next.js 16 Edge Proxy（取代舊版 middleware.ts）
 *
 * 整合兩層攔截邏輯，按順序執行：
 *
 * 1. next-intl 語言路由（handleI18nRouting）
 *    - 偵測請求 URL 是否有語言前綴（/zh/ 或 /en/）
 *    - 若無語言前綴，自動重導向到對應語言路徑（例如 / → /zh/）
 *    - 若有語言前綴且需要重定向，直接回傳 redirect response
 *
 * 2. NextAuth 路由保護（auth）
 *    - 保護 /[locale]/member/* 和 /[locale]/admin/* 路徑
 *    - 未登入者導向 /login
 *
 * ⚠️ 此檔案在 Edge Runtime 執行，不可 import db、@prisma/* 或 Node.js-only 套件。
 *    只使用 auth.config.ts（edge-safe），不使用完整的 auth.ts。
 */

import { type NextRequest, NextResponse } from "next/server";
import createNextIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

// ─── next-intl 語言路由 handler ───────────────────────────────────────────────

/**
 * handleI18nRouting — 處理語言前綴路由重導向
 * 由 next-intl 的 createMiddleware 建立，根據 routing.ts 的設定運作。
 */
const handleI18nRouting = createNextIntlMiddleware(routing);

// ─── NextAuth 輕量 auth（Edge-safe，不含 Prisma Adapter）────────────────────

const { auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    /**
     * authorized callback — 路由保護（覆寫原版，支援 locale 前綴）
     *
     * 保護 /[locale]/member/* 和 /[locale]/admin/* 路徑。
     * 未登入者導向 /login（無 locale 前綴，由後續 i18n 重導）。
     */
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;

      // 支援有 locale 前綴和無前綴兩種格式的保護路徑
      const protectedPatterns = [
        /^\/(zh|en)\/member(\/|$)/,
        /^\/(zh|en)\/admin(\/|$)/,
        /^\/member(\/|$)/,
        /^\/admin(\/|$)/,
      ];

      const isProtected = protectedPatterns.some((pattern) =>
        pattern.test(pathname)
      );

      if (isProtected && !session?.user) {
        return false; // NextAuth 會導向 signIn 頁（/login）
      }

      return true;
    },
  },
});

// ─── 主 Proxy 函數 ────────────────────────────────────────────────────────────

/**
 * 主 proxy 函數：先做 i18n 路由，再做 auth 保護。
 *
 * 執行順序：
 * 1. 執行 next-intl i18n routing
 *    - 若回傳 redirect（3xx），直接回傳（URL 中加入語言前綴）
 *    - 若回傳 next()，繼續往下
 * 2. 執行 NextAuth auth 保護（只對受保護路徑生效）
 */
export default async function proxy(request: NextRequest) {
  // 步驟 1：next-intl 語言路由
  // createMiddleware 回傳的 handler 對每個請求回傳 NextResponse
  const i18nResponse = handleI18nRouting(request);

  // 若 i18n middleware 觸發重導向（新增語言前綴），直接回傳
  if (i18nResponse.status >= 300 && i18nResponse.status < 400) {
    return i18nResponse;
  }

  // 步驟 2：NextAuth 路由保護
  // auth() 作為函數呼叫時，會執行 authorized callback 並自動處理未授權情況
  // 使用 unknown 中轉以相容不同版本的 NextAuth 型別定義
  const authHandler = auth as unknown as (req: NextRequest) => Promise<NextResponse | Response | undefined>;
  const authResponse = await authHandler(request);

  // 若 NextAuth 觸發重導向（未登入 → /login），回傳其 response
  if (authResponse) {
    return authResponse;
  }

  // 所有檢查通過，繼續正常請求
  return i18nResponse;
}

// ─── Proxy 執行範圍設定 ───────────────────────────────────────────────────────

export const config = {
  matcher: [
    // 匹配所有路徑，但排除靜態資源和 _next 內部路徑
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
