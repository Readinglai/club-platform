/**
 * route.ts — 任務 GET（列表）+ POST（建立）
 *
 * GET  /api/exec/task-groups/[id]/tasks — 列出該群組所有任務
 * POST /api/exec/task-groups/[id]/tasks — 建立新任務（支援多人指派 assigneeIds[]）
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

const taskInclude = {
  assignee:  { select: { id: true, name: true, email: true } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId } = await params;

  const [member, taskGroup] = await Promise.all([
    getMember(taskGroupId, guard.userId),
    db.taskGroup.findUnique({ where: { id: taskGroupId }, select: { createdById: true } }),
  ]);
  if (!member && taskGroup?.createdById !== guard.userId) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const tasks = await db.task.findMany({
    where: { taskGroupId },
    orderBy: { createdAt: "asc" },
    include: taskInclude,
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

  const [member, taskGroup] = await Promise.all([
    getMember(taskGroupId, guard.userId),
    db.taskGroup.findUnique({ where: { id: taskGroupId }, select: { id: true, status: true, createdById: true } }),
  ]);
  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
  }
  if (!member && taskGroup.createdById !== guard.userId) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
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

  const { title, description, assigneeId, assigneeIds, dueAt, status } = body as {
    title?: unknown;
    description?: unknown;
    assigneeId?: unknown;   // legacy single-assignee (web portal)
    assigneeIds?: unknown;  // new multi-assignee (admin app)
    dueAt?: unknown;
    status?: unknown;
  };

  if (status !== undefined && status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") {
    return NextResponse.json({ error: "status 必須為 TODO、IN_PROGRESS 或 DONE" }, { status: 400 });
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title 為必填欄位" }, { status: 400 });
  }

  // Resolve the canonical list of assignee IDs from either field
  const resolvedIds: string[] = Array.isArray(assigneeIds)
    ? (assigneeIds as unknown[]).filter((id): id is string => typeof id === "string")
    : typeof assigneeId === "string"
    ? [assigneeId]
    : [];

  // Ensure every assignee is a group member (auto-add if missing)
  for (const uid of resolvedIds) {
    const existing = await getMember(taskGroupId, uid);
    if (!existing) {
      await db.taskGroupMember.create({ data: { taskGroupId, userId: uid, role: "MEMBER" } });
    }
  }

  const task = await db.task.create({
    data: {
      taskGroupId,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      // keep legacy assigneeId as the primary/first assignee
      assigneeId: resolvedIds[0] ?? null,
      dueAt: typeof dueAt === "string" ? new Date(dueAt) : null,
      ...(status ? { status: status as "TODO" | "IN_PROGRESS" | "DONE" } : {}),
      assignees: resolvedIds.length > 0
        ? { create: resolvedIds.map((uid) => ({ userId: uid })) }
        : undefined,
    },
    include: taskInclude,
  });

  // Push notification to all group members
  const groupMemberUserIds = await db.taskGroupMember.findMany({
    where: { taskGroupId },
    select: { userId: true },
  });
  const memberIds = groupMemberUserIds.map((m) => m.userId);
  const subs = await db.pushSubscription.findMany({
    where: { userId: { in: memberIds }, expoToken: { not: null } },
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
