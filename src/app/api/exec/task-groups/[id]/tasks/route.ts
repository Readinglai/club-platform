/**
 * route.ts — 任務 GET（列表）+ POST（建立）
 *
 * GET  /api/exec/task-groups/[id]/tasks — 列出該群組所有任務
 * POST /api/exec/task-groups/[id]/tasks — 建立新任務
 * 驗證：session 必須是該 TaskGroup 的成員
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

async function getMember(taskGroupId: string, userId: string) {
  return db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const tasks = await db.task.findMany({
    where: { taskGroupId },
    orderBy: { createdAt: "asc" },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(tasks);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { id: true },
  });
  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { title, description, assigneeId, dueAt } = body as {
    title?: unknown;
    description?: unknown;
    assigneeId?: unknown;
    dueAt?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title 為必填欄位" }, { status: 400 });
  }

  // 確認 assignee 是該群組成員
  if (assigneeId !== undefined && assigneeId !== null) {
    if (typeof assigneeId !== "string") {
      return NextResponse.json({ error: "assigneeId 格式錯誤" }, { status: 400 });
    }
    const assigneeMember = await getMember(taskGroupId, assigneeId);
    if (!assigneeMember) {
      return NextResponse.json({ error: "指派對象不是此小組成員" }, { status: 400 });
    }
  }

  const task = await db.task.create({
    data: {
      taskGroupId,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      assigneeId: typeof assigneeId === "string" ? assigneeId : null,
      dueAt: typeof dueAt === "string" ? new Date(dueAt) : null,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}
