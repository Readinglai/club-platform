/**
 * /api/admin/announcements
 *
 * 行動 App Admin 用公告 API（支援 Bearer token auth）
 *
 * GET  — 取得所有公告（含草稿），需要 EXEC（level 3）以上
 * POST — 新增公告，需要 EXEC（level 3）以上
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/** GET /api/admin/announcements — 取得所有公告（含草稿） */
export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      published: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });

  // 將 published 欄位對應為 App 端使用的 isPublished 名稱
  const result = announcements.map(({ published, ...ann }) => ({
    ...ann,
    isPublished: published,
    publishedAt: published ? ann.createdAt : null,
  }));

  return NextResponse.json(result);
}

/** POST /api/admin/announcements — 新增公告 */
export async function POST(request: NextRequest) {
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

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        published: false,
        authorId: guard.userId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ...announcement, isPublished: announcement.published, publishedAt: null },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
