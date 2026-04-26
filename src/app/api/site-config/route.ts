/**
 * /api/site-config
 *
 * 公開網站全域設定 API，不需登入。
 *
 * GET — 回傳所有公開設定（key-value 物件）
 *       若無任何設定記錄，回傳 {}
 *
 * 注意：寫入操作請使用 /api/admin/site-config（需要 EXEC 以上權限）
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/site-config — 取得所有網站全域設定（公開）
 *
 * 回傳格式：{ [key: string]: string }
 * 例如：{ "heroImageUrl": "https://...", "clubName": "ROCSAUT" }
 *
 * @example
 * const config = await fetch('/api/site-config').then(r => r.json())
 * // { heroImageUrl: "...", bannerText: "..." }
 */
export async function GET() {
  try {
    const records = await db.siteConfig.findMany({
      select: {
        key: true,
        value: true,
      },
    });

    if (records.length === 0) {
      return NextResponse.json({});
    }

    // 將 key-value 陣列轉換為物件格式
    const config = records.reduce<Record<string, string>>((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {});

    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
