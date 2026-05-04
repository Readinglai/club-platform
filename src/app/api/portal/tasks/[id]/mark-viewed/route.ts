/**
 * PATCH /api/portal/tasks/[id]/mark-viewed
 *
 * 記錄使用者查看任務的時間戳記（upsert TaskView）。
 * 前端在進入任務詳情頁時呼叫，用於支援未讀 badge 歸零邏輯。
 *
 * 回傳：{ ok: true }
 * 最低權限：MEMBER (level 2)
 *
 * 注意：需要先執行 `npx prisma db push` 建立 TaskView 資料表。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  // 確認任務存在（不限制只能是自己的任務，群組成員都能 mark-viewed）
  const task = await db.task.findUnique({ where: { id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "任務不存在" }, { status: 404 });

  // Upsert：若已有記錄則更新時間，否則建立新記錄
  await db.taskView.upsert({
    where: { taskId_userId: { taskId: id, userId: guard.userId } },
    update: { viewedAt: new Date() },
    create: { taskId: id, userId: guard.userId },
  });

  return NextResponse.json({ ok: true });
}
