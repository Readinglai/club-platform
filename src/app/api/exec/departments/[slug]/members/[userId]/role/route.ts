/**
 * route.ts — 部門成員角色修改 API
 *
 * 功能：修改指定成員的全域角色（User.role），限定為 team_lead 或 member
 * 輸入：URL [slug] 部門識別碼、[userId] 成員 ID；body: { role: "TEAM_LEAD" | "MEMBER" }
 * 輸出：更新後的 user 物件（id, name, role）
 * 驗證：僅 SUPER_ADMIN（level 5）可操作
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 5) {
    return NextResponse.json({ error: "權限不足，需要 SUPER_ADMIN" }, { status: 403 });
  }

  const { slug, userId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { role } = body as { role?: unknown };
  if (role !== "TEAM_LEAD" && role !== "MEMBER") {
    return NextResponse.json(
      { error: "role 必須為 TEAM_LEAD 或 MEMBER" },
      { status: 400 }
    );
  }

  // 確認部門存在
  const department = await db.department.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!department) {
    return NextResponse.json({ error: "部門不存在" }, { status: 404 });
  }

  // 確認成員屬於該部門
  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, departmentId: true },
  });

  if (!target || target.departmentId !== department.id) {
    return NextResponse.json(
      { error: "找不到該部門的成員" },
      { status: 404 }
    );
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role: role as Role },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
