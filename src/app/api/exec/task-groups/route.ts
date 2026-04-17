/**
 * route.ts — 任務小組建立 API
 *
 * 功能：建立新任務小組，建立者自動成為 LEADER
 * 輸入：body: { name: string; description?: string }
 * 輸出：建立的 TaskGroup 物件
 * 驗證：role level >= 4（EXEC 以上）
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRole = (session.user.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[userRole] < 4) {
    return NextResponse.json({ error: "權限不足，需要 EXEC 以上" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { name, description } = body as { name?: unknown; description?: unknown };
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name 為必填欄位" }, { status: 400 });
  }

  // 建立小組並自動將建立者加入為 LEADER
  const taskGroup = await db.taskGroup.create({
    data: {
      name: name.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      createdById: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "LEADER",
        },
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(taskGroup, { status: 201 });
}
