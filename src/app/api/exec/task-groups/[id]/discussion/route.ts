/**
 * GET /api/exec/task-groups/[id]/discussion
 * 取得（或自動建立）該 TaskGroup 的 Discussion，含所有留言與作者姓名。
 * 驗證：session 是該 TaskGroup 的成員。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
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

  // 取得或建立 Discussion
  let discussion = await db.discussion.findFirst({
    where: { taskGroupId },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!discussion) {
    discussion = await db.discussion.create({
      data: { taskGroupId },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  return NextResponse.json(discussion);
}
