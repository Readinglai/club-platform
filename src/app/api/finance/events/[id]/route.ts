/** GET /api/finance/events/[id] — one event's budget vs actual, entries and report status. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { eventFinanceAccess, getEventFinance } from "@/lib/finance/reports";
import { robotEmail, sheetSyncEnabled } from "@/lib/finance/google-sheets";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rights = await eventFinanceAccess(user.id, id);
  if (!rights.view) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const finance = await getEventFinance(id);
  if (!finance) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  const sync = { enabled: sheetSyncEnabled(), robotEmail: rights.connect ? robotEmail() : null };
  return NextResponse.json({ ...finance, rights, sync }, { headers: { "Cache-Control": "no-store" } });
}
