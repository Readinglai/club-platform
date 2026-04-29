import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  if (task.assigneeId !== guard.userId) {
    return NextResponse.json({ error: "您不是此任務的被指派者" }, { status: 403 });
  }
  if (task.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "任務必須為「進行中」狀態才能完成" }, { status: 409 });
  }

  const updated = await db.task.update({
    where: { id },
    data: { status: "DONE" },
  });

  return NextResponse.json(updated);
}
