/**
 * route.ts — 公告已讀標記 API
 *
 * 功能：將指定公告標記為已讀（upsert，避免重複記錄）
 * 輸入：URL [id] 參數（公告 ID）；無 body
 * 輸出：{ success: true }
 * 驗證：未登入回傳 401；公告不存在或未發布回傳 404
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/** POST /api/announcements/[id]/read — 標記公告為已讀 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: announcementId } = await params;

  // 確認公告存在且已發布
  const announcement = await db.announcement.findUnique({
    where: { id: announcementId, published: true },
    select: { id: true },
  });

  if (!announcement) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }

  // upsert 避免重複建立已讀記錄
  await db.announcementRead.upsert({
    where: {
      announcementId_userId: {
        announcementId,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      announcementId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
