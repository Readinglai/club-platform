/**
 * PATCH /api/exec/task-groups/[id]/discussion/comments/[commentId]
 * DELETE /api/exec/task-groups/[id]/discussion/comments/[commentId]
 * 只有留言作者本人可以操作（匿名留言不能刪除）。
 * 支援 Bearer token 認證。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { commentId } = await params;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, isAnonymous: true },
  });

  if (!comment) {
    return NextResponse.json({ error: "留言不存在" }, { status: 404 });
  }

  if (comment.isAnonymous || comment.authorId === null) {
    return NextResponse.json({ error: "匿名留言無法編輯" }, { status: 403 });
  }

  if (comment.authorId !== guard.userId) {
    return NextResponse.json({ error: "只有作者本人可以編輯留言" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { content } = body as { content?: unknown };
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content 為必填欄位" }, { status: 400 });
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content: content.trim() },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

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

  if (comment.authorId !== guard.userId) {
    return NextResponse.json({ error: "只有作者本人可以刪除留言" }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });

  return new NextResponse(null, { status: 204 });
}
