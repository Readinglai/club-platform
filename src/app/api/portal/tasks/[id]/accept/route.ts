import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forbidUnless, requireUserJson } from "@/lib/access/require";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireUserJson();
  if (guard.error) return guard.error;
  const forbidden = await forbidUnless(guard.userId, "tasks.use");
  if (forbidden) return forbidden;

  const { id } = await params;

  const task = await db.task.findUnique({
    where: { id },
    include: {
      taskGroup: { select: { createdById: true } },
      assignees: { select: { userId: true } },
    },
  });
  if (!task) return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  const isAssignee = task.assigneeId === guard.userId || task.assignees.some((a) => a.userId === guard.userId);
  const isGroupCreator = task.taskGroup?.createdById === guard.userId;
  if (!isAssignee && !isGroupCreator) {
    return NextResponse.json({ error: "您不是此任務的被指派者" }, { status: 403 });
  }
  if (task.status !== "TODO") {
    return NextResponse.json({ error: "任務必須為「待辦」狀態才能接受" }, { status: 409 });
  }

  const updated = await db.task.update({
    where: { id },
    data: { status: "IN_PROGRESS" },
  });

  return NextResponse.json(updated);
}
