/**
 * route.ts — 任務 PATCH（更新）+ DELETE（刪除）
 *
 * PATCH  /api/exec/task-groups/[id]/tasks/[taskId] — 更新任務欄位
 * DELETE /api/exec/task-groups/[id]/tasks/[taskId] — 刪除任務
 *
 * PATCH 驗證：session 是該 TaskGroup 的成員
 * DELETE 驗證：session 是 TaskGroup 的 LEADER 或任務建立者（用 createdAt 近似：目前 Task 無 createdById，以 LEADER 判斷）
 */

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendTaskStatusEmail } from "@/lib/email";
import { requireAuthJson } from "@/lib/auth/guard";

async function getMember(taskGroupId: string, userId: string) {
  return db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });
}

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
      assignee: { select: { id: true, email: true, name: true } },
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

  const { title, description, assigneeId, dueAt, status } = body as {
    title?: unknown;
    description?: unknown;
    assigneeId?: unknown;
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
    data.description =
      typeof description === "string" ? description.trim() || null : null;
  }

  if (assigneeId !== undefined) {
    if (assigneeId !== null) {
      if (typeof assigneeId !== "string") {
        return NextResponse.json({ error: "assigneeId 格式錯誤" }, { status: 400 });
      }
      const assigneeMember = await getMember(taskGroupId, assigneeId);
      if (!assigneeMember) {
        return NextResponse.json({ error: "指派對象不是此小組成員" }, { status: 400 });
      }
    }
    data.assigneeId = assigneeId ?? null;
  }

  if (dueAt !== undefined) {
    data.dueAt = dueAt !== null && typeof dueAt === "string" ? new Date(dueAt) : null;
  }

  if (status !== undefined) {
    if (status !== "TODO" && status !== "IN_PROGRESS" && status !== "DONE") {
      return NextResponse.json(
        { error: "status 必須為 TODO、IN_PROGRESS 或 DONE" },
        { status: 400 }
      );
    }
    data.status = status;
  }

  const updated = await db.task.update({
    where: { id: taskId },
    data,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      taskGroup: { select: { name: true } },
    },
  });

  // 狀態變更時通知 assignee
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

  return NextResponse.json(updated);
}

export async function DELETE(
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

  // 只有 LEADER 才能刪除任務
  if (member.role !== "LEADER") {
    return NextResponse.json({ error: "只有組長可以刪除任務" }, { status: 403 });
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { taskGroup: { select: { status: true } } },
  });

  if (!task || task.taskGroupId !== taskGroupId) {
    return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  }

  if (task.taskGroup.status !== "ACTIVE") {
    return NextResponse.json({ error: "此小組已完成或封存，無法修改" }, { status: 409 });
  }

  await db.task.delete({ where: { id: taskId } });

  return new NextResponse(null, { status: 204 });
}
