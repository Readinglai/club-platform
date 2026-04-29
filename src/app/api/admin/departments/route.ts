import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * GET /api/admin/departments — 取得部門列表及各部門成員數
 * 需要 ADMIN（level 4）以上權限。
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const departments = await db.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true } },
      },
    });

    const result = departments.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      description: d.description,
      memberCount: d._count.members,
      createdAt: d.createdAt,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
