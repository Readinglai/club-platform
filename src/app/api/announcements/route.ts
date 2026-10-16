/**
 * route.ts — 公告列表 API
 *
 * 功能：取得所有已發布公告的摘要列表
 * 輸入：無 body（從 session 識別當前使用者）
 * 輸出：AnnouncementSummary[] — 依 createdAt 降冪排列
 *   每筆包含：id, title, createdAt, author.name, isRead（當前使用者是否已讀）
 * 驗證：未登入回傳 401
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAnnouncement } from "@/lib/announcements/manage";

/** GET /api/announcements — 取得已發布公告列表 */
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const announcements = await db.announcement.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
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

  // 將 reads 陣列轉換為 isRead boolean
  const result = announcements.map(({ reads, ...ann }) => ({
    ...ann,
    isRead: reads.length > 0,
  }));

  return NextResponse.json(result);
}

/** POST /api/announcements — 建立公告（VP 以上，見 announcements.manage） */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await createAnnouncement(session.user.id, body);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json(result.value, { status: 201 });
}
