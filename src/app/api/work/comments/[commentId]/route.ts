/** DELETE /api/work/comments/[commentId] — your own comment, or any as the group's VP. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { deleteComment } from "@/lib/tasks/tasks";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ commentId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { commentId } = await params;
  const result = await deleteComment(user.id, commentId);
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
