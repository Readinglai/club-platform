/** POST /api/finance/events/[id]/sheet/sync — read the connected sheet again now. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { syncBudgetSheetAs } from "@/lib/finance/sheet-sync";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await syncBudgetSheetAs(user.id, (await params).id);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
