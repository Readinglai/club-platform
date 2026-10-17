/**
 * Where the retired /admin and /exec pages now live in the portal, so old
 * bookmarks and links keep working. Used by src/proxy.ts.
 */

const ID = "([^/]+)";

/** Checked in order; the first match wins. `$1` is the captured id. */
const ADMIN: Array<[RegExp, string]> = [
  [/^\/announcements\/new\/?$/, "/portal/announcements/manage/new"],
  [new RegExp(`^/announcements/${ID}/?$`), "/portal/announcements/manage/$1"],
  [/^\/announcements(\/|$)/, "/portal/announcements/manage"],
  [/^\/members(\/|$)/, "/portal/members"],
  [/^\/events\/new\/?$/, "/portal/events"],
  [new RegExp(`^/events/${ID}/?$`), "/portal/events/$1"],
  [/^\/events(\/|$)/, "/portal/events"],
  [/^\/finance(\/|$)/, "/portal/finance"],
  [/^\/departments(\/|$)/, "/portal/team"],
  [/^\/task-groups(\/|$)/, "/portal/tasks"],
  [new RegExp(`^/sponsors/${ID}/?$`), "/portal/website/sponsors/$1"],
  [/^\/sponsors(\/|$)/, "/portal/website/sponsors"],
  [new RegExp(`^/achievements/${ID}/?$`), "/portal/website/achievements/$1"],
  [/^\/achievements(\/|$)/, "/portal/website/achievements"],
  [/^\/alumni(\/|$)/, "/portal/website/alumni"],
  [/^\/site-config(\/|$)/, "/portal/website/settings"],
  [/^\/i18n(\/|$)/, "/portal/website/text"],
  [/^\/reports(\/|$)/, "/portal/reports"],
];

const EXEC: Array<[RegExp, string]> = [
  [/^\/departments(\/|$)/, "/portal/team"],
  [/^\/task-groups(\/|$)/, "/portal/tasks"],
];

/** The portal path for an old /admin or /exec address (with or without /zh or /en), or null. */
export function portalPathFor(pathname: string): string | null {
  const match = pathname.match(/^(?:\/(?:zh|en))?\/(admin|exec)(\/.*)?$/);
  if (!match) return null;
  const rest = (match[2] ?? "").replace(/\/+$/, "");
  for (const [pattern, target] of match[1] === "admin" ? ADMIN : EXEC) {
    const m = rest.match(pattern);
    if (m) return target.replace("$1", m[1] ?? "");
  }
  return "/portal";
}
