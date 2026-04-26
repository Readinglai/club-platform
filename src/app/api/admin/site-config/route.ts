/**
 * /api/admin/site-config
 *
 * 網站全域設定 API。
 *
 * GET   — 公開，讀取單一設定值（?key=heroImageUrl）
 * PATCH — 需要 EXEC（level 4）以上權限，更新設定值
 *
 * 輸出：GET 回傳 { key, value }；PATCH 回傳更新後的 SiteConfig
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * GET /api/admin/site-config?key=heroImageUrl
 *
 * 公開端點，不需登入。
 * Query params:
 *   key — 設定 key（必填）
 */
export async function GET(request: NextRequest) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key 為必填" }, { status: 400 });
    const record = await db.siteConfig.findUnique({ where: { key } });
    return NextResponse.json({ key, value: record?.value ?? null });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/site-config
 *
 * 需要 EXEC（level 4）以上權限。
 * Body: { key: string; value: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const { key, value } = await request.json();
    if (typeof key !== "string" || typeof value !== "string") {
      return NextResponse.json({ error: "key 和 value 為必填字串" }, { status: 400 });
    }

    const record = await db.siteConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
