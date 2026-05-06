/**
 * DELETE /api/exec/task-groups/[id]
 * 刪除任務小組（需為創辦人或 ADMIN 以上）。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { requireAuthJson } from "@/lib/auth/guard";
import type { Role } from "@/generated/prisma/client";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  const isFounder = taskGroup.createdById === guard.userId;
  const isAdmin = ROLE_LEVEL[guard.role as Role] >= 4;

  if (!isFounder && !isAdmin) {
    return NextResponse.json({ error: "只有創辦人或管理員可以刪除小組" }, { status: 403 });
  }

  await db.taskGroup.delete({ where: { id: taskGroupId } });

  return new NextResponse(null, { status: 204 });
}
