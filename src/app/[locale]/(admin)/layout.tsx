/**
 * (admin)/layout.tsx — Admin 後台 Layout
 *
 * 驗證 role level >= 4（EXEC 或以上），不足則導向 /unauthorized。
 * 渲染左側 Sidebar + 右側 children 的兩欄 layout。
 */

import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import type { Role } from "@/generated/prisma/client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[role] < 4) redirect("/unauthorized");

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f9f7f4" }}>
      <AdminSidebar
        userName={session.user.name ?? session.user.email ?? ""}
        userRole={role}
      />
      <main className="flex-1 px-8 py-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
