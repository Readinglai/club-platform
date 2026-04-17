/**
 * route.ts — 任務截止日提醒 Cron Job
 *
 * GET /api/cron/task-reminder
 * 由 Vercel Cron 每天 UTC 09:00 呼叫（台北時間 17:00）。
 * 驗證 Authorization: Bearer ${CRON_SECRET}，
 * 查詢三天內到期且未完成的任務，對 assignee 發送 Resend 提醒信。
 */

import { db } from "@/lib/db";
import { sendTaskReminderEmail } from "@/lib/email";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const tasks = await db.task.findMany({
    where: {
      dueAt: { gte: now, lte: threeDaysLater },
      status: { not: "DONE" },
      assigneeId: { not: null },
    },
    include: {
      assignee: { select: { email: true, name: true } },
      taskGroup: { select: { name: true } },
    },
  });

  const results: { taskId: string; status: string }[] = [];

  for (const task of tasks) {
    if (!task.assignee?.email || !task.dueAt) continue;
    try {
      await sendTaskReminderEmail({
        to: task.assignee.email,
        taskTitle: task.title,
        dueAt: task.dueAt,
        taskGroupName: task.taskGroup.name,
      });
      results.push({ taskId: task.id, status: "sent" });
    } catch (err) {
      console.error(`[cron] failed to send reminder for task ${task.id}:`, err);
      results.push({ taskId: task.id, status: "failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
