/**
 * route.ts — 任務小組成員角色修改 API
 *
 * 功能：指派或變更任務小組內的角色（LEADER / MEMBER）
 * 輸入：URL [id] 任務小組 ID、[userId] 成員 ID；body: { role: "LEADER" | "MEMBER" }
 * 輸出：更新後的 TaskGroupMember 物件
 * 驗證：role level >= 4 且必須是小組建立者
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 4) {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const { id: taskGroupId, userId } = await params;

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { createdById: true },
  });

  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  if (taskGroup.createdById !== session.user.id) {
    return NextResponse.json({ error: "只有建立者可以管理成員" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { role } = body as { role?: unknown };
  if (role !== "LEADER" && role !== "MEMBER") {
    return NextResponse.json({ error: "role 必須為 LEADER 或 MEMBER" }, { status: 400 });
  }

  const existing = await db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });

  if (!existing) {
    return NextResponse.json({ error: "該使用者不是小組成員" }, { status: 404 });
  }

  const updated = await db.taskGroupMember.update({
    where: { taskGroupId_userId: { taskGroupId, userId } },
    data: { role: role as "LEADER" | "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}
