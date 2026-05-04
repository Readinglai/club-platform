/**
 * /api/admin/announcements/[id]
 *
 * 單筆公告操作（行動 App Admin，支援 Bearer token auth）
 *
 * PUT    — 編輯公告 title / content，需要 EXEC（level 3）以上
 * DELETE — 刪除公告，需要 EXEC（level 3）以上
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/** PUT /api/admin/announcements/[id] — 編輯公告 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  try {
    const body = await request.json();
    const { title, content } = body;
    if (!title || !content) {
      return NextResponse.json(
        { error: "title 和 content 為必填" },
        { status: 400 }
      );
    }

    const announcement = await db.announcement.update({
      where: { id: params.id },
      data: { title, content },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ...announcement,
      isPublished: announcement.published,
    });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/** DELETE /api/admin/announcements/[id] — 刪除公告 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  try {
    await db.announcement.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
