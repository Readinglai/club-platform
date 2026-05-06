/**
 * /api/admin/announcements/[id]/publish
 *
 * 切換公告發布狀態（行動 App Admin，支援 Bearer token auth）
 *
 * PATCH — 切換 published 狀態（已發布→取消發布，草稿→發布），需要 EXEC（level 3）以上
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";
import { sendPushNotification } from "@/lib/webpush";

/** PATCH /api/admin/announcements/[id]/publish — 切換發布狀態 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  // Next.js 15：params 為 Promise，需先 await 解構
  const { id } = await params;

  try {
    // 取得目前狀態
    const current = await db.announcement.findUnique({
      where: { id },
      select: { published: true },
    });

    if (!current) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    // 切換 published 狀態
    const announcement = await db.announcement.update({
      where: { id },
      data: { published: !current.published },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
      },
    });

    // 發布時推播給所有有 expoToken 的訂閱者
    if (announcement.published) {
      const subscriptions = await db.pushSubscription.findMany();
      console.log("[PUSH DEBUG] published value:", announcement.published, "subscriptions count:", subscriptions.length);
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          sendPushNotification(sub, {
            title: "新公告",
            body: announcement.title,
            url: "/portal/announcements",
            data: { type: "announcement", announcementId: announcement.id },
          })
        )
      );
      console.log("[PUSH DEBUG] push sent result:", results);
    }

    return NextResponse.json({
      ...announcement,
      isPublished: announcement.published,
    });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
