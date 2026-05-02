/**
 * GET /api/exec/task-groups/[id]/discussion
 * 取得（或自動建立）該 TaskGroup 的 Discussion，含所有留言與作者姓名。
 * 驗證：Bearer token 或 session 且是該 TaskGroup 的成員。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const member = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId: guard.userId } },
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
