/**
 * /api/admin/alumni/[id]
 *
 * 後台校友個別記錄操作，需要 EXEC（level 4）以上權限。
 *
 * PATCH  — 更新校友資料（部分欄位更新，未傳入的欄位保持不變）
 * DELETE — 刪除校友記錄
 *
 * 輸出：PATCH 回傳更新後的 Alumni；DELETE 回傳 { success: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

/**
 * PATCH /api/admin/alumni/[id] — 更新校友資料（部分更新）
 *
 * Body: 任意 Alumni 欄位的子集（未傳入的欄位保持不變）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const { id } = await params;
    const body = await request.json();

    // 只更新有傳入的欄位（部分更新）
    const data: Record<string, unknown> = {};
    if (body.name !== undefined)           data.name = body.name.trim();
    if (body.graduationYear !== undefined) data.graduationYear = body.graduationYear ? parseInt(body.graduationYear, 10) : null;
    if (body.position !== undefined)       data.position = body.position?.trim() || null;
    if (body.department !== undefined)     data.department = body.department?.trim() || null;
    if (body.bio !== undefined)            data.bio = body.bio?.trim() || null;
    if (body.linkedinUrl !== undefined)    data.linkedinUrl = body.linkedinUrl?.trim() || null;
    if (body.instagramUrl !== undefined)   data.instagramUrl = body.instagramUrl?.trim() || null;
    if (body.photoUrl !== undefined)       data.photoUrl = body.photoUrl?.trim() || null;
    if (body.isPublic !== undefined)       data.isPublic = Boolean(body.isPublic);

    const updated = await db.alumni.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    // Prisma P2025 = 記錄不存在
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Alumni not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/alumni/[id] — 刪除校友記錄
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAuthJson(4, request);
    if (guard.error) return guard.error;

    const { id } = await params;

    await db.alumni.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Alumni not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
