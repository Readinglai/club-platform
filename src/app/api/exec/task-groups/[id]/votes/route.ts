/**
 * GET  /api/exec/task-groups/[id]/votes — 取得所有投票（含選項票數與本人已投選項）
 * POST /api/exec/task-groups/[id]/votes — 建立新投票
 *
 * GET 驗證：session 是 TaskGroup 成員
 * POST 驗證：session 是 TaskGroup LEADER 或全域 role level >= 4
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { NextResponse } from "next/server";
import type { Role } from "@/generated/prisma/client";

async function getMember(taskGroupId: string, userId: string) {
  return db.taskGroupMember.findUnique({
    where: { taskGroupId_userId: { taskGroupId, userId } },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const [votes, userResponses] = await Promise.all([
    db.vote.findMany({
      where: { taskGroupId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        options: {
          include: { _count: { select: { responses: true } } },
        },
      },
    }),
    db.voteResponse.findMany({
      where: {
        userId: session.user.id,
        voteOption: { vote: { taskGroupId } },
      },
      select: { voteOptionId: true },
    }),
  ]);

  const myVotedOptionIds = new Set(userResponses.map((r) => r.voteOptionId));

  const result = votes.map((vote) => ({
    id: vote.id,
    title: vote.title,
    description: vote.description,
    createdById: vote.createdById,
    createdBy: vote.createdBy,
    closedAt: vote.closedAt,
    createdAt: vote.createdAt,
    options: vote.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      count: opt._count.responses,
      isMyVote: myVotedOptionIds.has(opt.id),
    })),
  }));

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: taskGroupId } = await params;

  const member = await getMember(taskGroupId, session.user.id);
  if (!member) {
    return NextResponse.json({ error: "您不是此小組的成員" }, { status: 403 });
  }

  const globalRole = (session.user.role as Role | undefined) ?? "MEMBER";
  const canCreate = member.role === "LEADER" || ROLE_LEVEL[globalRole] >= 4;
  if (!canCreate) {
    return NextResponse.json({ error: "只有組長或執委可以建立投票" }, { status: 403 });
  }

  const taskGroup = await db.taskGroup.findUnique({
    where: { id: taskGroupId },
    select: { status: true },
  });
  if (!taskGroup) {
    return NextResponse.json({ error: "任務小組不存在" }, { status: 404 });
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

  const { title, description, options, closedAt } = body as {
    title?: unknown;
    description?: unknown;
    options?: unknown;
    closedAt?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title 為必填欄位" }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length < 2) {
    return NextResponse.json({ error: "至少需要兩個選項" }, { status: 400 });
  }
  const optionLabels = options as unknown[];
  if (!optionLabels.every((o) => typeof o === "string" && (o as string).trim().length > 0)) {
    return NextResponse.json({ error: "選項不能為空字串" }, { status: 400 });
  }

  const vote = await db.vote.create({
    data: {
      taskGroupId,
      createdById: session.user.id,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      closedAt: typeof closedAt === "string" ? new Date(closedAt) : null,
      options: {
        create: (optionLabels as string[]).map((label) => ({ label: label.trim() })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      options: { include: { _count: { select: { responses: true } } } },
    },
  });

  const result = {
    ...vote,
    options: vote.options.map((opt) => ({
      id: opt.id,
      label: opt.label,
      count: opt._count.responses,
      isMyVote: false,
    })),
  };

  return NextResponse.json(result, { status: 201 });
}
