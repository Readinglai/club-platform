"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DueLabel, PRIMARY, send, StatusSelect, type TaskRow, type TaskStatus } from "./shared";

type Group = { id: string; name: string; parentId: string | null; openTasks: number };

export default function MyTasks() {
  const t = useTranslations("portal.tasksPage");
  const [data, setData] = useState<{ tasks: TaskRow[]; groups: Group[] } | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => setData(await send("/api/work/tasks", "GET")), []);

  useEffect(() => {
    let active = true;
    send("/api/work/tasks", "GET")
      .then((d) => active && setData(d))
      .catch(() => active && setError(t("loadError")));
    return () => {
      active = false;
    };
  }, [t]);

  async function setStatus(task: TaskRow, status: TaskStatus) {
    try {
      await send(`/api/work/tasks/${task.id}`, "PATCH", { status });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  if (!data) return <p className="mt-6 text-sm text-gray-600">{error || t("loading")}</p>;

  const ids = new Set(data.groups.map((g) => g.id));
  const names = new Map(data.groups.map((g) => [g.id, g.name]));

  return (
    <div className="mt-6 flex flex-col gap-8">
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("myTasks")}</h2>
        {data.tasks.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">{t("noMyTasks")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.tasks.map((task) => (
              <li key={task.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm" style={{ opacity: task.status === "DONE" ? 0.6 : 1 }}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
                    {task.groupId && (
                      <Link href={`/portal/tasks/groups/${task.groupId}`} className="underline">
                        {t("in", { group: task.group?.name ?? "" })}
                      </Link>
                    )}
                    <DueLabel dueAt={task.dueAt} done={task.status === "DONE"} />
                  </p>
                </div>
                <StatusSelect value={task.status} onChange={(s) => void setStatus(task, s)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("myGroups")}</h2>
        {data.groups.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">{t("noGroups")}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.groups.map((g) => (
              <li key={g.id}>
                <Link href={`/portal/tasks/groups/${g.id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold" style={{ color: PRIMARY }}>{g.name}</span>
                    {g.parentId && ids.has(g.parentId) && <span className="text-xs text-gray-500">{names.get(g.parentId)}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">{t("open", { count: g.openTasks })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
