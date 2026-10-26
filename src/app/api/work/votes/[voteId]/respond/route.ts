/** POST /api/work/votes/[voteId]/respond — { optionId } (one answer per person). */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { respondToVote } from "@/lib/tasks/tasks";

export async function POST(request: NextRequest, { params }: { params: Promise<{ voteId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { voteId } = await params;
  const result = await respondToVote(user.id, voteId, typeof body.optionId === "string" ? body.optionId : "");
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
