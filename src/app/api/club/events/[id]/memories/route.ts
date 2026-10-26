/** PUT /api/club/events/[id]/memories { recap, photos: [{ id?, imageUrl, caption }] } — save an event's past memories. */

import { NextRequest, NextResponse } from "next/server";
import { requirePermissionJson } from "@/lib/access/require";
import { saveEventMemories } from "@/lib/events/memories";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requirePermissionJson("memories.manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const result = await saveEventMemories(guard.userId, (await params).id, body);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
