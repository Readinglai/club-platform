"use client";

/**
 * TaskKanban.tsx — 任務看板（Client Component）
 *
 * 三欄 Kanban（TODO / IN_PROGRESS / DONE），支援新增、編輯、刪除任務。
 * 使用 /api/exec/task-groups/[id]/tasks 系列 API。
 */

import { useState, useCallback } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ── 型別 ────────────────────────────────────────────────────────────────────

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

// ── 常數 ────────────────────────────────────────────────────────────────────

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: "TODO", label: "待辦", color: "#6b7280" },
  { key: "IN_PROGRESS", label: "進行中", color: "#2563eb" },
  { key: "DONE", label: "已完成", color: "#16a34a" },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "待辦",
  IN_PROGRESS: "進行中",
  DONE: "已完成",
};

// ── Modal 表單 ───────────────────────────────────────────────────────────────

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
            {mode === "create" ? "新增任務" : "編輯任務"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* 標題 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              標題 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="任務名稱"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              描述（選填）
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="任務說明"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          {/* 負責人 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              負責人（選填）
            </label>
            <select
              value={form.assigneeId}
              onChange={(e) => set("assigneeId", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            >
              <option value="">未指派</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* 截止日 */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              截止日期（選填）
            </label>
            <input
              type="date"
              value={form.dueAt}
              onChange={(e) => set("dueAt", e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          {/* 狀態（僅編輯時顯示） */}
          {mode === "edit" && (
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
                狀態
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as TaskStatus)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
              >
                <option value="TODO">待辦</option>
                <option value="IN_PROGRESS">進行中</option>
                <option value="DONE">已完成</option>
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
            取消
          </button>
          <button
            onClick={() => onSubmit(form)}
            disabled={loading || !form.title.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {loading ? "處理中…" : mode === "create" ? "建立" : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 主元件 ──────────────────────────────────────────────────────────────────

export default function TaskKanban({
  taskGroupId,
  initialTasks,
  members,
  isMember,
  isLeader,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Modal 狀態
  const [createModal, setCreateModal] = useState<{ status: TaskStatus } | null>(null);
  const [editModal, setEditModal] = useState<Task | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const tasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  // ── 建立任務 ──────────────────────────────────────────────────────────────

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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "建立失敗");
        return;
      }
      setTasks((prev) => [...prev, { ...data, status: createModal!.status }]);
      // If the created task came back with different status (shouldn't happen), just use what server returns
      setTasks((prev) => prev.filter((t) => t.id !== data.id).concat(data as Task));
      setCreateModal(null);
    } catch {
      setModalError("網路錯誤");
    } finally {
      setModalLoading(false);
    }
  }

  // ── 更新任務 ──────────────────────────────────────────────────────────────

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
        setModalError(data.error ?? "更新失敗");
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === editModal.id ? (data as Task) : t)));
      setEditModal(null);
    } catch {
      setModalError("網路錯誤");
    } finally {
      setModalLoading(false);
    }
  }

  // ── 刪除任務 ──────────────────────────────────────────────────────────────

  async function handleDelete(taskId: string) {
    if (!confirm("確定要刪除此任務？")) return;
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

  // ── 渲染 ──────────────────────────────────────────────────────────────────

  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold mb-4" style={{ color: PRIMARY }}>
        任務看板
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className="flex flex-col gap-2">
            {/* 欄標題 */}
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
                  + 新增
                </button>
              )}
            </div>

            {/* 任務卡片 */}
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
                          編輯
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-[11px] text-red-300 hover:text-red-500"
                        >
                          刪除
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
                      {task.assignee ? task.assignee.name : "未指派"}
                    </span>
                    {task.dueAt && (
                      <span className="text-[11px] text-gray-400">
                        {new Date(task.dueAt).toLocaleDateString("zh-TW")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 建立 Modal */}
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

      {/* 編輯 Modal */}
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
