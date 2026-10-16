/** POST /api/work/groups/[groupId]/votes — { title, description?, options: string[] } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { createVote } from "@/lib/tasks/tasks";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  const result = await createVote(user.id, groupId, await request.json().catch(() => ({})));
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
