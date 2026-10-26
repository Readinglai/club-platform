"use client";

/** Pieces shared by the Tasks pages. */

import { useLocale, useTranslations } from "next-intl";

export const PRIMARY = "#1a2744";
export const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  groupId: string | null;
  group: { name: string } | null;
  assignees: Array<{ user: { id: string; name: string; email: string } }>;
};

export async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** Status shown with a word and a mark, never colour alone. */
export function StatusSelect({ value, onChange, disabled }: { value: TaskStatus; onChange: (s: TaskStatus) => void; disabled?: boolean }) {
  const t = useTranslations("portal.tasksPage");
  const mark: Record<TaskStatus, string> = { TODO: "○", IN_PROGRESS: "◐", DONE: "●" };
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-900"
      aria-label={t("status")}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {mark[s]} {t(`status${s}`)}
        </option>
      ))}
    </select>
  );
}

/** Past its due date and not done (checked when the label renders). */
function isOverdue(dueAt: string, done: boolean) {
  return !done && new Date(dueAt).getTime() < Date.now();
}

export function DueLabel({ dueAt, done }: { dueAt: string | null; done: boolean }) {
  const t = useTranslations("portal.tasksPage");
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  if (!dueAt) return null;
  const date = new Date(dueAt).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", month: "short", day: "numeric" });
  const overdue = isOverdue(dueAt, done);
  return (
    <span className="text-xs" style={{ color: overdue ? "#b42318" : "#6b7280" }}>
      {overdue ? `⚠ ${t("overdue", { date })}` : t("due", { date })}
    </span>
  );
}
