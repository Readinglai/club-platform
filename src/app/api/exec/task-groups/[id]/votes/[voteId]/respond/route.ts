/**
 * POST /api/exec/task-groups/[id]/votes/[voteId]/respond
 * 投票（單選）。先刪除本人在此 Vote 的既有回應，再新增。
 * body: { voteOptionId: string }
 * 驗證：session 是 TaskGroup 成員、voteOptionId 屬於此 Vote、投票尚未關閉。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; voteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId, voteId } = await params;

  const member = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId: session.user.id } },
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

  const { voteOptionId } = body as { voteOptionId?: unknown };
  if (typeof voteOptionId !== "string") {
    return NextResponse.json({ error: "voteOptionId 為必填欄位" }, { status: 400 });
  }

  const validOptionIds = new Set(vote.options.map((o) => o.id));
  if (!validOptionIds.has(voteOptionId)) {
    return NextResponse.json({ error: "選項不屬於此投票" }, { status: 400 });
  }

  // 刪除此 user 在此 vote 的所有既有回應，再新增（實現單選換票）
  await db.voteResponse.deleteMany({
    where: {
      userId: session.user.id,
      voteOption: { voteId },
    },
  });

  const response = await db.voteResponse.create({
    data: { voteOptionId, userId: session.user.id },
  });

  return NextResponse.json(response, { status: 201 });
}
