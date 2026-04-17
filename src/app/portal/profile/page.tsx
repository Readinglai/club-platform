/**
 * portal/profile/page.tsx — 個人資料頁（Server Component）
 *
 * 功能：顯示當前登入使用者的個人資料
 * 顯示欄位：大頭貼、姓名、Email、角色、所屬 team、加入日期
 * 驗證：未登入導向 /login
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

/** 角色顯示名稱對照 */
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "超級管理員",
  EXEC: "執行委員",
  TEAM_LEAD: "組長",
  MEMBER: "一般成員",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      team: { select: { name: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const joinDate = user.createdAt.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section
        className="px-4 py-12"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            Portal
          </p>
          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>
            個人資料
          </h1>
        </div>
      </section>

      {/* 主內容 */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl bg-white shadow-sm p-8"
          style={{ border: "1px solid #e5e7eb" }}
        >
          {/* 大頭貼 + 姓名 */}
          <div className="flex items-center gap-5 mb-8">
            <div
              className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: PRIMARY }}
              >
                {user.name}
              </h2>
              <span
                className="inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}
              >
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {/* 資料欄位 */}
          <dl className="flex flex-col gap-5">
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="所屬部門"
              value={user.team?.name ?? "尚未分配"}
            />
            <InfoRow label="加入日期" value={joinDate} />
          </dl>

          {/* 分隔線 */}
          <div
            className="my-8 w-full h-px"
            style={{ backgroundColor: "#f0f0f0" }}
          />

          {/* 操作按鈕 */}
          <Link
            href="/portal/profile/edit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            編輯資料
          </Link>
        </div>
      </div>
    </div>
  );
}

/** 單一資料列（標籤 + 值） */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt
        className="text-xs uppercase tracking-wide"
        style={{ color: "#9ca3af" }}
      >
        {label}
      </dt>
      <dd className="text-sm font-medium" style={{ color: "#374151" }}>
        {value}
      </dd>
    </div>
  );
}
