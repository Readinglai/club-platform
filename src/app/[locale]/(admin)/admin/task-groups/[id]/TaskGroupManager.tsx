"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#16a34a",
  COMPLETED: "#2563eb",
  ARCHIVED: "#9ca3af",
};

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface Props {
  taskGroupId: string;
  initialStatus: string;
  initialMembers: Member[];
  isCreator: boolean;
}

export default function TaskGroupManager({
  taskGroupId,
  initialStatus,
  initialMembers,
  isCreator,
}: Props) {
  const t = useTranslations("admin.taskGroups");
  const [status, setStatus] = useState(initialStatus);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState<"LEADER" | "MEMBER">("MEMBER");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const STATUS_LABEL: Record<string, string> = {
    ACTIVE: t("statusActive"),
    COMPLETED: t("statusCompleted"),
    ARCHIVED: t("statusArchived"),
  };

  async function handleStatusChange(newStatus: string) {
    if (newStatus === status) return;
    setStatusLoading(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/exec/task-groups/${taskGroupId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStatusError(data.error ?? t("operationFailed"));
      } else {
        setStatus(newStatus);
      }
    } catch {
      setStatusError(t("networkError"));
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserId.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/exec/task-groups/${taskGroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addUserId.trim(), role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? t("operationFailed"));
      } else {
        setMembers((prev) => [...prev, data as Member]);
        setAddUserId("");
        setAddRole("MEMBER");
      }
    } catch {
      setAddError(t("networkError"));
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/members/${userId}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.user.id === userId ? { ...m, role: newRole } : m))
        );
      }
    } catch {
      // silent
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/members/${userId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        setMembers((prev) => prev.filter((m) => m.user.id !== userId));
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: PRIMARY }}>
          {t("sectionStatus")}
        </h2>
        <div className="flex items-center gap-3">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{
              backgroundColor: `${STATUS_COLOR[status]}18`,
              color: STATUS_COLOR[status],
            }}
          >
            {STATUS_LABEL[status] ?? status}
          </span>
          {isCreator && (
            <select
              value={status}
              disabled={statusLoading}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs rounded-lg border px-2 py-1.5 disabled:opacity-50"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            >
              <option value="ACTIVE">{t("statusActive")}</option>
              <option value="COMPLETED">{t("statusCompleted")}</option>
              <option value="ARCHIVED">{t("statusArchived")}</option>
            </select>
          )}
        </div>
        {statusError && <p className="text-xs text-red-500 mt-2">{statusError}</p>}
      </section>

      <section
        className="rounded-2xl border p-5"
        style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
      >
        <h2 className="text-sm font-bold mb-3" style={{ color: PRIMARY }}>
          {t("sectionMembers", { count: members.length })}
        </h2>

        <div className="flex flex-col gap-2 mb-4">
          {members.map((m) => (
            <div
              key={m.user.id}
              className="flex items-center justify-between px-3 py-2 rounded-xl border"
              style={{ borderColor: `${SECONDARY}22` }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: PRIMARY }}>
                  {m.user.name}
                </p>
                <p className="text-xs text-gray-400">{m.user.email}</p>
              </div>
              {isCreator ? (
                <div className="flex items-center gap-2">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                    className="text-xs rounded-lg border px-2 py-1"
                    style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
                  >
                    <option value="LEADER">{t("leaderRole")}</option>
                    <option value="MEMBER">{t("memberRole")}</option>
                  </select>
                  <button
                    onClick={() => handleRemoveMember(m.user.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
                  >
                    {t("remove")}
                  </button>
                </div>
              ) : (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
                >
                  {m.role === "LEADER" ? t("leaderRole") : t("memberRole")}
                </span>
              )}
            </div>
          ))}
        </div>

        {isCreator && (
          <form onSubmit={handleAddMember} className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: `${SECONDARY}33` }}>
            <p className="text-xs font-semibold" style={{ color: PRIMARY }}>
              {t("addMember")}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                placeholder="User ID"
                className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none"
                style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
              />
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as "LEADER" | "MEMBER")}
                className="rounded-xl border px-2 py-2 text-xs"
                style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
              >
                <option value="MEMBER">{t("memberRole")}</option>
                <option value="LEADER">{t("leaderRole")}</option>
              </select>
              <button
                type="submit"
                disabled={addLoading || !addUserId.trim()}
                className="px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
              >
                {addLoading ? "…" : t("add")}
              </button>
            </div>
            {addError && <p className="text-xs text-red-500">{addError}</p>}
          </form>
        )}
      </section>
    </div>
  );
}
