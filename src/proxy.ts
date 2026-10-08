/**
 * proxy.ts — Next.js 16 Edge Proxy
 *
 * Public visitors:
 * - Fall 2026 event page
 * - Login / unauthorized pages
 * - Ticket pages
 *
 * Everything else redirects to the Fall 2026 event page.
 *
 * Protected routes still require authentication:
 * - member
 * - admin
 * - exec
 * - portal
 */

import { type NextRequest, NextResponse } from "next/server";
import createNextIntlMiddleware from "next-intl/middleware";
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

/** 一般訪客可以直接訪問的公開頁面 */
const publicPatterns = [
  /^\/(zh|en)\/event\/fall-2026(\/|$)/,
  /^\/event\/fall-2026(\/|$)/,

  /^\/(zh|en)?\/login(\/|$)/,
  /^\/login(\/|$)/,

  /^\/(zh|en)?\/unauthorized(\/|$)/,
  /^\/unauthorized(\/|$)/,

  /^\/ticket(\/|$)/,
];

/** 不需要 i18n locale 前綴的內部路徑 */
const NO_I18N_PREFIXES = [
  /^\/exec(\/|$)/,
  /^\/portal(\/|$)/,
  /^\/ticket(\/|$)/,
  /^\/staff(\/|$)/,
];

/** Event landing page */
const EVENT_PATH = "/zh/event/fall-2026";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 1：公開白名單路徑直接放行
  if (publicPatterns.some((p) => p.test(pathname))) {
    if (NO_I18N_PREFIXES.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }

    return handleI18nRouting(request);
  }

  // Step 2：exec/portal locale prefix → 移除 locale
  const localeInternalMatch = pathname.match(
    /^\/(zh|en)\/(exec|portal)(\/.*)?$/
  );

  if (localeInternalMatch) {
    const tool = localeInternalMatch[2];
    const rest = localeInternalMatch[3] ?? "";

    return NextResponse.redirect(
      new URL(`/${tool}${rest}`, request.url)
    );
  }

  // Step 3：Protected routes
  //
  // Authentication is handled by the protected route itself.
  // We intentionally do not use auth() / getToken() here because
  // the current auth flow previously caused login redirect loops.
  const isProtected = protectedPatterns.some((p) => p.test(pathname));

  if (isProtected) {
    // exec / portal / ticket / staff are internal routes
    // and should not be processed by next-intl.
    if (NO_I18N_PREFIXES.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }

    return handleI18nRouting(request);
  }

  // Step 4：所有其他一般網站頁面 → Fall 2026 Event
  const eventUrl = new URL(EVENT_PATH, request.url);

  return NextResponse.redirect(eventUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};