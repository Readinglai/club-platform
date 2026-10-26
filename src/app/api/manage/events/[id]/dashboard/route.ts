/** GET /api/manage/events/[id]/dashboard — live sold / checked-in / revenue per tier. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { canSeeDashboard, getEventDashboard } from "@/lib/events/dashboard";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canSeeDashboard(user.id, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const data = await getEventDashboard(id);
  return data
    ? NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Event not found" }, { status: 404 });
}
