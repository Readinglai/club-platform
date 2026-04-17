"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "已報名",
  CANCELLED: "已取消",
};

interface RegRow {
  id: string;
  status: string;
  attendedAt: string | null;
  createdAt: string;
  user: { name: string; email: string };
}

interface Props {
  eventId: string;
  registrations: RegRow[];
}

export default function RegistrationsTable({ eventId, registrations }: Props) {
  const [rows, setRows] = useState<RegRow[]>(registrations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleAttend(reg: RegRow) {
    setLoadingId(reg.id);
    const next = reg.attendedAt === null;
    const res = await fetch(
      `/api/admin/events/${eventId}/registrations/${reg.id}/attend`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attended: next }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === reg.id ? { ...r, attendedAt: updated.attendedAt } : r
        )
      );
    }
    setLoadingId(null);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-400">尚無報名記錄。</p>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
            {["姓名", "Email", "報名時間", "報名狀態", "出席打卡"].map((h) => (
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
          {rows.map((reg) => {
            const attended = reg.attendedAt !== null;
            return (
              <tr key={reg.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>
                  {reg.user.name}
                </td>
                <td className="px-4 py-3 text-gray-500">{reg.user.email}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(reg.createdAt).toLocaleDateString("zh-TW")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={
                      reg.status === "REGISTERED"
                        ? { backgroundColor: "#d1fae5", color: "#065f46" }
                        : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                    }
                  >
                    {STATUS_LABEL[reg.status] ?? reg.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleAttend(reg)}
                    disabled={loadingId === reg.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 disabled:opacity-40"
                    style={
                      attended
                        ? { borderColor: "#6ee7b7", color: "#065f46", backgroundColor: "#d1fae5" }
                        : { borderColor: `${SECONDARY}66`, color: PRIMARY, backgroundColor: "white" }
                    }
                  >
                    {loadingId === reg.id ? "…" : attended ? "已出席" : "標記出席"}
                  </button>
                  {attended && reg.attendedAt && (
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(reg.attendedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
