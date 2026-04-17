"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface EventRow {
  id: string;
  title: string;
  startAt: string;
  location: string | null;
  capacity: number | null;
  published: boolean;
  registrationCount: number;
}

interface Props {
  events: EventRow[];
  locale: string;
}

export default function EventsTable({ events: initial, locale }: Props) {
  const router = useRouter();
  const [events, setEvents] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function togglePublish(id: string, published: boolean) {
    setLoading(id);
    await fetch(`/api/admin/events/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, published: !published } : e))
    );
    setLoading(null);
  }

  async function deleteEvent(id: string, title: string) {
    if (!confirm(`確定要刪除「${title}」？此操作無法復原。`)) return;
    setLoading(id);
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? "刪除失敗");
    }
    setLoading(null);
    router.refresh();
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        尚無活動。點擊右上角「建立活動」開始新增。
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
            {["標題", "開始時間", "地點", "容量", "已報名", "狀態", "操作"].map((h) => (
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
          {events.map((event) => (
            <tr key={event.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>
                {event.title}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {new Date(event.startAt).toLocaleDateString("zh-TW")}
              </td>
              <td className="px-4 py-3 text-gray-500">{event.location ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500">{event.capacity ?? "不限"}</td>
              <td className="px-4 py-3 text-gray-500">{event.registrationCount}</td>
              <td className="px-4 py-3">
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={
                    event.published
                      ? { backgroundColor: "#d1fae5", color: "#065f46" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {event.published ? "已發布" : "草稿"}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/admin/events/${event.id}`}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70"
                    style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
                  >
                    編輯
                  </Link>
                  <button
                    onClick={() => togglePublish(event.id, event.published)}
                    disabled={loading === event.id}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#c9b99a", backgroundColor: `${SECONDARY}18` }}
                  >
                    {event.published ? "下架" : "發布"}
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id, event.title)}
                    disabled={loading === event.id}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                  >
                    刪除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
