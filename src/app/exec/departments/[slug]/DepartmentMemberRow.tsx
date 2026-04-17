"use client";

/**
 * DepartmentMemberRow.tsx — 部門成員角色下拉選單
 *
 * Client Component：顯示成員資訊，並提供角色修改的下拉選單。
 */

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "超級管理員",
  EXEC: "執委",
  TEAM_LEAD: "組長",
  MEMBER: "組員",
  PUBLIC: "訪客",
};

interface Props {
  slug: string;
  member: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function DepartmentMemberRow({ slug, member }: Props) {
  const [role, setRole] = useState(member.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(newRole: string) {
    if (newRole === role) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exec/departments/${slug}/members/${member.id}/role`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "操作失敗");
      } else {
        setRole(newRole);
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl border"
      style={{ borderColor: `${SECONDARY}33`, backgroundColor: "white" }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
          {member.name}
        </p>
        <p className="text-xs text-gray-400">{member.email}</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      <select
        value={role}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
        className="text-xs rounded-lg border px-2 py-1.5 disabled:opacity-50 cursor-pointer"
        style={{
          borderColor: `${SECONDARY}55`,
          color: PRIMARY,
          backgroundColor: "white",
        }}
      >
        <option value="TEAM_LEAD">組長</option>
        <option value="MEMBER">組員</option>
      </select>
    </div>
  );
}
