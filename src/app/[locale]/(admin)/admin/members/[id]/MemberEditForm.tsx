"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const ROLES = [
  { value: "SUPER_ADMIN", label: "超級管理員" },
  { value: "ADMIN",       label: "管理員" },
  { value: "EXEC",        label: "執委" },
  { value: "MEMBER",      label: "成員" },
];

interface Department {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  member: {
    id: string;
    name: string;
    role: string;
    departmentId: string | null;
  };
  departments: Department[];
  locale: string;
}

export default function MemberEditForm({ member, departments, locale }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      departmentId: fd.get("departmentId") as string || null,
    };

    const res = await fetch(`/api/admin/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "更新失敗，請稍後再試。");
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          成員資料已更新。
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          姓名 *
        </label>
        <input
          name="name"
          required
          defaultValue={member.name}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          角色
        </label>
        <select
          name="role"
          defaultValue={member.role}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          部門
        </label>
        <select
          name="departmentId"
          defaultValue={member.departmentId ?? ""}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        >
          <option value="">— 不分配部門 —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}（{d.slug}）</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {submitting ? "儲存中…" : "儲存變更"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/members`)}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
        >
          返回列表
        </button>
      </div>
    </form>
  );
}
