/** GET /api/me/tickets — every ticket that belongs to the signed-in person. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getMyTickets } from "@/lib/tickets/mine";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ tickets: await getMyTickets(user.id, user.email) }, { headers: { "Cache-Control": "no-store" } });
}
