/**
 * proxy.ts — Next.js 16 Edge Proxy
 *
 * Public visitors: the whole public website (with language routing), the
 * Fall 2026 event page, login / unauthorized pages and ticket pages.
 *
 * Protected routes still require authentication:
 * - member
 * - portal
 *
 * The old /admin and /exec pages forward to the portal (legacy-paths.ts).
 */

import { type NextRequest, NextResponse } from "next/server";
import createNextIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { portalPathFor } from "@/lib/portal/legacy-paths";

/** next-intl 語言路由 handler */
const handleI18nRouting = createNextIntlMiddleware(routing);

/** 需要登入才能訪問的路徑 */
const protectedPatterns = [
  /^\/(zh|en)\/member(\/|$)/,
  /^\/(zh|en)\/portal(\/|$)/,
  /^\/member(\/|$)/,
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

  /^\/order(\/|$)/,

  /^\/e(\/|$)/,

  /^\/staff(\/|$)/,
];

/** 不需要 i18n locale 前綴的內部路徑 */
const NO_I18N_PREFIXES = [
  /^\/portal(\/|$)/,
  /^\/ticket(\/|$)/,
  /^\/order(\/|$)/,
  /^\/e(\/|$)/,
  /^\/staff(\/|$)/,
];


export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Step 0: the old /admin and /exec pages moved into the portal.
  const moved = portalPathFor(pathname);
  if (moved) return NextResponse.redirect(new URL(moved, request.url));

  // Step 1：公開白名單路徑直接放行
  if (publicPatterns.some((p) => p.test(pathname))) {
    if (NO_I18N_PREFIXES.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }

    return handleI18nRouting(request);
  }

  // Step 2：portal locale prefix → 移除 locale
  const localeInternalMatch = pathname.match(
    /^\/(zh|en)\/(portal)(\/.*)?$/
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
    // portal / ticket / staff are internal routes
    // and should not be processed by next-intl.
    if (NO_I18N_PREFIXES.some((p) => p.test(pathname))) {
      return NextResponse.next();
    }

    return handleI18nRouting(request);
  }

  // Step 4: the public website (Home, Events, Members, Achievements, Sponsors,
  // Alumni, Contact) — language routing only. During Halloween 2026 ticket sales
  // these all forwarded to the Halloween page; that ended after the event.
  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};