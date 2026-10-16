/** POST /api/finance/events/[id]/submit — the event team submits its finance report. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { submitReport } from "@/lib/finance/reports";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await submitReport(user.id, id);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
