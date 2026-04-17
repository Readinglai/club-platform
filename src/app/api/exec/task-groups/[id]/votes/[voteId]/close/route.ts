/**
 * PATCH /api/exec/task-groups/[id]/votes/[voteId]/close
 * 關閉投票（設 closedAt = now）。只有建立者可操作。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId, voteId } = await params;

  const vote = await db.vote.findUnique({
    where: { id: voteId },
    select: { id: true, taskGroupId: true, createdById: true, closedAt: true },
  });

  if (!vote || vote.taskGroupId !== taskGroupId) {
    return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  }

  if (vote.createdById !== session.user.id) {
    return NextResponse.json({ error: "只有建立者可以關閉投票" }, { status: 403 });
  }

  if (vote.closedAt && vote.closedAt <= new Date()) {
    return NextResponse.json({ error: "此投票已關閉" }, { status: 400 });
  }

  const updated = await db.vote.update({
    where: { id: voteId },
    data: { closedAt: new Date() },
    include: {
      createdBy: { select: { id: true, name: true } },
      options: { include: { _count: { select: { responses: true } } } },
    },
  });

  return NextResponse.json(updated);
}
