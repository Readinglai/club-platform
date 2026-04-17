/**
 * admin/page.tsx — Admin 後台首頁
 *
 * 顯示歡迎訊息與快速統計：總成員數、本月活動數、未發布公告數。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [memberCount, monthlyEventCount, unpublishedAnnouncementCount] =
    await Promise.all([
      db.user.count(),
      db.event.count({
        where: { startAt: { gte: monthStart, lt: monthEnd } },
      }),
      db.announcement.count({ where: { published: false } }),
    ]);

  const stats = [
    { label: "總成員數", value: memberCount, unit: "人" },
    { label: "本月活動數", value: monthlyEventCount, unit: "場" },
    { label: "未發布公告", value: unpublishedAnnouncementCount, unit: "則" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: PRIMARY }}>
          歡迎回來，{session?.user?.name ?? "管理員"}
        </h1>
        <p className="text-sm text-gray-500">
          {now.toLocaleDateString("zh-TW", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border bg-white px-6 py-5 shadow-sm"
            style={{ borderColor: `${SECONDARY}44` }}
          >
            <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold" style={{ color: PRIMARY }}>
              {stat.value}
              <span className="text-sm font-normal text-gray-400 ml-1">
                {stat.unit}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* 快速入口 */}
      <div
        className="rounded-2xl border bg-white px-6 py-5"
        style={{ borderColor: `${SECONDARY}44` }}
      >
        <h2 className="text-sm font-semibold mb-3" style={{ color: PRIMARY }}>
          快速入口
        </h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/members", label: "管理成員" },
            { href: "/admin/events", label: "管理活動" },
            { href: "/admin/announcements", label: "管理公告" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
              style={{
                borderColor: `${PRIMARY}33`,
                color: PRIMARY,
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
