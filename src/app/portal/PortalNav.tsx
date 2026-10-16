"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY = "#1a2744";

/** Segments that are folders, not pages, so "back" skips over them. */
const NOT_A_PAGE = new Set(["/portal/finance/events"]);

/** The page one level up, e.g. /portal/finance/events/x → /portal/finance. */
export function parentPath(pathname: string) {
  let path = pathname.replace(/\/+$/, "");
  do {
    path = path.slice(0, path.lastIndexOf("/"));
  } while (NOT_A_PAGE.has(path));
  return path.startsWith("/portal") ? path : "/portal";
}

/** Top bar on every portal page: back one level, and home. */
export default function PortalNav() {
  const pathname = usePathname();
  const atHome = pathname === "/portal";

  return (
    <nav
      aria-label="Portal"
      className="sticky top-0 z-10 border-b px-4 py-2.5"
      style={{ backgroundColor: "#f9f7f4", borderColor: "#e5e4df" }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between text-sm">
        {atHome ? (
          <span className="font-semibold" style={{ color: PRIMARY }}>ROCSAUT Portal</span>
        ) : (
          <Link href={parentPath(pathname)} className="font-medium hover:underline" style={{ color: PRIMARY }}>
            ← Back 返回
          </Link>
        )}
        {!atHome && (
          <Link href="/portal" className="text-gray-600 hover:underline">
            Portal home 首頁
          </Link>
        )}
      </div>
    </nav>
  );
}
