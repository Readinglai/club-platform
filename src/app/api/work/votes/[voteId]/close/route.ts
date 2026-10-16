/** POST /api/work/votes/[voteId]/close — by whoever started it, or the group's VP. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { closeVote } from "@/lib/tasks/tasks";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ voteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { voteId } = await params;
  const result = await closeVote(user.id, voteId);
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
