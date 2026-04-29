"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

type Role = "SUPER_ADMIN" | "ADMIN" | "EXEC" | "MEMBER";

const ROLE_STYLE: Record<Role, { bg: string; color: string; label: string }> = {
  SUPER_ADMIN: { bg: "#fee2e2", color: "#991b1b", label: "超級管理員" },
  ADMIN:       { bg: "#dbeafe", color: "#1e40af", label: "管理員" },
  EXEC:        { bg: "#ffedd5", color: "#9a3412", label: "執委" },
  MEMBER:      { bg: "#f3f4f6", color: "#6b7280", label: "成員" },
};

interface MemberRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentName: string | null;
  createdAt: string;
}

interface Props {
  members: MemberRow[];
  locale: string;
  currentUserId: string;
}

export default function MembersTable({ members: initial, locale, currentUserId }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function deleteMember(id: string, name: string) {
    if (id === currentUserId) {
      alert("不能刪除自己的帳號");
      return;
    }
    if (!confirm(`確定要刪除成員「${name}」？此操作無法復原。`)) return;

    setLoading(id);
    const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? "刪除失敗");
    }
    setLoading(null);
    router.refresh();
  }

  if (members.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">尚無成員資料。</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
            {["成員", "Email", "角色", "部門", "加入時間", "操作"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                style={{ color: PRIMARY }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const style = ROLE_STYLE[m.role] ?? ROLE_STYLE.MEMBER;
            const initials = m.name.slice(0, 2).toUpperCase();
            return (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: `${PRIMARY}18`, color: PRIMARY }}
                    >
                      {initials}
                    </div>
                    <span className="font-medium" style={{ color: PRIMARY }}>{m.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{m.email}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: style.bg, color: style.color }}
                  >
                    {style.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{m.departmentName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(m.createdAt).toLocaleDateString("zh-TW")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${locale}/admin/members/${m.id}`}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70"
                      style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
                    >
                      編輯
                    </Link>
                    <button
                      onClick={() => deleteMember(m.id, m.name)}
                      disabled={loading === m.id || m.id === currentUserId}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-30"
                      style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
