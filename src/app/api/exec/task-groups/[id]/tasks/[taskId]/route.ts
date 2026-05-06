/**
 * route.ts — 任務 PATCH（更新）+ DELETE（刪除）
 *
 * PATCH  /api/exec/task-groups/[id]/tasks/[taskId] — 更新任務欄位（支援多人指派 assigneeIds[]）
 * DELETE /api/exec/task-groups/[id]/tasks/[taskId] — 刪除任務（LEADER 或小組建立者）
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendTaskStatusEmail } from "@/lib/email";
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
  taskGroup: { select: { name: true } },
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId, taskId } = await params;

  const member = await getMember(taskGroupId, guard.userId);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const existingTask = await db.task.findUnique({
    where: { id: taskId },
    include: {
      assignee:  { select: { id: true, email: true, name: true } },
      assignees: { select: { userId: true } },
      taskGroup: { select: { name: true, status: true } },
    },
  });

  if (!existingTask || existingTask.taskGroupId !== taskGroupId) {
    return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  }

  if (existingTask.taskGroup.status !== "ACTIVE") {
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

  const data: Record<string, unknown> = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "title 不能為空" }, { status: 400 });
    }
    data.title = title.trim();
  }

  if (description !== undefined) {
    data.description = typeof description === "string" ? description.trim() || null : null;
  }

  if (dueAt !== undefined) {
    data.dueAt = dueAt !== null && typeof dueAt === "string" ? new Date(dueAt) : null;
  }

  if (status !== undefined) {
    if (status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") {
      return NextResponse.json({ error: "status 必須為 TODO、IN_PROGRESS 或 DONE" }, { status: 400 });
    }
    data.status = status;
  }

  // ── Assignee handling ─────────────────────────────────────────────────────
  // Prefer assigneeIds[] (multi); fall back to legacy assigneeId (single).
  let newAssigneeIds: string[] | null = null;

  if (Array.isArray(assigneeIds)) {
    newAssigneeIds = (assigneeIds as unknown[]).filter((id): id is string => typeof id === "string");
  } else if (assigneeId !== undefined) {
    newAssigneeIds = assigneeId !== null && typeof assigneeId === "string" ? [assigneeId] : [];
  }

  if (newAssigneeIds !== null) {
    // Validate that every new assignee is (or will be) a group member
    for (const uid of newAssigneeIds) {
      const m = await getMember(taskGroupId, uid);
      if (!m) {
        return NextResponse.json({ error: `使用者 ${uid} 不是此小組成員` }, { status: 400 });
      }
    }

    // Update legacy assigneeId (first entry, or null)
    data.assigneeId = newAssigneeIds[0] ?? null;
  }

  // ── Persist task scalar fields ────────────────────────────────────────────
  const updated = await db.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  // ── Persist multi-assignee join table ─────────────────────────────────────
  if (newAssigneeIds !== null) {
    const oldIds = new Set(existingTask.assignees.map((a) => a.userId));
    const newIds = new Set(newAssigneeIds);

    const toDelete = [...oldIds].filter((id) => !newIds.has(id));
    const toAdd    = [...newIds].filter((id) => !oldIds.has(id));

    await Promise.all([
      ...toDelete.map((uid) =>
        db.taskAssignee.deleteMany({ where: { taskId, userId: uid } })
      ),
      ...toAdd.map((uid) =>
        db.taskAssignee.create({ data: { taskId, userId: uid } })
      ),
    ]);
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  // Email: status changed → notify primary assignee
  if (
    status !== undefined &&
    status !== existingTask.status &&
    updated.assignee?.email
  ) {
    sendTaskStatusEmail({
      to: updated.assignee.email,
      taskTitle: updated.title,
      newStatus: status as string,
      taskGroupName: updated.taskGroup.name,
    }).catch((err) => console.error("[task status email]", err));
  }

  // Push: newly added assignees
  if (newAssigneeIds !== null) {
    const oldIds = new Set(existingTask.assignees.map((a) => a.userId));
    const brandNewIds = newAssigneeIds.filter((id) => !oldIds.has(id));

    if (brandNewIds.length > 0) {
      db.pushSubscription.findMany({
        where: { userId: { in: brandNewIds }, expoToken: { not: null } },
      }).then((subs) =>
        Promise.allSettled(
          subs.map((sub) =>
            sendPushNotification(sub, {
              title: "新任務指派",
              body: updated.title,
              url: "/portal/tasks",
              data: { type: "task", taskId: updated.id },
            })
          )
        )
      ).catch((err) => console.error("[task assign push]", err));
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id: taskGroupId, taskId } = await params;

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { taskGroup: { select: { status: true, createdById: true } } },
  });

  if (!task || task.taskGroupId !== taskGroupId) {
    return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  }

  const member = await getMember(taskGroupId, guard.userId);
  const isGroupCreator = task.taskGroup.createdById === guard.userId;
  const isLeaderMember = member?.role === "LEADER";

  if (!isLeaderMember && !isGroupCreator) {
    return NextResponse.json({ error: "只有組長可以刪除任務" }, { status: 403 });
  }

  if (task.taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法修改" }, { status: 409 });
  }

  await db.task.delete({ where: { id: taskId } });

  return new NextResponse(null, { status: 204 });
}
