/**
 * (admin)/layout.tsx — Admin 後台 Layout
 *
 * 驗證 role level >= 4（EXEC 或以上），不足則 redirect（由 requireAuth 處理）。
 * 渲染左側 Sidebar + 右側 children 的兩欄 layout。
 */

import { requireAuth } from "@/lib/auth/guard";
import { auth } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireAuth(4);
  // requireAuth 通過後 session 必然存在，再次取得以讀取 name/email
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f9f7f4" }}>
      <AdminSidebar
        userName={userName}
        userRole={role}
      />
      <main className="flex-1 px-8 py-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
