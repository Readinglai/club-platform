# API baseline inventory

Snapshot: 2026-11-02 (updated after unused-code cleanup). Scope: `club-platform` only. This is a source inventory, not an API redesign or a verified contract specification.

Each row lists exported methods and direct identity/permission-related calls found in the handler. These are navigation hints: delegated permission checks and inline credential checks require reading the linked source. “Review source” does not mean public or unprotected. Response bodies, status codes, side effects, and external callers must be characterized before changing an endpoint.

Local callers below are candidates found by matching the route prefix before its first dynamic segment in source files outside API handlers. Dynamic URLs can be missed and prefix matches can overmatch. No local match is not evidence of an unused endpoint.

| Endpoint | Exports | Direct guard calls / review | Candidate local callers | Handler |
|---|---|---|---|---|
| `/api/achievements` | GET | Review source / delegated or inline checks | `src/app/[locale]/achievements/page.tsx` | [source](../src/app/api/achievements/route.ts) |
| `/api/admin/achievements/[id]` | GET, PATCH, DELETE | requirePermissionJson | `src/app/portal/website/achievements/AchievementsManager.tsx`<br>`src/app/portal/website/achievements/[id]/AchievementEditForm.tsx` | [source](../src/app/api/admin/achievements/[id]/route.ts) |
| `/api/admin/achievements` | GET, POST | requirePermissionJson | `src/app/portal/website/achievements/AchievementsManager.tsx`<br>`src/app/portal/website/achievements/[id]/AchievementEditForm.tsx` | [source](../src/app/api/admin/achievements/route.ts) |
| `/api/admin/alumni/[id]` | PATCH, DELETE | requirePermissionJson | `src/app/portal/website/alumni/AlumniManager.tsx` | [source](../src/app/api/admin/alumni/[id]/route.ts) |
| `/api/admin/alumni` | GET, POST | requirePermissionJson | `src/app/portal/website/alumni/AlumniManager.tsx` | [source](../src/app/api/admin/alumni/route.ts) |
| `/api/admin/email-templates/[key]` | PATCH | requirePermissionJson | `src/app/portal/website/settings/SiteConfigManager.tsx` | [source](../src/app/api/admin/email-templates/[key]/route.ts) |
| `/api/admin/email-templates` | GET | requirePermissionJson | `src/app/portal/website/settings/SiteConfigManager.tsx` | [source](../src/app/api/admin/email-templates/route.ts) |
| `/api/admin/feature-flags/[key]` | PATCH | requirePermissionJson | `src/app/portal/website/settings/SiteConfigManager.tsx` | [source](../src/app/api/admin/feature-flags/[key]/route.ts) |
| `/api/admin/feature-flags` | GET | requirePermissionJson | `src/app/portal/website/settings/SiteConfigManager.tsx` | [source](../src/app/api/admin/feature-flags/route.ts) |
| `/api/admin/i18n` | GET, PATCH | requirePermissionJson | `src/app/portal/website/text/I18nEditor.tsx` | [source](../src/app/api/admin/i18n/route.ts) |
| `/api/admin/site-config` | GET, PATCH | requirePermissionJson | `src/app/[locale]/page.tsx`<br>`src/app/portal/website/settings/SiteConfigManager.tsx`<br>`src/app/portal/website/settings/SiteConfigForm.tsx`<br>`src/app/portal/website/settings/TeamContactsEditor.tsx` | [source](../src/app/api/admin/site-config/route.ts) |
| `/api/admin/upload` | POST | requirePermissionJson | `src/components/admin/ImageUpload.tsx` | [source](../src/app/api/admin/upload/route.ts) |
| `/api/alumni` | GET | Review source / delegated or inline checks | `src/app/[locale]/alumni/page.tsx` | [source](../src/app/api/alumni/route.ts) |
| `/api/announcements/[id]/publish` | PATCH | auth | `src/app/portal/announcements/manage/AnnouncementForm.tsx`<br>`src/app/portal/announcements/manage/AnnouncementsManager.tsx`<br>`src/app/portal/announcements/[id]/MarkReadOnMount.tsx` | [source](../src/app/api/announcements/[id]/publish/route.ts) |
| `/api/announcements/[id]/read` | POST | auth | `src/app/portal/announcements/manage/AnnouncementForm.tsx`<br>`src/app/portal/announcements/manage/AnnouncementsManager.tsx`<br>`src/app/portal/announcements/[id]/MarkReadOnMount.tsx` | [source](../src/app/api/announcements/[id]/read/route.ts) |
| `/api/announcements/[id]` | GET, PUT, DELETE | auth | `src/app/portal/announcements/manage/AnnouncementForm.tsx`<br>`src/app/portal/announcements/manage/AnnouncementsManager.tsx`<br>`src/app/portal/announcements/[id]/MarkReadOnMount.tsx` | [source](../src/app/api/announcements/[id]/route.ts) |
| `/api/announcements` | GET, POST | auth | `src/app/portal/announcements/manage/AnnouncementForm.tsx`<br>`src/app/portal/announcements/manage/AnnouncementsManager.tsx`<br>`src/app/portal/announcements/[id]/MarkReadOnMount.tsx` | [source](../src/app/api/announcements/route.ts) |
| `/api/auth/[...nextauth]` | Review source | Review source / delegated or inline checks | `src/lib/auth.ts`<br>`src/app/(public)/login/page.tsx`<br>`src/app/[locale]/login/page.tsx` | [source](../src/app/api/auth/[...nextauth]/route.ts) |
| `/api/auth/post-login` | GET | auth | `src/lib/auth.ts`<br>`src/app/(public)/login/page.tsx`<br>`src/app/[locale]/login/page.tsx` | [source](../src/app/api/auth/post-login/route.ts) |
| `/api/club/events/[id]/memories` | PUT | requirePermissionJson | `src/app/portal/website/memories/[eventId]/MemoriesEditor.tsx` | [source](../src/app/api/club/events/[id]/memories/route.ts) |
| `/api/club/members/[id]` | GET | forbidUnless, getCurrentUser | `src/app/portal/members/MembersManager.tsx` | [source](../src/app/api/club/members/[id]/route.ts) |
| `/api/club/members/complimentary` | POST | getCurrentUser | `src/app/portal/members/MembersManager.tsx` | [source](../src/app/api/club/members/complimentary/route.ts) |
| `/api/club/members/import` | POST | getCurrentUser | `src/app/portal/members/MembersManager.tsx` | [source](../src/app/api/club/members/import/route.ts) |
| `/api/club/members` | GET, POST | forbidUnless, getCurrentUser | `src/app/portal/members/MembersManager.tsx` | [source](../src/app/api/club/members/route.ts) |
| `/api/club/reports` | GET | requirePermissionJson | `src/app/portal/reports/page.tsx` | [source](../src/app/api/club/reports/route.ts) |
| `/api/club/team-page` | GET, PUT | requirePermissionJson | `src/app/portal/website/team/TeamPageEditor.tsx` | [source](../src/app/api/club/team-page/route.ts) |
| `/api/contact` | POST | Review source / delegated or inline checks | Not identified by prefix scan (unused ContactForm removed) | [source](../src/app/api/contact/route.ts) |
| `/api/cron/budget-sync` | GET | Review source / delegated or inline checks | Not identified by prefix scan | [source](../src/app/api/cron/budget-sync/route.ts) |
| `/api/event/check-in` | POST | Review source / delegated or inline checks | `src/app/staff/check-in/page.tsx` | [source](../src/app/api/event/check-in/route.ts) |
| `/api/event/checkout` | POST | Review source / delegated or inline checks | `src/lib/ticketing/orders.ts`<br>`src/app/[locale]/event/fall-2026/page.tsx` | [source](../src/app/api/event/checkout/route.ts) |
| `/api/event/fall-2026/verify-member` | POST | Review source / delegated or inline checks | Not identified by prefix scan | [source](../src/app/api/event/fall-2026/verify-member/route.ts) |
| `/api/event/member-verify` | POST | Review source / delegated or inline checks | `src/app/[locale]/event/fall-2026/page.tsx` | [source](../src/app/api/event/member-verify/route.ts) |
| `/api/event/ticket/[token]` | GET | Review source / delegated or inline checks | `src/app/ticket/[token]/page.tsx` | [source](../src/app/api/event/ticket/[token]/route.ts) |
| `/api/events/[id]/orders` | POST | auth | `src/app/[locale]/page.tsx`<br>`src/app/e/[id]/EventTickets.tsx` | [source](../src/app/api/events/[id]/orders/route.ts) |
| `/api/events/[id]/register` | POST, DELETE | auth | `src/app/[locale]/page.tsx`<br>`src/app/e/[id]/EventTickets.tsx` | [source](../src/app/api/events/[id]/register/route.ts) |
| `/api/events/[id]` | GET | auth | `src/app/[locale]/page.tsx`<br>`src/app/e/[id]/EventTickets.tsx` | [source](../src/app/api/events/[id]/route.ts) |
| `/api/events` | GET | Review source / delegated or inline checks | `src/app/[locale]/page.tsx`<br>`src/app/e/[id]/EventTickets.tsx` | [source](../src/app/api/events/route.ts) |
| `/api/finance/events/[id]` | GET | getCurrentUser | `src/app/portal/finance/events/[id]/EventReport.tsx` | [source](../src/app/api/finance/events/[id]/route.ts) |
| `/api/finance/events/[id]/sheet` | POST | getCurrentUser | `src/app/portal/finance/events/[id]/EventReport.tsx` | [source](../src/app/api/finance/events/[id]/sheet/route.ts) |
| `/api/finance/events/[id]/sheet/sync` | POST | getCurrentUser | `src/app/portal/finance/events/[id]/EventReport.tsx` | [source](../src/app/api/finance/events/[id]/sheet/sync/route.ts) |
| `/api/finance/summary` | GET | can, getAccess, getCurrentUser | Not identified by prefix scan | [source](../src/app/api/finance/summary/route.ts) |
| `/api/manage/events/[id]/dashboard` | GET | getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/[id]/dashboard/route.ts) |
| `/api/manage/events/[id]/publish` | POST | getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/[id]/publish/route.ts) |
| `/api/manage/events/[id]` | GET, PATCH, DELETE | getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/[id]/route.ts) |
| `/api/manage/events/[id]/ticket-types/[typeId]` | PATCH | getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/[id]/ticket-types/[typeId]/route.ts) |
| `/api/manage/events/[id]/ticket-types` | POST | getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/[id]/ticket-types/route.ts) |
| `/api/manage/events` | GET, POST | can, getAccess, getCurrentUser | `src/app/portal/events/EventsList.tsx`<br>`src/app/portal/events/[id]/EventEditor.tsx`<br>`src/app/portal/events/[id]/dashboard/LiveDashboard.tsx` | [source](../src/app/api/manage/events/route.ts) |
| `/api/me/membership/checkout` | POST | getCurrentUser | `src/app/portal/membership/MembershipPanel.tsx` | [source](../src/app/api/me/membership/checkout/route.ts) |
| `/api/me/membership` | GET | getCurrentUser | `src/app/portal/membership/MembershipPanel.tsx` | [source](../src/app/api/me/membership/route.ts) |
| `/api/me/profile` | GET, PUT | getCurrentUser | `src/app/portal/complete-profile/CompleteProfileForm.tsx` | [source](../src/app/api/me/profile/route.ts) |
| `/api/me/tickets` | GET | getCurrentUser | Not identified by prefix scan | [source](../src/app/api/me/tickets/route.ts) |
| `/api/members` | GET | Review source / delegated or inline checks | Not identified by prefix scan | [source](../src/app/api/members/route.ts) |
| `/api/orders/[id]` | GET | Review source / delegated or inline checks | `src/app/order/[id]/page.tsx` | [source](../src/app/api/orders/[id]/route.ts) |
| `/api/portal/announcements/[id]/read` | POST | auth | Not identified by prefix scan | [source](../src/app/api/portal/announcements/[id]/read/route.ts) |
| `/api/portal/announcements/[id]` | GET | requireUserJson | Not identified by prefix scan | [source](../src/app/api/portal/announcements/[id]/route.ts) |
| `/api/portal/announcements` | GET | requireUserJson | Not identified by prefix scan | [source](../src/app/api/portal/announcements/route.ts) |
| `/api/portal/profile` | GET, PATCH | auth, can, getAccess | Not identified by prefix scan | [source](../src/app/api/portal/profile/route.ts) |
| `/api/portal/push/subscribe` | POST | requireUserJson | Not identified by prefix scan | [source](../src/app/api/portal/push/subscribe/route.ts) |
| `/api/portal/push/unsubscribe` | DELETE | requireUserJson | Not identified by prefix scan | [source](../src/app/api/portal/push/unsubscribe/route.ts) |
| `/api/public/events/[id]` | GET | getCurrentUser | `src/app/e/[id]/EventTickets.tsx` | [source](../src/app/api/public/events/[id]/route.ts) |
| `/api/site-config` | GET | Review source / delegated or inline checks | `src/app/[locale]/page.tsx` | [source](../src/app/api/site-config/route.ts) |
| `/api/site-config/team-contacts` | GET | Review source / delegated or inline checks | Not identified by prefix scan | [source](../src/app/api/site-config/team-contacts/route.ts) |
| `/api/sponsors/[id]/history/[historyId]` | DELETE | requirePermissionJson | `src/app/[locale]/page.tsx`<br>`src/app/portal/website/sponsors/SponsorsTable.tsx`<br>`src/app/portal/website/sponsors/[id]/SponsorEditForm.tsx` | [source](../src/app/api/sponsors/[id]/history/[historyId]/route.ts) |
| `/api/sponsors/[id]/history` | GET, POST | requirePermissionJson | `src/app/[locale]/page.tsx`<br>`src/app/portal/website/sponsors/SponsorsTable.tsx`<br>`src/app/portal/website/sponsors/[id]/SponsorEditForm.tsx` | [source](../src/app/api/sponsors/[id]/history/route.ts) |
| `/api/sponsors/[id]` | GET, PATCH, DELETE | requirePermissionJson | `src/app/[locale]/page.tsx`<br>`src/app/portal/website/sponsors/SponsorsTable.tsx`<br>`src/app/portal/website/sponsors/[id]/SponsorEditForm.tsx` | [source](../src/app/api/sponsors/[id]/route.ts) |
| `/api/sponsors` | GET, POST | requirePermissionJson | `src/app/[locale]/page.tsx`<br>`src/app/portal/website/sponsors/SponsorsTable.tsx`<br>`src/app/portal/website/sponsors/[id]/SponsorEditForm.tsx` | [source](../src/app/api/sponsors/route.ts) |
| `/api/staff/check-in/verify` | GET, POST | Review source / delegated or inline checks | `src/app/staff/check-in/page.tsx` | [source](../src/app/api/staff/check-in/verify/route.ts) |
| `/api/stripe/webhook` | POST | Review source / delegated or inline checks | Not identified by prefix scan | [source](../src/app/api/stripe/webhook/route.ts) |
| `/api/team/groups/[id]/archive` | POST | getCurrentUser | `src/app/portal/team/TeamManager.tsx` | [source](../src/app/api/team/groups/[id]/archive/route.ts) |
| `/api/team/groups` | POST | getCurrentUser | `src/app/portal/team/TeamManager.tsx` | [source](../src/app/api/team/groups/route.ts) |
| `/api/team/members/[id]` | DELETE | getCurrentUser | `src/app/portal/team/TeamManager.tsx` | [source](../src/app/api/team/members/[id]/route.ts) |
| `/api/team/members` | POST | getCurrentUser | `src/app/portal/team/TeamManager.tsx` | [source](../src/app/api/team/members/route.ts) |
| `/api/team` | GET | getAccess, getCurrentUser | `src/app/portal/team/TeamManager.tsx` | [source](../src/app/api/team/route.ts) |
| `/api/upload` | POST | requireUserJson | Not identified by prefix scan | [source](../src/app/api/upload/route.ts) |
| `/api/user/profile` | GET, PATCH | auth, can, getAccess | `src/app/[locale]/profile/ProfileForm.tsx` | [source](../src/app/api/user/profile/route.ts) |
