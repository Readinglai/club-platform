/**
 * route.ts — 任務小組狀態更新 API
 *
 * 功能：更新任務小組狀態（ACTIVE / COMPLETED / ARCHIVED）
 * 輸入：URL [id] 任務小組 ID；body: { status: "ACTIVE" | "COMPLETED" | "ARCHIVED" }
 * 輸出：更新後的 TaskGroup 物件
 * 驗證：role level >= 4 且必須是小組建立者
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 3) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id: taskGroupId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  if (taskGroup.createdById !== session.user.id) {
    return NextResponse.json({ error: "只有建立者可以更新狀態" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { status } = body as { status?: unknown };
  if (status !== "ACTIVE" && status !== "COMPLETED" && status !== "ARCHIVED") {
    return NextResponse.json(
      { error: "status 必須為 ACTIVE、COMPLETED 或 ARCHIVED" },
      { status: 400 }
    );
  }

  const updated = await db.taskGroup.update({
    where: { id: taskGroupId },
    data: { status: status as "ACTIVE" | "COMPLETED" | "ARCHIVED" },
    include: {
      createdBy: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(updated);
}
