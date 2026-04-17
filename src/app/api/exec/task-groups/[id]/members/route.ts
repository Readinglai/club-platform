/**
 * route.ts — 任務小組成員新增 API
 *
 * 功能：新增成員到任務小組
 * 輸入：URL [id] 任務小組 ID；body: { userId: string; role: "LEADER" | "MEMBER" }
 * 輸出：建立的 TaskGroupMember 物件
 * 驗證：role level >= 4 且必須是小組建立者
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 4) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id: taskGroupId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true, status: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  if (taskGroup.createdById !== session.user.id) {
    return NextResponse.json({ error: "只有建立者可以管理成員" }, { status: 403 });
  }

  if (taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法修改" }, { status: 409 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { userId, role } = body as { userId?: unknown; role?: unknown };

  if (typeof userId !== "string") {
    return NextResponse.json({ error: "userId 為必填欄位" }, { status: 400 });
  }
  if (role !== "LEADER" && role !== "MEMBER") {
    return NextResponse.json({ error: "role 必須為 LEADER 或 MEMBER" }, { status: 400 });
  }

  // 確認目標使用者存在
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  // 已是成員時返回 409
  const existing = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "該使用者已是小組成員" }, { status: 409 });
  }

  const member = await db.taskGroupMember.create({
    data: { taskGroupId, userId, role: role as "LEADER" | "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
