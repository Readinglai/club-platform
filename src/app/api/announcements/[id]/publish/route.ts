import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateAnnouncement } from "@/lib/announcements/manage";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/announcements/[id]/publish { published } — 切換發布狀態（VP 以上） */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.published !== "boolean") {
    return NextResponse.json({ error: "published 必須為 boolean" }, { status: 400 });
  }
  const result = await updateAnnouncement(session.user.id, (await params).id, { published: body.published });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ success: true });
}
