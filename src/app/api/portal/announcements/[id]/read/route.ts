/**
 * route.ts — 公告已讀標記 API（Portal 版本）
 *
 * 功能：將指定公告標記為已讀（upsert，避免重複記錄）
 * 輸入：URL [id] 參數（公告 ID）；無 body
 * 輸出：{ success: true }
 * 驗證：未登入回傳 401；公告不存在或未發布回傳 404
 *
 * 此端點為 /api/announcements/[id]/read 的 portal 版本，
 * 供行動 App 使用（支援 Authorization: Bearer token）。
 * 業務邏輯與原版相同。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

/**
 * 嘗試取得已登入使用者的 ID
 * 先嘗試 cookie session，再嘗試 Bearer token
 */
async function tryGetUserId(request: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: "authjs.session-token",
      });
      if (decoded?.sub) return decoded.sub;
    } catch {
      // token 無效，忽略
    }
  }

  return null;
}

/** POST /api/portal/announcements/[id]/read — 標記公告為已讀 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await tryGetUserId(request);
  if (!userId) {
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
        userId,
      },
    },
    update: {},
    create: {
      announcementId,
      userId,
    },
  });

  return NextResponse.json({ success: true });
}
