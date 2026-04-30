import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

const PROTECTED_EMAIL = "flyincloud2001@gmail.com";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: { select: { id: true, slug: true, name: true } },
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: "成員不存在" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const currentRole = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[currentRole] < 4) return NextResponse.json({ error: "需要 ADMIN 以上權限" }, { status: 403 });

    const { id } = await params;

    const target = await db.user.findUnique({ where: { id }, select: { email: true } });
    if (target?.email === PROTECTED_EMAIL && session.user.email !== PROTECTED_EMAIL) {
      return NextResponse.json({ error: "此帳號受系統保護，無法修改" }, { status: 403 });
    }

    const body = await request.json();
    const { name, role, departmentId, bio, major, rocsautYear, instagram, linkedin } = body;

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(departmentId !== undefined && {
          departmentId: departmentId === "" ? null : departmentId,
        }),
        ...(bio !== undefined && { bio: bio === "" ? null : bio }),
        ...(major !== undefined && { major: major === "" ? null : major }),
        ...(rocsautYear !== undefined && { rocsautYear: rocsautYear === null ? null : Number(rocsautYear) }),
        ...(instagram !== undefined && { instagram: instagram === "" ? null : instagram }),
        ...(linkedin !== undefined && { linkedin: linkedin === "" ? null : linkedin }),
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const currentRole = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[currentRole] < 4) return NextResponse.json({ error: "需要 ADMIN 以上權限" }, { status: 403 });

    const { id } = await params;

    const target = await db.user.findUnique({ where: { id }, select: { email: true } });
    if (!target) {
      return NextResponse.json({ error: "成員不存在" }, { status: 404 });
    }
    if (target.email === PROTECTED_EMAIL && session.user.email !== PROTECTED_EMAIL) {
      return NextResponse.json({ error: "此帳號受系統保護，無法修改" }, { status: 403 });
    }

    if (session.user.id === id) {
      return NextResponse.json({ error: "不能刪除自己的帳號" }, { status: 400 });
    }

    // Use a transaction to clear relations that lack onDelete: Cascade before deleting the user.
    await db.$transaction(async (tx) => {
      // Null out nullable references first
      await tx.comment.updateMany({ where: { authorId: id }, data: { authorId: null } });
      await tx.task.updateMany({ where: { assigneeId: id }, data: { assigneeId: null } });

      // Delete directly owned non-cascaded records
      await tx.registration.deleteMany({ where: { userId: id } });
      await tx.voteResponse.deleteMany({ where: { userId: id } });
      await tx.taskGroupMember.deleteMany({ where: { userId: id } });
      await tx.financeRecord.deleteMany({ where: { createdById: id } });
      await tx.announcement.deleteMany({ where: { authorId: id } });

      // Delete votes created by this user (cascade their options and responses)
      const userVotes = await tx.vote.findMany({ where: { createdById: id }, select: { id: true } });
      const userVoteIds = userVotes.map((v) => v.id);
      if (userVoteIds.length > 0) {
        const opts = await tx.voteOption.findMany({ where: { voteId: { in: userVoteIds } }, select: { id: true } });
        await tx.voteResponse.deleteMany({ where: { voteOptionId: { in: opts.map((o) => o.id) } } });
        await tx.voteOption.deleteMany({ where: { voteId: { in: userVoteIds } } });
        await tx.vote.deleteMany({ where: { createdById: id } });
      }

      // Delete task groups created by this user (cascade all their children)
      const userGroups = await tx.taskGroup.findMany({ where: { createdById: id }, select: { id: true } });
      const groupIds = userGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        const gVotes = await tx.vote.findMany({ where: { taskGroupId: { in: groupIds } }, select: { id: true } });
        const gVoteIds = gVotes.map((v) => v.id);
        if (gVoteIds.length > 0) {
          const gOpts = await tx.voteOption.findMany({ where: { voteId: { in: gVoteIds } }, select: { id: true } });
          await tx.voteResponse.deleteMany({ where: { voteOptionId: { in: gOpts.map((o) => o.id) } } });
          await tx.voteOption.deleteMany({ where: { voteId: { in: gVoteIds } } });
          await tx.vote.deleteMany({ where: { taskGroupId: { in: groupIds } } });
        }
        await tx.task.deleteMany({ where: { taskGroupId: { in: groupIds } } });
        const gDiscussions = await tx.discussion.findMany({ where: { taskGroupId: { in: groupIds } }, select: { id: true } });
        if (gDiscussions.length > 0) {
          await tx.comment.deleteMany({ where: { discussionId: { in: gDiscussions.map((d) => d.id) } } });
          await tx.discussion.deleteMany({ where: { taskGroupId: { in: groupIds } } });
        }
        await tx.taskGroupMember.deleteMany({ where: { taskGroupId: { in: groupIds } } });
        await tx.taskGroup.deleteMany({ where: { id: { in: groupIds } } });
      }

      // Delete the user — Account, Session, AnnouncementRead, PushSubscription cascade automatically
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
