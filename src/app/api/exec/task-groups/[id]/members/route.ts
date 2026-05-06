/**
 * GET  /api/exec/task-groups/[id]/members — 列出成員
 * POST /api/exec/task-groups/[id]/members — 新增成員（接受 email 或 userId）
 */

import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const [member, taskGroup] = await Promise.all([
    db.taskGroupMember.findUnique({ where: { taskGroupId_userId: { taskGroupId, userId: guard.userId } } }),
    db.taskGroup.findUnique({ where: { id: taskGroupId }, select: { createdById: true } }),
  ]);
  if (!member && taskGroup?.createdById !== guard.userId) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const members = await db.taskGroupMember.findMany({
    where: { taskGroupId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const userRole = guard.role as Role;
  if (ROLE_LEVEL[userRole] < 3) {
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

  if (taskGroup.createdById !== guard.userId) {
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

  const { userId, email, role } = body as { userId?: unknown; email?: unknown; role?: unknown };

  let resolvedUserId: string | null = null;

  if (typeof userId === "string") {
    resolvedUserId = userId;
  } else if (typeof email === "string") {
    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: "找不到此 email 的使用者" }, { status: 404 });
    }
    resolvedUserId = user.id;
  } else {
    return NextResponse.json({ error: "需提供 userId 或 email" }, { status: 400 });
  }

  if (role !== "LEADER" && role !== "MEMBER") {
    return NextResponse.json({ error: "role 必須為 LEADER 或 MEMBER" }, { status: 400 });
  }

  const existing = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId: resolvedUserId } },
  });
  if (existing) {
    return NextResponse.json({ error: "該使用者已是小組成員" }, { status: 409 });
  }

  const member = await db.taskGroupMember.create({
    data: { taskGroupId, userId: resolvedUserId, role: role as "LEADER" | "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
