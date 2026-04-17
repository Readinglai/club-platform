"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface RegistrationRow {
  id: string;
  status: string;
  attended: boolean;
  attendedAt: string | null;
  userName: string;
  userEmail: string;
}

interface EventRow {
  id: string;
  title: string;
  startAt: string;
  totalRegistrations: number;
  attended: number;
  attendanceRate: number;
  registrations: RegistrationRow[];
}

function rateStyle(rate: number) {
  if (rate >= 80) return { color: "#065f46", backgroundColor: "#d1fae5" };
  if (rate >= 50) return { color: "#92400e", backgroundColor: "#fef3c7" };
  return { color: "#991b1b", backgroundColor: "#fee2e2" };
}

export default function AttendanceList({ events }: { events: EventRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (events.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-16">尚無活動資料。</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((e) => {
        const isOpen = expanded.has(e.id);
        const style = rateStyle(e.attendanceRate);
        return (
          <div key={e.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* 活動列（可點擊展開） */}
            <button
              onClick={() => toggle(e.id)}
              className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <span
                className="text-sm shrink-0"
                style={{ color: `${PRIMARY}44` }}
              >
                {isOpen ? "▾" : "▸"}
              </span>

              <span className="flex-1 font-medium text-sm" style={{ color: PRIMARY }}>
                {e.title}
              </span>

              <span className="text-xs text-gray-400 shrink-0">
                {new Date(e.startAt).toLocaleDateString("zh-TW")}
              </span>

              <span className="text-xs text-gray-500 shrink-0 w-20 text-right">
                {e.attended} / {e.totalRegistrations} 人
              </span>

              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 w-16 text-center"
                style={style}
              >
                {e.attendanceRate}%
              </span>
            </button>

            {/* 展開：報名者列表 */}
            {isOpen && (
              <div className="border-t" style={{ borderColor: `${SECONDARY}22` }}>
                {e.registrations.length === 0 ? (
                  <p className="px-5 py-4 text-xs text-gray-400">無報名記錄</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ backgroundColor: `${PRIMARY}05` }}>
                        {["姓名", "Email", "狀態", "出席時間"].map((h) => (
                          <th
                            key={h}
                            className="text-left px-5 py-2.5 font-semibold uppercase tracking-wide"
                            style={{ color: `${PRIMARY}88` }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {e.registrations.map((r) => (
                        <tr key={r.id} className="border-t last:border-0" style={{ borderColor: `${PRIMARY}08` }}>
                          <td className="px-5 py-2.5 font-medium" style={{ color: PRIMARY }}>
                            {r.userName}
                          </td>
                          <td className="px-5 py-2.5 text-gray-500">{r.userEmail}</td>
                          <td className="px-5 py-2.5">
                            <span
                              className="font-semibold px-2 py-0.5 rounded-full"
                              style={
                                r.attended
                                  ? { backgroundColor: "#d1fae5", color: "#065f46" }
                                  : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                              }
                            >
                              {r.attended ? "已出席" : "未出席"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-gray-400">
                            {r.attendedAt
                              ? new Date(r.attendedAt).toLocaleString("zh-TW")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
