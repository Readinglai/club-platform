/** DELETE /api/finance/events/[id]/budget-lines/[lineId] */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { removeBudgetLine } from "@/lib/finance/entries";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, lineId } = await params;
  const result = await removeBudgetLine(user.id, id, lineId);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
