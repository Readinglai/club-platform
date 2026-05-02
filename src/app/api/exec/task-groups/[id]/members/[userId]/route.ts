/**
 * DELETE /api/exec/task-groups/[id]/members/[userId] — 移除小組成員
 */

import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { requireAuthJson } from "@/lib/auth/guard";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const userRole = guard.role as Role;
  if (ROLE_LEVEL[userRole] < 3) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id: taskGroupId, userId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true, status: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  if (taskGroup.createdById !== guard.userId) {
    return NextResponse.json({ error: "只有建立者可以管理成員" }, { status: 403 });
  }

  if (taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法修改" }, { status: 409 });
  }

  if (userId === guard.userId) {
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
