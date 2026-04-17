/**
 * dashboard/page.tsx — 會員儀表板（Server Component）
 *
 * 登入後的主頁面，顯示使用者基本資訊。
 * 透過 auth() 取得目前 session；未登入則導向 /login。
 *
 * 路由群組 (member) 不影響 URL，此頁面對應路徑為 /dashboard。
 * 主色調：#1a2744（深藍）、#c9b99a（米色）
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardPage() {
  /* 取得 JWT session（不查資料庫，直接從 cookie 解碼） */
  const session = await auth();

  /* 未登入 → 導向登入頁 */
  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role } = session.user;

  return (
    /* 全螢幕背景，使用主色深藍 */
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#1a2744" }}
    >
      {/* 頂部導覽列 */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#c9b99a33" }}
      >
        {/* 社團名稱 */}
        <span
          className="text-lg font-bold tracking-widest"
          style={{ color: "#c9b99a" }}
        >
          ROCSAUT
        </span>

        {/* 登出按鈕（Client Component） */}
        <SignOutButton />
      </header>

      {/* 主內容區 */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col gap-6">

          {/* 歡迎標題 */}
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: "#c9b99a" }}
            >
              歡迎回來
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#1a2744" }}
            >
              {name ?? "成員"}
            </h1>
          </div>

          {/* 分隔線 */}
          <div className="w-full h-px" style={{ backgroundColor: "#c9b99a" }} />

          {/* 使用者資訊 */}
          <dl className="flex flex-col gap-3">
            {/* Email */}
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="text-sm font-medium text-gray-700">{email}</dd>
            </div>

            {/* 角色 */}
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">角色</dt>
              <dd>
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#1a274415", color: "#1a2744" }}
                >
                  {role ?? "MEMBER"}
                </span>
              </dd>
            </div>
          </dl>

          {/* 分隔線 */}
          <div className="w-full h-px" style={{ backgroundColor: "#f0f0f0" }} />

          {/* 佔位說明（後續功能開發中） */}
          <p className="text-xs text-gray-400 text-center">
            更多功能即將推出，敬請期待。
          </p>
        </div>
      </main>
    </div>
  );
}
