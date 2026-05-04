/**
 * GET /api/tasks/search?q={keyword}
 *
 * 全文搜尋使用者可存取的任務資料，搜尋範圍：
 *   - 任務標題（title）
 *   - 任務描述（description）
 *   - 任務群組名稱（taskGroup.name）
 *   - 所有相關討論區留言（Comment.content）
 *
 * 僅回傳使用者被指派的任務，或是使用者在該任務群組有成員身分的任務。
 * 使用 Prisma contains + mode: insensitive 做大小寫不敏感全文搜尋。
 *
 * 回傳格式：SearchResult[]
 *   { taskId, taskTitle, taskGroupName, matchType, matchPreview }
 *
 * 最低權限：MEMBER (level 2)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

interface SearchResult {
  taskId: string;
  taskTitle: string;
  taskGroupName: string;
  matchType: "title" | "description" | "group" | "discussion";
  matchPreview: string;
}

/**
 * 從文字中擷取匹配關鍵字附近的片段，前後各 30 字元。
 */
function extractPreview(content: string, keyword: string): string {
  const idx = content.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return content.slice(0, 60);
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + keyword.length + 30);
  return (start > 0 ? "..." : "") + content.slice(start, end) + (end < content.length ? "..." : "");
}

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  // 關鍵字少於 1 個字元直接回傳空陣列，避免全表掃描
  if (q.length < 1) return NextResponse.json([]);

  const results: SearchResult[] = [];
  const seenTaskIds = new Set<string>();

  // ───────────────────────────────────────────────────
  // 1. 搜尋使用者被指派的任務標題或描述
  // ───────────────────────────────────────────────────
  const taskMatches = await db.task.findMany({
    where: {
      assigneeId: guard.userId,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { taskGroup: { select: { name: true } } },
    take: 30,
  });

  for (const task of taskMatches) {
    if (seenTaskIds.has(task.id)) continue;
    seenTaskIds.add(task.id);
    const isTitle = task.title.toLowerCase().includes(q.toLowerCase());
    results.push({
      taskId: task.id,
      taskTitle: task.title,
      taskGroupName: task.taskGroup.name,
      matchType: isTitle ? "title" : "description",
      matchPreview: isTitle
        ? extractPreview(task.title, q)
        : extractPreview(task.description ?? task.title, q),
    });
  }

  // ───────────────────────────────────────────────────
  // 2. 搜尋群組名稱，回傳群組中使用者被指派的任務
  // ───────────────────────────────────────────────────
  const groupMatches = await db.taskGroup.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      tasks: { some: { assigneeId: guard.userId } },
    },
    include: {
      tasks: {
        where: { assigneeId: guard.userId },
        take: 5,
      },
    },
    take: 10,
  });

  for (const group of groupMatches) {
    for (const task of group.tasks) {
      if (seenTaskIds.has(task.id)) continue;
      seenTaskIds.add(task.id);
      results.push({
        taskId: task.id,
        taskTitle: task.title,
        taskGroupName: group.name,
        matchType: "group",
        matchPreview: `群組：${group.name}`,
      });
    }
  }

  // ───────────────────────────────────────────────────
  // 3. 搜尋使用者可存取任務群組的討論留言
  //    （使用者被指派任務所屬的任務群組）
  // ───────────────────────────────────────────────────
  const userTasks = await db.task.findMany({
    where: { assigneeId: guard.userId },
    select: {
      id: true,
      title: true,
      taskGroupId: true,
      taskGroup: { select: { name: true } },
    },
  });

  // 建立 taskGroupId → 對應任務 的 Map（每個群組取第一個被指派任務作為代表）
  const taskGroupMap = new Map<string, typeof userTasks[0]>();
  for (const task of userTasks) {
    if (!taskGroupMap.has(task.taskGroupId)) {
      taskGroupMap.set(task.taskGroupId, task);
    }
  }
  const accessibleGroupIds = Array.from(taskGroupMap.keys());

  if (accessibleGroupIds.length > 0) {
    // 在使用者可存取的群組討論區中搜尋匹配的留言
    const commentMatches = await db.comment.findMany({
      where: {
        content: { contains: q, mode: "insensitive" },
        discussion: { taskGroupId: { in: accessibleGroupIds } },
      },
      include: {
        discussion: { select: { taskGroupId: true } },
      },
      take: 20,
    });

    for (const comment of commentMatches) {
      const taskGroupId = comment.discussion?.taskGroupId;
      if (!taskGroupId) continue;
      const representativeTask = taskGroupMap.get(taskGroupId);
      if (!representativeTask) continue;
      if (seenTaskIds.has(representativeTask.id)) continue;
      seenTaskIds.add(representativeTask.id);

      results.push({
        taskId: representativeTask.id,
        taskTitle: representativeTask.title,
        taskGroupName: representativeTask.taskGroup.name,
        matchType: "discussion",
        matchPreview: extractPreview(comment.content, q),
      });
    }
  }

  return NextResponse.json(results);
}
