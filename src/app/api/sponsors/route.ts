/**
 * /api/sponsors
 *
 * 贊助商 API。
 *
 * GET  — 公開，不需登入。列出所有贊助商，可用 ?year=2024 篩選有該年度記錄的 sponsor。
 * POST — 需要 EXEC（level 4）以上權限，新增贊助商。
 *
 * 輸出：GET 回傳 Sponsor[]（含 histories）；POST 回傳新建的 Sponsor（201）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * GET /api/sponsors — 列出所有贊助商（公開）
 *
 * Query params:
 *   year? — 篩選有該年度贊助記錄的贊助商（整數）
 */
export async function GET(request: NextRequest) {
  try {
    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const sponsors = await db.sponsor.findMany({
      where: year
        ? { histories: { some: { year } } }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        histories: {
          orderBy: { year: "desc" },
        },
      },
    });

    return NextResponse.json(sponsors);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/sponsors — 新增贊助商
 *
 * 需要 EXEC（level 4）以上權限。
 * Body: { name: string; logoUrl?: string; website?: string; description?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthJson(3, request);
    if (guard.error) return guard.error;

    const body = await request.json();
    const { name, logoUrl, website, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const sponsor = await db.sponsor.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl ?? null,
        website: website ?? null,
        description: description ?? null,
      },
    });

    return NextResponse.json(sponsor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
