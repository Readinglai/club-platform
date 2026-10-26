/** POST /api/approvals/[id]/decide — { decision: "APPROVED" | "REJECTED", note? } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { decideApproval } from "@/lib/access/approvals";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.decision !== "APPROVED" && body.decision !== "REJECTED") {
    return NextResponse.json({ error: "decision must be APPROVED or REJECTED." }, { status: 400 });
  }

  const { id } = await params;
  const result = await decideApproval({
    userId: user.id,
    requestId: id,
    decision: body.decision,
    note: typeof body.note === "string" ? body.note : undefined,
  });
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
