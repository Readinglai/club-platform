/**
 * GET /api/public/events/[id] — the public event page's data. Unpublished
 * events are only returned to people who manage them (preview).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getPublicEvent } from "@/lib/events/public";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await params;
  const data = await getPublicEvent(id, user?.id ?? null);
  return data
    ? NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Event not found" }, { status: 404 });
}
