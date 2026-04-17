/**
 * task-groups/[id]/page.tsx — 任務小組詳情頁
 *
 * 顯示小組資訊與成員，建立者可透過 TaskGroupManager 管理成員與狀態。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import TaskGroupManager from "./TaskGroupManager";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function TaskGroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

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
    },
  });

  if (!taskGroup) notFound();

  const isCreator = session?.user?.id === taskGroup.createdById;

  const members = taskGroup.members.map((m) => ({
    id: m.id,
    role: m.role,
    user: m.user,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Link
          href="/exec/task-groups"
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
    </div>
  );
}
