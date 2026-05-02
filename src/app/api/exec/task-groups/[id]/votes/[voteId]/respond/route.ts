/**
 * POST /api/exec/task-groups/[id]/votes/[voteId]/respond
 * 投票（單選）。先刪除本人在此 Vote 的既有回應，再新增。
 * body: { voteOptionId: string } or { optionId: string }
 * 支援 Bearer token 認證。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId, voteId } = await params;

  const member = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId: guard.userId } },
  });
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const vote = await db.vote.findUnique({
    where: { id: voteId },
    include: { options: { select: { id: true } } },
  });

  if (!vote || vote.taskGroupId !== taskGroupId) {
    return NextResponse.json({ error: "投票不存在" }, { status: 404 });
  }

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { status: true },
  });
  if (taskGroup && taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法投票" }, { status: 403 });
  }

  if (vote.closedAt && vote.closedAt <= new Date()) {
    return NextResponse.json({ error: "此投票已關閉" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { voteOptionId, optionId } = body as { voteOptionId?: unknown; optionId?: unknown };
  const selectedOptionId = voteOptionId ?? optionId;
  if (typeof selectedOptionId !== "string") {
    return NextResponse.json({ error: "voteOptionId 為必填欄位" }, { status: 400 });
  }

  const validOptionIds = new Set(vote.options.map((o) => o.id));
  if (!validOptionIds.has(selectedOptionId)) {
    return NextResponse.json({ error: "選項不屬於此投票" }, { status: 400 });
  }

  await db.voteResponse.deleteMany({
    where: {
      userId: guard.userId,
      voteOption: { voteId },
    },
  });

  const response = await db.voteResponse.create({
    data: { voteOptionId: selectedOptionId, userId: guard.userId },
  });

  return NextResponse.json(response, { status: 201 });
}
