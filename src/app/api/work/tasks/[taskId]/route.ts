/** PATCH /api/work/tasks/[taskId] — update; DELETE — remove (group VP / President). */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { deleteTask, updateTask } from "@/lib/tasks/tasks";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const result = await updateTask(user.id, taskId, await request.json().catch(() => ({})));
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { taskId } = await params;
  const result = await deleteTask(user.id, taskId);
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
