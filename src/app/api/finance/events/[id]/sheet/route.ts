/** POST /api/finance/events/[id]/sheet { link } — connect the event's Google Sheet budget, then sync it. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { connectBudgetSheet } from "@/lib/finance/sheet-sync";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await connectBudgetSheet(user.id, (await params).id, body.link);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
