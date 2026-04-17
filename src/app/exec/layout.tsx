/**
 * exec/layout.tsx — 執委工具區 Layout
 *
 * 功能：驗證 role level >= 4（EXEC 或以上），不足則導向 /unauthorized
 * 所有 /exec/* 路由共用此 layout。
 */

import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Role } from "@/generated/prisma/client";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const NAV_ITEMS = [
  { href: "/exec/departments", label: "部門總覽" },
  { href: "/exec/task-groups", label: "任務小組" },
];

export default async function ExecLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[role] < 4) redirect("/unauthorized");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部導覽 */}
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ backgroundColor: PRIMARY, borderColor: `${SECONDARY}33` }}
      >
        <div className="flex items-center gap-6">
          <span
            className="text-sm font-bold tracking-widest"
            style={{ color: SECONDARY }}
          >
            ROCSAUT · 執委工具
          </span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ color: `${SECONDARY}cc` }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ backgroundColor: `${SECONDARY}22`, color: SECONDARY }}
          >
            {role}
          </span>
          <Link
            href="/portal/profile"
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: `${SECONDARY}88` }}
          >
            {session.user.name}
          </Link>
        </div>
      </header>

      {/* 主內容 */}
      <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
