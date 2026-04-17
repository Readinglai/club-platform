/**
 * portal/announcements/[id]/page.tsx — 公告詳情頁
 *
 * 功能：顯示單一公告完整內容，進入頁面時自動標記已讀
 * 顯示欄位：標題、作者、發布時間、完整內容
 * 驗證：未登入導向 /login；公告不存在回傳 404
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { MarkReadOnMount } from "./MarkReadOnMount";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AnnouncementDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
      reads: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!announcement) {
    notFound();
  }

  const isRead = announcement.reads.length > 0;

  const date = announcement.createdAt.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 進入頁面時自動標記已讀（Client Component） */}
      {!isRead && <MarkReadOnMount announcementId={id} />}

      {/* 頂部 Banner */}
      <section className="px-4 py-12" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto">
          {/* 麵包屑 */}
          <nav className="flex items-center gap-2 text-xs mb-4">
            <Link
              href="/portal/announcements"
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              公告
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span
              style={{ color: `${SECONDARY}77` }}
              className="truncate max-w-xs"
            >
              {announcement.title}
            </span>
          </nav>

          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>
            {announcement.title}
          </h1>
        </div>
      </section>

      {/* 主內容 */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl bg-white shadow-sm p-8"
          style={{ border: "1px solid #e5e7eb" }}
        >
          {/* 作者 + 日期 + 已讀狀態 */}
          <div className="flex items-center justify-between gap-3 mb-6 pb-6 border-b" style={{ borderColor: "#f3f4f6" }}>
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              {announcement.author.name} · {date}
            </p>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full"
              style={
                isRead
                  ? { backgroundColor: "#f3f4f6", color: "#9ca3af" }
                  : { backgroundColor: `${PRIMARY}15`, color: PRIMARY }
              }
            >
              {isRead ? "已讀" : "未讀"}
            </span>
          </div>

          {/* 公告內容（依 \n\n 分段） */}
          <div className="flex flex-col gap-4">
            {announcement.content
              .split("\n\n")
              .map((para, idx) => (
                <p
                  key={idx}
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "#374151" }}
                >
                  {para.trim()}
                </p>
              ))}
          </div>

          {/* 返回按鈕 */}
          <div className="mt-8 pt-6 border-t" style={{ borderColor: "#f3f4f6" }}>
            <Link
              href="/portal/announcements"
              className="inline-flex items-center gap-2 text-sm font-medium transition-all hover:opacity-70"
              style={{ color: PRIMARY }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              返回公告列表
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
