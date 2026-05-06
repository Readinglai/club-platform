import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  const task = await db.task.findFirst({
    where: {
      id,
      OR: [
        { assigneeId: guard.userId },
        { taskGroup: { createdById: guard.userId } },
      ],
    },
    include: {
      taskGroup: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "任務不存在" }, { status: 404 });
  }

  return NextResponse.json(task);
}
