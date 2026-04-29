import { requireAuth } from "@/lib/auth/guard";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { notFound } from "next/navigation";
import Link from "next/link";
import TaskGroupManager from "./TaskGroupManager";
import TaskGroupTabs from "./TaskGroupTabs";
import type { Role } from "@/generated/prisma/client";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function TaskGroupDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await requireAuth(3);
  const { locale, id } = await params;

  const session = await auth();
  const userId = session?.user?.id ?? "";
  const globalRole = (session?.user?.role as Role | undefined) ?? "MEMBER";

  const taskGroup = await db.taskGroup.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      tasks: {
        orderBy: { createdAt: "asc" },
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!taskGroup) notFound();

  const isCreator = userId === taskGroup.createdById;
  const currentMember = taskGroup.members.find((m) => m.user.id === userId);
  const isMember = !!currentMember;
  const isLeader = currentMember?.role === "LEADER";
  const canCreateVote = isLeader || ROLE_LEVEL[globalRole] >= 3;

  const members = taskGroup.members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));

  const memberUsers = taskGroup.members.map((m) => m.user);

  const tasks = taskGroup.tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status as "TODO" | "IN_PROGRESS" | "DONE",
    assigneeId: t.assigneeId,
    assignee: t.assignee,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link
          href={`/${locale}/admin/task-groups`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          ← 任務小組列表
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: PRIMARY }}>
          {taskGroup.name}
        </h1>
        {taskGroup.description && (
          <p className="text-sm text-gray-500">{taskGroup.description}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          建立者：{taskGroup.createdBy.name}　·　建立於{" "}
          {taskGroup.createdAt.toLocaleDateString("zh-TW")}
        </p>
      </div>

      <TaskGroupManager
        taskGroupId={taskGroup.id}
        initialStatus={taskGroup.status}
        initialMembers={members}
        isCreator={isCreator}
      />

      <div className="mt-8">
        <TaskGroupTabs
          taskGroupId={taskGroup.id}
          initialTasks={tasks}
          memberUsers={memberUsers}
          isMember={isMember}
          isLeader={isLeader}
          userId={userId}
          canCreateVote={canCreateVote}
        />
      </div>
    </div>
  );
}
