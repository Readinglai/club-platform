import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * GET /api/portal/announcements
 *
 * 回傳已發布的公告列表，並為每則公告附上當前使用者的已讀狀態（isRead）。
 * isRead: true  → AnnouncementRead 表中存在對應記錄
 * isRead: false → 尚未標記已讀
 *
 * 同時將 createdAt 映射為 publishedAt，符合 App 端介面定義。
 */
export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const announcements = await db.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: {
        select: { id: true, name: true },
      },
      reads: {
        where: { userId: guard.userId },
        select: { id: true },
      },
    },
  });

  const result = announcements.map(({ reads, createdAt, ...ann }) => ({
    ...ann,
    publishedAt: createdAt,
    isRead: reads.length > 0,
  }));

  return NextResponse.json(result);
}
