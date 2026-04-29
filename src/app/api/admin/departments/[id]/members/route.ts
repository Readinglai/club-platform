import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/departments/[id]/members — 取得指定部門成員列表
 * 需要 ADMIN（level 4）以上權限。
 * [id] 可為部門 cuid 或 slug。
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const { id } = await params;

    // 同時支援 cuid 和 slug 查詢
    const department = await db.department.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        members: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json({ error: "部門不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: department.id,
      slug: department.slug,
      name: department.name,
      description: department.description,
      members: department.members,
    });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
