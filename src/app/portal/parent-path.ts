/** Segments that are folders, not pages, so "back" skips over them. */
const NOT_A_PAGE = new Set(["/portal/finance/events", "/portal/tasks/groups"]);

/** The page one level up, e.g. /portal/finance/events/x → /portal/finance. */
export function parentPath(pathname: string) {
  let path = pathname.replace(/\/+$/, "");
  do {
    path = path.slice(0, path.lastIndexOf("/"));
  } while (NOT_A_PAGE.has(path));
  return path.startsWith("/portal") ? path : "/portal";
}
