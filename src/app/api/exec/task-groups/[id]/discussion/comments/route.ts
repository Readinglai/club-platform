/**
 * POST /api/exec/task-groups/[id]/discussion/comments
 * 新增留言到該 TaskGroup 的討論區。
 * body: { content: string; isAnonymous: boolean }
 * 驗證：session 是該 TaskGroup 的成員。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId } = await params;

  const member = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { status: true },
  });
  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }
  if (taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法修改" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { content, isAnonymous } = body as { content?: unknown; isAnonymous?: unknown };

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content 為必填欄位" }, { status: 400 });
  }
  const anonymous = isAnonymous === true;

  // 確保 Discussion 存在
  let discussion = await db.discussion.findFirst({ where: { taskGroupId } });
  if (!discussion) {
    discussion = await db.discussion.create({ data: { taskGroupId } });
  }

  const comment = await db.comment.create({
    data: {
      discussionId: discussion.id,
      content: content.trim(),
      isAnonymous: anonymous,
      authorId: anonymous ? null : session.user.id,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
