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
        /^\/(zh|en)\/exec(\/|$)/,   // locale-prefixed exec（會被 redirect 到 /exec，但仍需 auth）
        /^\/(zh|en)\/portal(\/|$)/, // locale-prefixed portal
        /^\/member(\/|$)/,
        /^\/admin(\/|$)/,
        /^\/exec(\/|$)/,   // 執委內部工具（role 層級在 layout 層驗證）
        /^\/portal(\/|$)/, // 會員 portal
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
// 不需要 i18n locale 前綴的內部路徑（exec/portal 都是純中文內部工具，無多語需求）
const NO_I18N_PREFIXES = [/^\/exec(\/|$)/, /^\/portal(\/|$)/];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 0: exec and portal are Chinese-only internal tools without locale support.
  // Redirect /(zh|en)/exec/* and /(zh|en)/portal/* to the non-locale version.
  // Must run before i18n handling, because middleware executes before next.config redirects
  // in Next.js 16.
  const localeInternalMatch = pathname.match(/^\/(zh|en)\/(exec|portal)(\/.*)?$/);
  if (localeInternalMatch) {
    const tool = localeInternalMatch[2];
    const rest = localeInternalMatch[3] ?? "";
    return NextResponse.redirect(new URL(`/${tool}${rest}`, request.url));
  }

  const skipI18n = NO_I18N_PREFIXES.some((p) => p.test(pathname));

  let i18nResponse: NextResponse;

  if (skipI18n) {
    // 跳過 next-intl，直接放行（避免被重導到 /zh/exec/... 而 404）
    i18nResponse = NextResponse.next();
  } else {
    // 步驟 1：next-intl 語言路由
    i18nResponse = handleI18nRouting(request);

    // 若 i18n middleware 觸發重導向（新增語言前綴），直接回傳
    if (i18nResponse.status >= 300 && i18nResponse.status < 400) {
      return i18nResponse;
    }
  }

  // 步驟 2：NextAuth 路由保護（exec/portal 仍需驗證登入）
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
    // 排除靜態資源、_next 內部路徑、以及所有 /api/* 路徑。
    // API routes 自行呼叫 auth() 驗證 session，不需要 middleware 做 i18n 前綴或 auth redirect，
    // 否則 next-intl 會將 POST /api/xxx 重導到 /en/api/xxx（不存在）導致 404。
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
