import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAnnouncement, updateAnnouncement } from "@/lib/announcements/manage";

type Params = { params: Promise<{ id: string }> };

/** GET /api/announcements/[id] — 取得單一公告完整內容（已發布） */
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
      reads: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!announcement) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }

  const { reads, ...rest } = announcement;
  return NextResponse.json({ ...rest, isRead: reads.length > 0 });
}

/** PUT /api/announcements/[id] — 更新公告（VP 以上，見 announcements.manage） */
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await updateAnnouncement(session.user.id, (await params).id, body);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ success: true });
}

/** DELETE /api/announcements/[id] — 刪除公告（VP 以上，見 announcements.manage） */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });
  const result = await deleteAnnouncement(session.user.id, (await params).id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ success: true });
}
