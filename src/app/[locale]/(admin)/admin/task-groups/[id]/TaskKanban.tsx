"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

interface TaskMember {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  assignee: TaskMember | null;
  dueAt: string | null;
}

interface Props {
  taskGroupId: string;
  initialTasks: Task[];
  members: TaskMember[];
  isMember: boolean;
  isLeader: boolean;
}

interface TaskFormData {
  title: string;
  description: string;
  assigneeId: string;
  dueAt: string;
  status: TaskStatus;
}

const DEFAULT_FORM: TaskFormData = {
  title: "",
  description: "",
  assigneeId: "",
  dueAt: "",
  status: "TODO",
};

interface TaskModalProps {
  mode: "create" | "edit";
  initialData?: Partial<TaskFormData>;
  defaultStatus?: TaskStatus;
  members: TaskMember[];
  loading: boolean;
  error: string | null;
  onSubmit: (data: TaskFormData) => void;
  onClose: () => void;
}

function TaskModal({
  mode,
  initialData,
  defaultStatus,
  members,
  loading,
  error,
  onSubmit,
  onClose,
}: TaskModalProps) {
  const t = useTranslations("admin.taskGroups");
  const tc = useTranslations("admin.common");
  const [form, setForm] = useState<TaskFormData>({
    ...DEFAULT_FORM,
    status: defaultStatus ?? "TODO",
    ...initialData,
  });

  function set(field: keyof TaskFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: PRIMARY }}>
            {mode === "create" ? t("createTaskTitle") : t("editTaskTitle")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              {t("taskFieldTitle")}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder={t("taskFieldTitle")}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              {t("taskFieldDesc")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              {t("taskFieldAssignee")}
            </label>
            <select
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            >
              <option value="">{t("unassigned")}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              {t("taskFieldDue")}
            </label>
            <input
              type="date"
              value={form.dueAt}
              onChange={(e) => set("dueAt", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          {mode === "edit" && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
                {t("taskFieldStatus")}
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
              >
                <option value="TODO">{t("taskStatusTodo")}</option>
                <option value="IN_PROGRESS">{t("taskStatusInProgress")}</option>
                <option value="DONE">{t("taskStatusDone")}</option>
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border"
            style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
          >
            {tc("cancel")}
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.title.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {loading ? tc("processing") : mode === "create" ? tc("create") : tc("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskKanban({
  taskGroupId,
  initialTasks,
  members,
  isMember,
  isLeader,
}: Props) {
  const t = useTranslations("admin.taskGroups");
  const tc = useTranslations("admin.common");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [createModal, setCreateModal] = useState<{ status: TaskStatus } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
    { key: "TODO", label: t("kanbanTodo"), color: "#6b7280" },
    { key: "IN_PROGRESS", label: t("kanbanInProgress"), color: "#2563eb" },
    { key: "DONE", label: t("kanbanDone"), color: "#16a34a" },
  ];

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  async function handleCreate(form: TaskFormData) {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/exec/task-groups/${taskGroupId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          assigneeId: form.assigneeId || undefined,
          dueAt: form.dueAt || undefined,
          status: createModal!.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? tc("createFailed"));
        return;
      }
      setTasks((prev) => [...prev, data as Task]);
      setCreateModal(null);
    } catch {
      setModalError(tc("networkError"));
    } finally {
      setModalLoading(false);
    }
  }

  async function handleEdit(form: TaskFormData) {
    if (!editModal) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/tasks/${editModal.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            assigneeId: form.assigneeId || null,
            dueAt: form.dueAt || null,
            status: form.status,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? tc("updateFailed"));
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === editModal.id ? (data as Task) : t)));
      setEditModal(null);
    } catch {
      setModalError(tc("networkError"));
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm(t("confirmDeleteTask"))) return;
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/tasks/${taskId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      // silent
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold mb-4" style={{ color: PRIMARY }}>
        {t("kanbanTitle")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-xs font-bold" style={{ color: PRIMARY }}>
                  {col.label}
                </span>
                <span className="text-xs text-gray-400">
                  ({tasksByStatus(col.key).length})
                </span>
              </div>
              {isMember && (
                <button
                  onClick={() => {
                    setCreateModal({ status: col.key });
                    setModalError(null);
                  }}
                  className="text-xs hover:opacity-70 transition-opacity"
                  style={{ color: SECONDARY }}
                >
                  {t("addTask")}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 min-h-[80px]">
              {tasksByStatus(col.key).map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border p-3 bg-white shadow-sm"
                  style={{ borderColor: `${SECONDARY}33` }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-medium leading-snug" style={{ color: PRIMARY }}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {isMember && (
                        <button
                          onClick={() => {
                            setEditModal(task);
                            setModalError(null);
                          }}
                          className="text-[11px] text-gray-400 hover:text-gray-600"
                        >
                          {tc("edit")}
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-[11px] text-red-300 hover:text-red-500"
                        >
                          {tc("delete")}
                        </button>
                      )}
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-400">
                      {task.assignee ? task.assignee.name : t("unassigned")}
                    </span>
                    {task.dueAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {createModal && (
        <TaskModal
          mode="create"
          defaultStatus={createModal.status}
          members={members}
          loading={modalLoading}
          error={modalError}
          onSubmit={handleCreate}
          onClose={() => setCreateModal(null)}
        />
      )}

      {editModal && (
        <TaskModal
          mode="edit"
          initialData={{
            title: editModal.title,
            description: editModal.description ?? "",
            assigneeId: editModal.assigneeId ?? "",
            dueAt: editModal.dueAt
              ? new Date(editModal.dueAt).toISOString().slice(0, 10)
              : "",
            status: editModal.status,
          }}
          members={members}
          loading={modalLoading}
          error={modalError}
          onSubmit={handleEdit}
          onClose={() => setEditModal(null)}
        />
      )}
    </section>
  );
}
