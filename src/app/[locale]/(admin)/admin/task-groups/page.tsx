import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import Link from "next/link";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "進行中",
  COMPLETED: "已完成",
  ARCHIVED: "已封存",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#16a34a",
  COMPLETED: "#2563eb",
  ARCHIVED: "#9ca3af",
};

export const dynamic = "force-dynamic";

export default async function TaskGroupsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAuth(3);
  const { locale } = await params;

  const taskGroups = await db.taskGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          任務小組
        </h1>
        <Link
          href={`/${locale}/admin/task-groups/new`}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          + 建立小組
        </Link>
      </div>

      {taskGroups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">尚無任務小組，點擊右上角建立第一個</div>
      ) : (
        <div className="flex flex-col gap-3">
          {taskGroups.map((tg) => (
            <Link
              key={tg.id}
              href={`/${locale}/admin/task-groups/${tg.id}`}
              className="flex items-center justify-between px-5 py-4 rounded-2xl border shadow-sm transition-all hover:shadow-md hover:scale-[1.005]"
              style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-sm font-bold truncate" style={{ color: PRIMARY }}>
                    {tg.name}
                  </h2>
                  <span
                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: `${STATUS_COLOR[tg.status]}18`,
                      color: STATUS_COLOR[tg.status],
                    }}
                  >
                    {STATUS_LABEL[tg.status] ?? tg.status}
                  </span>
                </div>
                {tg.description && (
                  <p className="text-xs text-gray-500 truncate">{tg.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  建立者：{tg.createdBy.name}
                </p>
              </div>
              <div className="ml-4 shrink-0 text-right">
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
                >
                  {tg._count.members} 人
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
