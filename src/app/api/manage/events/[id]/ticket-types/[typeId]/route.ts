/** PATCH /api/manage/events/[id]/ticket-types/[typeId] — edit a tier (active: false hides it). */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { updateTicketType } from "@/lib/events/manage";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; typeId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, typeId } = await params;
  const result = await updateTicketType(user.id, id, typeId, await request.json().catch(() => ({})));
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
