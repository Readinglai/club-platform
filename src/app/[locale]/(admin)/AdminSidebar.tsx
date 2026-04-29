"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import { signOut } from "next-auth/react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface NavItem {
  slug: string;
  label: string;
  minLevel: number;
}

const NAV_ITEMS: NavItem[] = [
  { slug: "departments",   label: "部門總覽",   minLevel: 4 },
  { slug: "members",       label: "成員管理",   minLevel: 4 },
  { slug: "events",        label: "活動管理",   minLevel: 3 },
  { slug: "announcements", label: "公告管理",   minLevel: 3 },
  { slug: "task-groups",   label: "任務小組",   minLevel: 3 },
  { slug: "achievements",  label: "過往成果",   minLevel: 4 },
  { slug: "sponsors",      label: "贊助商管理", minLevel: 3 },
  { slug: "reports",       label: "數據報表",   minLevel: 4 },
  { slug: "site-config",   label: "網站設定",   minLevel: 4 },
];

interface Props {
  userName: string;
  userRole: string;
  userLevel: number;
}

export default function AdminSidebar({ userName, userRole, userLevel }: Props) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) ?? "zh";

  const visibleItems = NAV_ITEMS.filter((item) => userLevel >= item.minLevel);

  return (
    <aside
      className="w-56 shrink-0 min-h-screen flex flex-col border-r"
      style={{ backgroundColor: PRIMARY, borderColor: `${SECONDARY}22` }}
    >
      {/* Logo / 標題 */}
      <div className="px-5 py-4 border-b" style={{ borderColor: `${SECONDARY}22` }}>
        <Link href={`/${locale}/admin`} className="flex items-center gap-2">
          <Image src="/assets/logo.png" alt="ROCSAUT" width={28} height={28} className="object-contain" />
          <span className="text-xs font-bold tracking-widest" style={{ color: SECONDARY }}>
            ROCSAUT · 管理後台
          </span>
        </Link>
      </div>

      {/* 導覽連結 */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {visibleItems.map(({ slug, label }) => {
          const href = `/${locale}/admin/${slug}`;
          const isActive = pathname.includes(`/admin/${slug}`);
          return (
            <Link
              key={slug}
              href={href}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: isActive ? `${SECONDARY}22` : "transparent",
                color: isActive ? SECONDARY : `${SECONDARY}88`,
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 目前使用者資訊 + 登出 */}
      <div className="px-4 py-4 border-t text-xs" style={{ borderColor: `${SECONDARY}22` }}>
        <p className="font-semibold truncate" style={{ color: SECONDARY }}>
          {userName}
        </p>
        <p className="mt-0.5" style={{ color: `${SECONDARY}66` }}>
          {userRole}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 w-full text-left px-2 py-1.5 rounded text-xs transition-all hover:opacity-80"
          style={{ color: `${SECONDARY}88`, backgroundColor: `${SECONDARY}11` }}
        >
          登出
        </button>
      </div>
    </aside>
  );
}
