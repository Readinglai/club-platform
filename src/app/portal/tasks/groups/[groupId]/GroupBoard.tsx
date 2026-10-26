"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DueLabel, inputClass, PRIMARY, send, StatusSelect, type TaskRow, type TaskStatus } from "../../shared";

type Board = {
  group: { id: string; name: string };
  rights: { work: boolean; manage: boolean };
  tasks: TaskRow[];
  comments: Array<{ id: string; content: string; createdAt: string; author: string | null; mine: boolean }>;
  votes: Array<{
    id: string;
    title: string;
    description: string | null;
    closed: boolean;
    createdBy: string;
    mine: boolean;
    options: Array<{ id: string; label: string; count: number; chosen: boolean }>;
  }>;
};

type Tab = "tasks" | "discussion" | "votes";
type Person = { id: string; name: string; email: string };

export default function GroupBoard({ groupId }: { groupId: string }) {
  const t = useTranslations("portal.tasksPage");
  const [board, setBoard] = useState<Board | null>(null);
  const [tab, setTab] = useState<Tab>("tasks");
  const [error, setError] = useState("");
  const url = `/api/work/groups/${groupId}`;

  const reload = useCallback(async () => setBoard(await send(url, "GET")), [url]);

  useEffect(() => {
    let active = true;
    send(url, "GET")
      .then((d) => active && setBoard(d))
      .catch(() => active && setError(t("loadError")));
    return () => {
      active = false;
    };
  }, [url, t]);

  async function act(action: () => Promise<unknown>) {
    setError("");
    try {
      await action();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    }
  }

  if (!board) return <p className="text-sm text-gray-600">{error || t("loading")}</p>;

  const tabs: Array<[Tab, string]> = [
    ["tasks", `${t("tabTasks")} (${board.tasks.filter((x) => x.status !== "DONE").length})`],
    ["discussion", `${t("tabDiscussion")} (${board.comments.length})`],
    ["votes", `${t("tabVotes")} (${board.votes.filter((v) => !v.closed).length})`],
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{board.group.name}</h1>

      <div role="tablist" className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={tab === key ? { backgroundColor: PRIMARY, color: "#fff" } : { color: PRIMARY }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {tab === "tasks" && <TasksTab board={board} groupId={groupId} act={act} />}
      {tab === "discussion" && <DiscussionTab board={board} groupId={groupId} act={act} />}
      {tab === "votes" && <VotesTab board={board} groupId={groupId} act={act} />}
    </div>
  );
}

type TabProps = { board: Board; groupId: string; act: (a: () => Promise<unknown>) => Promise<void> };

function TasksTab({ board, groupId, act }: TabProps) {
  const t = useTranslations("portal.tasksPage");
  const [adding, setAdding] = useState(false);
  const order: TaskStatus[] = ["IN_PROGRESS", "TODO", "DONE"];
  const sorted = [...board.tasks].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <section className="flex flex-col gap-3">
      {!adding ? (
        <button className="self-start rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }} onClick={() => setAdding(true)}>
          {t("newTask")}
        </button>
      ) : (
        <TaskForm
          onCancel={() => setAdding(false)}
          onSave={async (v) => {
            await act(() => send(`/api/work/groups/${groupId}/tasks`, "POST", v));
            setAdding(false);
          }}
        />
      )}
      {sorted.length === 0 && <p className="text-sm text-gray-500">{t("noTasks")}</p>}
      {sorted.map((task) => (
        <TaskItem key={task.id} task={task} canDelete={board.rights.manage} act={act} />
      ))}
    </section>
  );
}

function TaskItem({ task, canDelete, act }: { task: TaskRow; canDelete: boolean; act: TabProps["act"] }) {
  const t = useTranslations("portal.tasksPage");
  const [editing, setEditing] = useState(false);
  const done = task.status === "DONE";

  if (editing) {
    return (
      <TaskForm
        initial={task}
        onCancel={() => setEditing(false)}
        onSave={async (v) => {
          await act(() => send(`/api/work/tasks/${task.id}`, "PATCH", v));
          setEditing(false);
        }}
      />
    );
  }

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm" style={{ opacity: done ? 0.6 : 1 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900" style={{ textDecoration: done ? "line-through" : undefined }}>{task.title}</h3>
          {task.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{task.description}</p>}
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-gray-500">
            <span>
              {t("assignees")}: {task.assignees.length ? task.assignees.map((a) => a.user.name || a.user.email).join(", ") : t("nobodyAssigned")}
            </span>
            <DueLabel dueAt={task.dueAt} done={done} />
          </p>
        </div>
        <StatusSelect value={task.status} onChange={(status) => void act(() => send(`/api/work/tasks/${task.id}`, "PATCH", { status }))} />
      </div>
      <div className="mt-2 flex gap-3 text-xs">
        <button className="underline" style={{ color: PRIMARY }} onClick={() => setEditing(true)}>{t("edit")}</button>
        {canDelete && (
          <button className="text-red-700 underline" onClick={() => confirm(t("deleteConfirm")) && act(() => send(`/api/work/tasks/${task.id}`, "DELETE"))}>
            {t("delete")}
          </button>
        )}
      </div>
    </article>
  );
}

