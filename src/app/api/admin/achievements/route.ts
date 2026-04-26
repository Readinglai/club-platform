/**
 * /api/admin/achievements
 *
 * 後台成果管理 API，需要 EXEC（level 4）以上權限。
 *
 * GET  — 列出所有成果，可用 ?year=2024 篩選
 * POST — 建立新成果
 *
 * 輸出：GET 回傳 Achievement[]；POST 回傳新建的 Achievement（201）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * GET /api/admin/achievements — 列出所有成果
 *
 * Query params:
 *   year? — 依年份篩選（整數）
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const achievements = await db.achievement.findMany({
      where: year ? { year } : undefined,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(achievements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/achievements — 建立新成果
 *
 * Body: { title: string; year: number; description: string; imageUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const body = await request.json();
    const { title, year, description, imageUrl } = body;

    if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!year || typeof year !== "number" || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "year must be a valid integer" }, { status: 400 });
    }
    if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

    const achievement = await db.achievement.create({
      data: {
        title: title.trim(),
        year,
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
      },
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
