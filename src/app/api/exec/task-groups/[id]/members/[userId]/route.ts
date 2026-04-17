/**
 * route.ts — 任務小組成員移除 API
 *
 * 功能：從任務小組移除指定成員
 * 輸入：URL [id] 任務小組 ID、[userId] 成員 ID
 * 輸出：204 No Content
 * 驗證：role level >= 4 且必須是小組建立者
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 4) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id: taskGroupId, userId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  if (taskGroup.createdById !== session.user.id) {
    return NextResponse.json({ error: "只有建立者可以管理成員" }, { status: 403 });
  }

  // 不允許移除建立者自己
  if (userId === session.user.id) {
    return NextResponse.json({ error: "不能移除小組建立者" }, { status: 400 });
  }

  const existing = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "該使用者不是小組成員" }, { status: 404 });
  }

  await db.taskGroupMember.delete({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });

  return new NextResponse(null, { status: 204 });
}
