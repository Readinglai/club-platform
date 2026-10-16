/** POST /api/finance/events/[id]/review — { decision: "APPROVED" | "RETURNED", note? } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { reviewReport } from "@/lib/finance/reports";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.decision !== "APPROVED" && body.decision !== "RETURNED") {
    return NextResponse.json({ error: "decision must be APPROVED or RETURNED." }, { status: 400 });
  }
  const { id } = await params;
  const result = await reviewReport({
    actorId: user.id,
    eventId: id,
    decision: body.decision,
    note: typeof body.note === "string" ? body.note : undefined,
  });
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
