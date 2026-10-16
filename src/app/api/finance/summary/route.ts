/** GET /api/finance/summary — club balance, spending by year and per-event results. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { can, getAccess } from "@/lib/access/can";
import { getClubFinanceSummary } from "@/lib/finance/reports";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(await getAccess(user.id), "finance.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getClubFinanceSummary(), { headers: { "Cache-Control": "no-store" } });
}
