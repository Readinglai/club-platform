import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const tasks = await db.task.findMany({
    where: {
      OR: [
        { assigneeId: guard.userId },
        { taskGroup: { createdById: guard.userId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      taskGroup: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(tasks);
}
