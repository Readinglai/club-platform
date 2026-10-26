/** POST /api/manage/events/[id]/ticket-types — add a tier. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { createTicketType } from "@/lib/events/manage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await createTicketType(user.id, id, await request.json().catch(() => ({})));
  return result.ok ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: result.message }, { status: result.status });
}
