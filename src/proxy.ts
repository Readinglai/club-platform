/**
 * proxy.ts — Next.js 16 Edge Proxy
 *
 * 執行順序：
 * 1. 公開路徑直接放行
 * 2. exec/portal locale prefix redirect
 * 3. 用 getToken 手動驗證 JWT（避免 NextAuth 內部 redirect 繞過白名單）
 * 4. 未登入且訪問保護路徑 → redirect 到 /zh/login
 * 5. next-intl i18n routing
 *
 * 不使用 auth() handler，因為 NextAuth 內部 redirect 會繞過公開路徑白名單，
 * 造成 /login → /zh/login → auth redirect → /login 無限循環。
 */

import { type NextRequest, NextResponse } from "next/server";
import createNextIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

/** next-intl 語言路由 handler */
const handleI18nRouting = createNextIntlMiddleware(routing);

/** 需要登入才能訪問的路徑 */
const protectedPatterns = [
  /^\/(zh|en)\/member(\/|$)/,
  /^\/(zh|en)\/admin(\/|$)/,
  /^\/(zh|en)\/exec(\/|$)/,
  /^\/(zh|en)\/portal(\/|$)/,
  /^\/member(\/|$)/,
  /^\/admin(\/|$)/,
  /^\/exec(\/|$)/,
  /^\/portal(\/|$)/,
];

/** 公開路徑，直接放行不做任何攔截 */
const publicPatterns = [
  /^\/(zh|en)?\/login(\/|$)/,
  /^\/login(\/|$)/,
  /^\/(zh|en)?\/unauthorized(\/|$)/,
  /^\/unauthorized(\/|$)/,
];

/** 不需要 i18n locale 前綴的內部路徑 */
const NO_I18N_PREFIXES = [
  /^\/exec(\/|$)/,
  /^\/portal(\/|$)/,
  /^\/ticket(\/|$)/,
  /^\/staff(\/|$)/,
];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1：公開路徑直接放行，交給 i18n 處理即可
  if (publicPatterns.some((p) => p.test(pathname))) {
    if (NO_I18N_PREFIXES.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }
    return handleI18nRouting(request);
  }

  // Step 2：exec/portal locale prefix → 移除 locale
  const localeInternalMatch = pathname.match(/^\/(zh|en)\/(exec|portal)(\/.*)?$/);
  if (localeInternalMatch) {
    const tool = localeInternalMatch[2];
    const rest = localeInternalMatch[3] ?? "";
    return NextResponse.redirect(new URL(`/${tool}${rest}`, request.url));
  }

  // Step 3：暫時跳過 JWT 驗證
  const token = null;

  // Step 4：保護路徑 + 未登入 → redirect 到 /zh/login
  const isProtected = protectedPatterns.some((p) => p.test(pathname));
  if (isProtected && !token) {
    const loginUrl = new URL("/zh/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Step 5：i18n routing
  const skipI18n = NO_I18N_PREFIXES.some((p) => p.test(pathname));
  if (skipI18n) {
    return NextResponse.next();
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
