"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

type Role = "SUPER_ADMIN" | "ADMIN" | "EXEC" | "MEMBER";

const ROLE_BG: Record<Role, { bg: string; color: string }> = {
  SUPER_ADMIN: { bg: "#fee2e2", color: "#991b1b" },
  ADMIN:       { bg: "#dbeafe", color: "#1e40af" },
  EXEC:        { bg: "#ffedd5", color: "#9a3412" },
  MEMBER:      { bg: "#f3f4f6", color: "#6b7280" },
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
  const t = useTranslations("admin.members");
  const tc = useTranslations("admin.common");
  const [members, setMembers] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: t("roleSuperAdmin"),
    ADMIN: t("roleAdmin"),
    EXEC: t("roleExec"),
    MEMBER: t("roleMember"),
  };

  async function deleteMember(id: string, name: string) {
    if (id === currentUserId) {
      alert(t("cannotDeleteSelf"));
      return;
    }
    if (!confirm(t("confirmDelete", { name }))) return;

    setLoading(id);
    const res = await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? tc("deleteFailed"));
    }
    setLoading(null);
    router.refresh();
  }

  if (members.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">{t("emptyState")}</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
            {[
              t("tableHeader"),
              t("tableEmail"),
              t("tableRole"),
              t("tableDepartment"),
              t("tableJoinedAt"),
              t("tableActions"),
            ].map((h) => (
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
            const style = ROLE_BG[m.role] ?? ROLE_BG.MEMBER;
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
                    style={style}
                  >
                    {roleLabel[m.role] ?? m.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{m.departmentName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${locale}/admin/members/${m.id}`}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70"
                      style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
                    >
                      {tc("edit")}
                    </Link>
                    <button
                      onClick={() => deleteMember(m.id, m.name)}
                      disabled={loading === m.id || m.id === currentUserId}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-30"
                      style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                    >
                      {tc("delete")}
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
