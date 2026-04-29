import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: [
    // Match locale-prefixed paths but exclude:
    // - API routes (/api/...)
    // - Next.js internals (/_next, /_vercel)
    // - Static files with extensions (favicon.ico, etc.)
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
