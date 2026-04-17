/**
 * DELETE /api/exec/task-groups/[id]/discussion/comments/[commentId]
 * 刪除留言。只有留言作者本人可以刪除（匿名留言不能刪除）。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { commentId } = await params;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, isAnonymous: true },
  });

  if (!comment) {
    return NextResponse.json({ error: "留言不存在" }, { status: 404 });
  }

  if (comment.isAnonymous || comment.authorId === null) {
    return NextResponse.json({ error: "匿名留言無法刪除" }, { status: 403 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "只有作者本人可以刪除留言" }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });

  return new NextResponse(null, { status: 204 });
}
