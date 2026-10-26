/** POST /api/work/groups/[groupId]/tasks — { title, description?, dueAt? (YYYY-MM-DD), assigneeIds? } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { createTask } from "@/lib/tasks/tasks";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  const result = await createTask(user.id, groupId, await request.json().catch(() => ({})));
  return result.ok
    ? NextResponse.json({ ok: true, id: result.value }, { status: 201 })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
