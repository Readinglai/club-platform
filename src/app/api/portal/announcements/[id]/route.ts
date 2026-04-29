import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id, published: true },
    include: {
      author: { select: { id: true, name: true } },
      reads: {
        where: { userId: guard.userId },
        select: { readAt: true },
      },
    },
  });

  if (!announcement) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }

  return NextResponse.json({
    ...announcement,
    isRead: announcement.reads.length > 0,
    reads: undefined,
  });
}
