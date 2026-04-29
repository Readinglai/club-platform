"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Row {
  id: string;
  title: string;
  published: boolean;
  createdAt: string;
  authorName: string;
}

interface Props {
  announcements: Row[];
  locale: string;
}

export default function AnnouncementsTable({ announcements: initial, locale }: Props) {
  const router = useRouter();
  const t = useTranslations("admin.announcements");
  const tc = useTranslations("admin.common");
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function togglePublish(id: string, published: boolean) {
    setLoading(id);
    const res = await fetch(`/api/announcements/${id}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, published: !published } : r)));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? t("operationFailed"));
    }
    setLoading(null);
  }

  async function deleteAnnouncement(id: string, title: string) {
    if (!confirm(t("confirmDelete", { title }))) return;
    setLoading(id);
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? tc("deleteFailed"));
    }
    setLoading(null);
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
            {[
              t("tableTitle"),
              t("tableAuthor"),
              t("tableCreatedAt"),
              t("tableStatus"),
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
          {rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium max-w-xs truncate" style={{ color: PRIMARY }}>
                {row.title}
              </td>
              <td className="px-4 py-3 text-gray-500">{row.authorName}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(row.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={
                    row.published
                      ? { backgroundColor: "#d1fae5", color: "#065f46" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                  }
                >
                  {row.published ? tc("published") : tc("draft")}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/admin/announcements/${row.id}`}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70"
                    style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
                  >
                    {tc("edit")}
                  </Link>
                  <button
                    onClick={() => togglePublish(row.id, row.published)}
                    disabled={loading === row.id}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#c9b99a", backgroundColor: `${SECONDARY}18` }}
                  >
                    {row.published ? tc("unpublish") : tc("publish")}
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(row.id, row.title)}
                    disabled={loading === row.id}
                    className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                    style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                  >
                    {tc("delete")}
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
