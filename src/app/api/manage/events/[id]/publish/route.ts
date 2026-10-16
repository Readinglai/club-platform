/** POST /api/manage/events/[id]/publish — { published: boolean } */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { setPublished } from "@/lib/events/manage";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.published !== "boolean") return NextResponse.json({ error: "published must be true or false." }, { status: 400 });
  const { id } = await params;
  const result = await setPublished(user.id, id, body.published);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
