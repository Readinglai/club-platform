/**
 * /api/admin/members
 *
 * 後台成員管理 API，需要 EXEC（level 4）以上權限。
 *
 * GET — 列出所有成員，可用 ?role= 篩選角色，?department= 篩選部門 slug
 *
 * 輸出：GET 回傳 User[]（含 department 資料）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";
import type { Role } from "@/generated/prisma/client";

/**
 * GET /api/admin/members — 列出所有成員
 *
 * Query params:
 *   role?       — 依角色篩選（Role enum 值）
 *   department? — 依部門 slug 篩選
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role") as Role | null;
    const deptFilter = searchParams.get("department");

    const users = await db.user.findMany({
      where: {
        ...(roleFilter && { role: roleFilter }),
        ...(deptFilter && { department: { slug: deptFilter } }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: { select: { slug: true, name: true } },
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
