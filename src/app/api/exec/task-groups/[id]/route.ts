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

  // 手動 cascade：依外鍵順序刪除子資料
  const votes = await db.vote.findMany({ where: { taskGroupId }, select: { id: true } });
  const voteIds = votes.map((v) => v.id);

  const voteOptions = await db.voteOption.findMany({
    where: { voteId: { in: voteIds } },
    select: { id: true },
  });
  const optionIds = voteOptions.map((o) => o.id);

  const discussions = await db.discussion.findMany({ where: { taskGroupId }, select: { id: true } });
  const discussionIds = discussions.map((d) => d.id);

  await db.$transaction([
    db.voteResponse.deleteMany({ where: { voteOptionId: { in: optionIds } } }),
    db.voteOption.deleteMany({ where: { voteId: { in: voteIds } } }),
    db.vote.deleteMany({ where: { taskGroupId } }),
    db.comment.deleteMany({ where: { discussionId: { in: discussionIds } } }),
    db.discussion.deleteMany({ where: { taskGroupId } }),
    db.taskView.deleteMany({ where: { task: { taskGroupId } } }),
    db.task.deleteMany({ where: { taskGroupId } }),
    db.taskGroupMember.deleteMany({ where: { taskGroupId } }),
    db.taskGroup.delete({ where: { id: taskGroupId } }),
  ]);

  return new NextResponse(null, { status: 204 });
}
