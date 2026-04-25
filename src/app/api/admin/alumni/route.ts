/**
 * /api/admin/alumni
 *
 * 後台校友管理 API，需要 EXEC（level 4）以上權限。
 *
 * GET  — 列出全部校友（含 isPublic=false），可用 ?year= 篩選
 * POST — 建立新校友記錄
 *
 * 輸出：GET 回傳 Alumni[]；POST 回傳新建的 Alumni（201）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

/** GET /api/admin/alumni — 列出所有校友（後台用，包含隱藏記錄） */
export async function GET(request: NextRequest) {
  try {
    // 驗證身份與權限
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 可選年份篩選
    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const alumni = await db.alumni.findMany({
      where: year ? { graduationYear: year } : undefined,
      orderBy: [{ graduationYear: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(alumni);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/admin/alumni — 建立新校友記錄 */
export async function POST(request: NextRequest) {
  try {
    // 驗證身份與權限
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const {
      name,
      graduationYear,
      position,
      department,
      bio,
      linkedinUrl,
      instagramUrl,
      photoUrl,
      isPublic,
    } = body;

    // 必填欄位驗證
    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    // 年份驗證（若有傳入）
    if (graduationYear !== undefined && graduationYear !== null) {
      const y = parseInt(graduationYear, 10);
      if (isNaN(y) || y < 2000 || y > 2100) {
        return NextResponse.json({ error: "graduationYear must be a valid year" }, { status: 400 });
      }
    }

    const alumni = await db.alumni.create({
      data: {
        name: name.trim(),
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        position: position?.trim() || null,
        department: department?.trim() || null,
        bio: bio?.trim() || null,
        linkedinUrl: linkedinUrl?.trim() || null,
        instagramUrl: instagramUrl?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      },
    });

    return NextResponse.json(alumni, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
