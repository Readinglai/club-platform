/**
 * GET  /api/exec/task-groups — 列出所有任務小組（EXEC+）
 * POST /api/exec/task-groups — 建立新任務小組，建立者自動成為 LEADER
 */

import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const userRole = guard.role as Role;
  if (ROLE_LEVEL[userRole] < 3) {
    return NextResponse.json({ error: "權限不足，需要 EXEC 以上" }, { status: 403 });
  }

  const taskGroups = await db.taskGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(taskGroups);
}

export async function POST(request: NextRequest) {
  try {
    const guard = await requireAuthJson(2, request);
    if (guard.error) return guard.error;

    const userRole = guard.role as Role;
    if (ROLE_LEVEL[userRole] < 3) {
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

    const taskGroup = await db.taskGroup.create({
      data: {
        name: name.trim(),
        description: typeof description === "string" ? description.trim() || null : null,
        createdById: guard.userId,
        members: {
          create: {
            userId: guard.userId,
            role: "LEADER",
          },
        },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { members: true } },
      },
    });
    return NextResponse.json(taskGroup, { status: 201 });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
