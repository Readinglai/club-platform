/**
 * GET /api/alumni
 *
 * 公開 API：列出所有 isPublic=true 的校友資料。
 * 不需要登入，任何人皆可存取。
 * 支援 ?year=2024 篩選特定離開年份。
 *
 * 輸出：Alumni[] 陣列，依 graduationYear 降冪排列，同年再依 createdAt 降冪。
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const alumni = await db.alumni.findMany({
      where: {
        isPublic: true,
        ...(year ? { graduationYear: year } : {}),
      },
      orderBy: [
        { graduationYear: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(alumni);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
