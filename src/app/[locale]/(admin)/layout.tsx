/**
 * (admin)/layout.tsx — Admin 後台 Layout
 *
 * 驗證 role level >= 3（MEMBER_PLUS）以上，不足則 redirect（由 requireAuth 處理）。
 * 渲染左側 Sidebar + 右側 children 的兩欄 layout。
 *
 * 必須呼叫 setRequestLocale(locale)，讓 next-intl 的 getTranslations()
 * 在所有子層 Server Component 都能讀到正確的語言。
 */

import { setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth/guard";
import { auth } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // 取得 locale 並設定，讓子層 getTranslations() 讀到正確語言
  const { locale } = await params;
  setRequestLocale(locale);

  const { role, level } = await requireAuth(3);
  // requireAuth 通過後 session 必然存在，再次取得以讀取 name/email
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f9f7f4" }}>
      <AdminSidebar
        userName={userName}
        userRole={role}
        userLevel={level}
      />
      <main className="flex-1 px-8 py-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
