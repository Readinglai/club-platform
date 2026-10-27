/**
 * Checks that old /admin and /exec addresses forward to the right portal page.
 *
 *   npx tsx scripts/test-legacy-paths.ts
 */
import { portalPathFor } from "../src/lib/portal/legacy-paths";

const cases: Array<[string, string | null]> = [
  ["/admin", "/portal"],
  ["/zh/admin", "/portal"],
  ["/en/admin/", "/portal"],
  ["/zh/admin/announcements", "/portal/announcements/manage"],
  ["/admin/announcements/new", "/portal/announcements/manage/new"],
  ["/zh/admin/announcements/abc123", "/portal/announcements/manage/abc123"],
  ["/zh/admin/members", "/portal/members"],
  ["/zh/admin/members/u1", "/portal/members"],
  ["/zh/admin/members/import", "/portal/members"],
  ["/zh/admin/events", "/portal/events"],
  ["/zh/admin/events/new", "/portal/events"],
  ["/zh/admin/events/ev1", "/portal/events/ev1"],
  ["/zh/admin/finance", "/portal/finance"],
  ["/zh/admin/departments/events", "/portal/team"],
  ["/zh/admin/task-groups/t1", "/portal"],
  ["/zh/admin/sponsors", "/portal/website/sponsors"],
  ["/zh/admin/sponsors/s1", "/portal/website/sponsors/s1"],
  ["/zh/admin/achievements/a1", "/portal/website/achievements/a1"],
  ["/zh/admin/alumni", "/portal/website/alumni"],
  ["/zh/admin/site-config", "/portal/website/settings"],
  ["/zh/admin/i18n", "/portal/website/text"],
  ["/zh/admin/reports", "/portal/reports"],
  ["/zh/admin/something-old", "/portal"],
  ["/exec", "/portal"],
  ["/zh/exec/departments/social", "/portal/team"],
  ["/exec/task-groups", "/portal"],
  ["/exec/anything", "/portal"],
  ["/portal/members", null],
  ["/zh/administration", null],
  ["/zh/event/fall-2026", null],
  ["/api/admin/upload", null],
];

let failed = 0;
for (const [from, expected] of cases) {
  const got = portalPathFor(from);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${from} → ${got}${ok ? "" : ` (expected ${expected})`}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exitCode = failed ? 1 : 0;
