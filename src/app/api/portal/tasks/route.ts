import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";
import { forbidUnless } from "@/lib/access/require";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;
  const forbidden = await forbidUnless(guard.userId, "tasks.use");
  if (forbidden) return forbidden;

  const tasks = await db.task.findMany({
    where: {
      OR: [
        { assigneeId: guard.userId },
        { assignees: { some: { userId: guard.userId } } },
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
