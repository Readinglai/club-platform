/** POST /api/work/groups/[groupId]/comments — { content, anonymous? } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { addComment } from "@/lib/tasks/tasks";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  const result = await addComment(user.id, groupId, await request.json().catch(() => ({})));
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
