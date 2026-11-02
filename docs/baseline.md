# Behavior-preserving cleanup baseline

Recorded 2026-11-02 against commit `8c5a3e9`. Scope: club-platform only.

## Scope and preservation contract

This baseline documents the application and adds a typecheck command. Runtime source, dependencies, schema, routes, response formats, UI, pricing, permissions, redirects, emails and scheduled jobs are unchanged. The pre-existing package-lock.json modification belongs to the workspace and is excluded from this work.

Subsequent refactors must preserve current behavior, including quirks. Bug fixes, dependency upgrades, API redesign, database deletion and visual changes require separate changes. API adapters must retain existing status codes, messages and fields. Payment checks must compare database effects and external calls, not just responses.

## Architecture today

- `src/app/[locale]`: public localized pages. `src/app/portal`: member/staff pages. `staff`, `e`, `order`, `ticket`: specialized entry points.
- `src/app/api`: 75 route handlers; see [route inventory](api-inventory.md).
- `src/lib`: business logic plus authentication, access checks, database access and integrations. Server-rendered pages can call these directly; browser interactions use HTTP endpoints.
- `src/components`: shared UI; page-specific components also live beside pages.
- `src/proxy.ts`: routing, locale handling and legacy redirects. It explicitly delegates authentication to pages/routes; it does not authenticate requests itself.
- `src/lib/access`: current identity, group-based permissions and guards. Some endpoints still call `auth()` directly.
- `prisma`: schema, migrations and seed script. `src/generated/prisma`: generated client, not a manual-edit target.
- `messages` and `src/i18n`: translations and language handling. `vercel.json`: hosting and budget-sync cron.

## Local setup and command boundaries

The existing README documents npm install, Prisma generation and npm run dev. On a clean checkout, npm ci is the intended lockfile-based install; installation and a fresh bootstrap have not been verified in this baseline. Use a disposable development database for setup validation.

Next.js loads local environment files for the application. prisma.config.ts explicitly loads .env.local, then .env as fallback. Standalone scripts vary: some load dotenv themselves and others document --env-file=.env.local. Do not assume they inherit Next.js environment loading.

Commands available after dependencies and generated client are present:

```sh
npm run typecheck
npm run lint
npm run build
npm run dev
```

Typecheck is TypeScript static checking, not a build or a behavior test. It includes generated Next.js type files when present; a fresh-checkout check still needs verification. Build may evaluate server modules or require integrations; its success is not implied by typecheck.

## Environment names, not values

No private environment file was read for this baseline. Source and .env.example identify these integration settings:

| Area | Names |
|---|---|
| Database | DATABASE_URL; DIRECT_URL is documented in .env.example but prisma.config.ts currently selects DATABASE_URL |
| Authentication | NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| Email | EMAIL_USER, EMAIL_PASSWORD, CONTACT_TO_EMAIL |
| Stripe | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| Storage | SUPABASE_URL, SUPABASE_ANON_KEY; .env.example also documents STORAGE_URL |
| Sheets | GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY |
| Check-in / cron | STAFF_CHECKIN_CODE, CRON_SECRET |
| Push | VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT |
| Wallet passes | PASS2U_API_KEY, PASS2U_MODEL_ID |

This is a source-derived integration list, not a complete runtime configuration schema: the retained, currently unreferenced config.yaml loader supports environment interpolation. Existing .env.example omits several source-used settings; SHOPIFY_TOKEN and SHOPIFY_DOMAIN appear in the example but their use needs confirmation. No environment behavior is changed here.

## Reproducibility and compatibility findings

1. TicketHold SQL is referenced in reservation/checkout/webhook code. Its CREATE TABLE lives in scripts/create-ticket-hold-table.ts, not the searched schema/migrations. A clean database reconstruction is unverified. Do not run that utility against an existing database as part of baseline checks.
2. prisma.config.ts selects DATABASE_URL despite the example describing DIRECT_URL for migrations. Document the actual connection behavior before introducing test setup.
3. getCurrentUser reads web sessions; README claims Bearer token support and an /api/auth/token endpoint absent from the route inventory. Confirm external consumers before changing authentication or CORS.
4. /api/announcements and /api/portal/announcements differ in fields (createdAt versus publishedAt, content and author selection). Sharing implementation must preserve each contract.
5. Stripe webhook first dispatches order/membership flows, then executes legacy Halloween logic. Older ticket models and current Order/Ticket models coexist. Keep historical links and callback handling operational.
6. Existing tests can require fixture users/groups/events or mutate configuration. See [script inventory](script-inventory.md). There is no dedicated test database guard or unified test command established by this change.
7. Historical commit helpers reference missing target paths or machine-specific paths and fixed historical messages. Review these separately before removal.

## Verification record

- Before changes: tsc --noEmit --incremental false passed; eslint --quiet passed (warnings suppressed).
- Initial baseline: npm run typecheck passed; npm run lint reported 0 errors and 8 warnings.
- All relative links in docs resolve; the API inventory contains all 75 route handlers. Diff whitespace validation passes for this change with CRLF recognized; the pre-existing lockfile is excluded.
- Database scripts, migrations, seeds, production build, live checkout, SMTP and other external integrations were not executed. No database reproduction or runtime behavior claim is made.

## Next steps and completion gates

1. Testing foundation: establish a dedicated disposable database, reconcile migration prerequisites, pin a runner, port pure tests, make fixture setup independent, and characterize existing HTTP contracts. Complete when tests reproduce from a clean environment without normal application data.
2. Cleanup: correct documentation and remove only confirmed obsolete material. Preserve externally invoked entry points. Complete when every deletion has reference and purpose evidence.
3. Announcements pilot: extract shared queries/operations with existing endpoint adapters. Complete when before/after permissions, visibility, fields, errors and read-tracking effects match.
4. Repeat by feature; leave payments until retry, concurrency and side-effect tests exist. Database changes and API redesign remain outside behavior-preserving scope.

This baseline completes the source inventory and establishes static checks. It records rather than resolves the test/database bootstrap gaps; a fully reproducible environment is still outstanding.
