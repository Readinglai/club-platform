/**
 * route.ts — 單一公告 API
 *
 * 功能：取得指定公告的完整內容
 * 輸入：URL [id] 參數（公告 ID）
 * 輸出：Announcement — 完整公告資料，含 isRead 欄位
 * 驗證：未登入回傳 401；公告不存在或未發布回傳 404
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/** GET /api/announcements/[id] — 取得單一公告完整內容 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: {
        select: { name: true },
      },
      reads: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!announcement) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }

  const { reads, ...rest } = announcement;
  return NextResponse.json({ ...rest, isRead: reads.length > 0 });
}