function TaskForm({ initial, onSave, onCancel }: { initial?: TaskRow; onSave: (v: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  const t = useTranslations("portal.tasksPage");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueAt, setDueAt] = useState(initial?.dueAt ? new Date(initial.dueAt).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) : "");
  const [people, setPeople] = useState<Person[]>(initial?.assignees.map((a) => a.user) ?? []);

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm"
      style={{ border: `1px solid ${PRIMARY}33` }}
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ title, description, dueAt, assigneeIds: people.map((p) => p.id) });
      }}
    >
      <input className={inputClass} required placeholder={t("taskTitle")} value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className={inputClass} rows={2} placeholder={t("taskDescription")} value={description} onChange={(e) => setDescription(e.target.value)} />
      <label className="flex flex-col gap-1 text-xs text-gray-600">
        {t("dueDate")}
        <input className={inputClass} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
      </label>
      <PeoplePicker value={people} onChange={setPeople} />
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          {initial ? t("save") : t("add")}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{t("cancel")}</button>
      </div>
    </form>
  );
}

/** Search staff anywhere in the club and pick assignees. */
function PeoplePicker({ value, onChange }: { value: Person[]; onChange: (p: Person[]) => void }) {
  const t = useTranslations("portal.tasksPage");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      send(`/api/work/staff?q=${encodeURIComponent(query)}`, "GET")
        .then((d) => active && setResults(d.people))
        .catch(() => active && setResults([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const shown = query.trim().length < 2 ? [] : results.filter((r) => !value.some((v) => v.id === r.id));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-gray-600">{t("assign")}</span>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(value.filter((v) => v.id !== p.id))}
              className="rounded-full border px-2.5 py-1 text-xs"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
              aria-label={`${t("remove")} ${p.name || p.email}`}
            >
              {p.name || p.email} ✕
            </button>
          ))}
        </div>
      )}
      <input className={inputClass} placeholder={t("searchStaff")} value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length > 0 && (
        <ul className="rounded-lg border border-gray-200 bg-white text-sm">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onClick={() => {
                  onChange([...value, p]);
                  setQuery("");
                }}
              >
                {p.name} <span className="text-xs text-gray-500">{p.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DiscussionTab({ board, groupId, act }: TabProps) {
  const t = useTranslations("portal.tasksPage");
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      {board.comments.length === 0 && <p className="text-sm text-gray-500">{t("noComments")}</p>}
      <ul className="flex flex-col gap-2">
        {board.comments.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="flex justify-between gap-3 text-xs text-gray-500">
              <span>{c.author ?? t("anonymousName")}</span>
              <span>{new Date(c.createdAt).toLocaleString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" })}</span>
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-gray-900">{c.content}</p>
            {(c.mine || board.rights.manage) && (
              <button className="mt-1 text-xs text-red-700 underline" onClick={() => confirm(t("removeConfirm")) && act(() => send(`/api/work/comments/${c.id}`, "DELETE"))}>
                {t("remove")}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          await act(() => send(`/api/work/groups/${groupId}/comments`, "POST", { content, anonymous }));
          setContent("");
          setAnonymous(false);
        }}
      >
        <textarea className={inputClass} rows={3} required placeholder={t("writeMessage")} value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            {t("anonymous")}
          </label>
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>{t("post")}</button>
        </div>
      </form>
    </section>
  );
}

function VotesTab({ board, groupId, act }: TabProps) {
  const t = useTranslations("portal.tasksPage");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState("");

  return (
    <section className="flex flex-col gap-3">
      {!creating ? (
        <button className="self-start rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }} onClick={() => setCreating(true)}>
          {t("newVote")}
        </button>
      ) : (
        <form
          className="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            await act(() => send(`/api/work/groups/${groupId}/votes`, "POST", { title, options: options.split("\n") }));
            setCreating(false);
            setTitle("");
            setOptions("");
          }}
        >
          <input className={inputClass} required placeholder={t("question")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea className={inputClass} rows={3} required placeholder={t("optionsHint")} value={options} onChange={(e) => setOptions(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>{t("startVote")}</button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{t("cancel")}</button>
          </div>
        </form>
      )}
      {board.votes.length === 0 && <p className="text-sm text-gray-500">{t("noVotes")}</p>}
      {board.votes.map((v) => {
        const total = v.options.reduce((s, o) => s + o.count, 0);
        return (
          <article key={v.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900">{v.title}</h3>
              {v.closed && <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-gray-600">✓ {t("closed")}</span>}
            </div>
            <p className="text-xs text-gray-500">{t("startedBy", { name: v.createdBy })} · {t("votes", { count: total })}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {v.options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    disabled={v.closed}
                    onClick={() => void act(() => send(`/api/work/votes/${v.id}/respond`, "POST", { optionId: o.id }))}
                    className="w-full rounded-lg border px-3 py-2 text-left text-sm disabled:cursor-default"
                    style={{ borderColor: o.chosen ? PRIMARY : "#e5e7eb" }}
                    aria-pressed={o.chosen}
                  >
                    <span className="flex justify-between gap-3">
                      <span>{o.chosen ? "● " : "○ "}{o.label}{o.chosen && <span className="text-xs text-gray-500"> · {t("yourChoice")}</span>}</span>
                      <span className="tabular-nums text-gray-600">{o.count}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 rounded-r" style={{ backgroundColor: "#e5e4df" }}>
                      <span className="block h-1.5 rounded-r" style={{ width: `${total ? (o.count / total) * 100 : 0}%`, backgroundColor: "#2a78d6" }} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {!v.closed && (v.mine || board.rights.manage) && (
              <button className="mt-2 text-xs underline" style={{ color: PRIMARY }} onClick={() => confirm(t("closeConfirm")) && act(() => send(`/api/work/votes/${v.id}/close`, "POST"))}>
                {t("close")}
              </button>
            )}
          </article>
        );
      })}
    </section>
  );
}
