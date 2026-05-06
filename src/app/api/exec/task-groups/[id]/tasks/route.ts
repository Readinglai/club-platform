/**
 * route.ts — 任務 GET（列表）+ POST（建立）
 *
 * GET  /api/exec/task-groups/[id]/tasks — 列出該群組所有任務
 * POST /api/exec/task-groups/[id]/tasks — 建立新任務
 * 驗證：session 必須是該 TaskGroup 的成員
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/webpush";
import { requireAuthJson } from "@/lib/auth/guard";

async function getMember(taskGroupId: string, userId: string) {
  return db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, guard.userId);
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, guard.userId);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { id: true, status: true },
  });
  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
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

  const { title, description, assigneeId, dueAt, status } = body as {
    title?: unknown;
    description?: unknown;
    assigneeId?: unknown;
    dueAt?: unknown;
    status?: unknown;
  };

  if (status !== undefined && status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") {
    return NextResponse.json({ error: "status 必須為 TODO、IN_PROGRESS 或 DONE" }, { status: 400 });
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title 為必填欄位" }, { status: 400 });
  }

  if (assigneeId !== undefined && assigneeId !== null) {
    if (typeof assigneeId !== "string") {
      return NextResponse.json({ error: "assigneeId 格式錯誤" }, { status: 400 });
    }
    const assigneeMember = await getMember(taskGroupId, assigneeId);
    if (!assigneeMember) {
      await db.taskGroupMember.create({
        data: { taskGroupId, userId: assigneeId, role: "MEMBER" },
      });
    }
  }

  const task = await db.task.create({
    data: {
      taskGroupId,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      assigneeId: typeof assigneeId === "string" ? assigneeId : null,
      dueAt: typeof dueAt === "string" ? new Date(dueAt) : null,
      ...(status ? { status: status as "TODO" | "IN_PROGRESS" | "DONE" } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  // 推播給所有有 expoToken 的群組成員
  const groupMemberUserIds = await db.taskGroupMember.findMany({
    where: { taskGroupId },
    select: { userId: true },
  });
  const memberIds = groupMemberUserIds.map((m) => m.userId);
  const subs = await db.pushSubscription.findMany({
    where: {
      userId: { in: memberIds },
      expoToken: { not: null },
    },
  });
  await Promise.allSettled(
    subs.map((sub) =>
      sendPushNotification(sub, {
        title: "新任務指派",
        body: task.title,
        url: "/portal/tasks",
        data: { type: "task", taskId: task.id },
      })
    )
  );

  return NextResponse.json(task, { status: 201 });
}
