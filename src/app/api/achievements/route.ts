/**
 * /api/achievements
 *
 * 公開成果列表 API，不需登入。
 *
 * GET — 列出所有成果，可用 ?year=2024 篩選特定年份
 *
 * 輸出：Achievement[]（依年份倒序排列）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/achievements — 列出所有成果（公開）
 *
 * Query params:
 *   year? — 依年份篩選（整數，例如 2024）
 *
 * @example
 * // 取得所有成果
 * fetch('/api/achievements')
 *
 * // 取得 2024 年成果
 * fetch('/api/achievements?year=2024')
 */
export async function GET(request: NextRequest) {
  try {
    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    // 若 yearParam 存在但無法解析為數字，回傳 400
    if (yearParam !== null && (year === null || isNaN(year))) {
      return NextResponse.json({ error: "year must be a valid integer" }, { status: 400 });
    }

    const achievements = await db.achievement.findMany({
      where: year ? { year } : undefined,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        year: true,
        description: true,
        imageUrl: true,
      },
    });

    return NextResponse.json(achievements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
