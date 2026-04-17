/**
 * portal/announcements/page.tsx — 公告列表頁（Server Component）
 *
 * 功能：顯示所有已發布公告的列表，含已讀/未讀標示
 * 顯示欄位：標題、作者、發布時間、已讀/未讀 badge
 * 驗證：未登入導向 /login
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const announcements = await db.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      author: { select: { name: true } },
      reads: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section className="px-4 py-12" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            Portal
          </p>
          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>
            公告
          </h1>
        </div>
      </section>

      {/* 列表 */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {announcements.length === 0 ? (
          <div
            className="rounded-2xl bg-white p-10 text-center shadow-sm"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <p style={{ color: "#9ca3af" }}>目前沒有公告</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {announcements.map((ann) => {
              const isRead = ann.reads.length > 0;
              const date = ann.createdAt.toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              return (
                <Link
                  key={ann.id}
                  href={`/portal/announcements/${ann.id}`}
                  className="block rounded-2xl bg-white p-5 shadow-sm transition-all hover:shadow-md"
                  style={{ border: "1px solid #e5e7eb" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      {/* 標題 */}
                      <h2
                        className="text-sm font-semibold truncate"
                        style={{ color: PRIMARY }}
                      >
                        {ann.title}
                      </h2>
                      {/* 作者 + 日期 */}
                      <p
                        className="text-xs"
                        style={{ color: "#9ca3af" }}
                      >
                        {ann.author.name} · {date}
                      </p>
                    </div>

                    {/* 已讀/未讀 Badge */}
                    <span
                      className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={
                        isRead
                          ? {
                              backgroundColor: "#f3f4f6",
                              color: "#9ca3af",
                            }
                          : {
                              backgroundColor: `${PRIMARY}15`,
                              color: PRIMARY,
                            }
                      }
                    >
                      {isRead ? "已讀" : "未讀"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
