"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PRIMARY, send } from "../../events/EventFields";

type Row = { id: string; title: string; published: boolean; createdAt: string; authorName: string; reads: number };

export default function AnnouncementsManager({ initial }: { initial: Row[] }) {
  const t = useTranslations("portal.manageAnnouncementsPage");
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function togglePublish(row: Row) {
    if (!row.published && !confirm(t("confirmPublish", { title: row.title }))) return;
    setBusy(row.id);
    setError("");
    try {
      await send(`/api/announcements/${row.id}`, "PUT", { published: !row.published });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, published: !row.published } : r)));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    }
    setBusy(null);
  }

  async function remove(row: Row) {
    if (!confirm(t("confirmDelete", { title: row.title }))) return;
    setBusy(row.id);
    setError("");
    try {
      await send(`/api/announcements/${row.id}`, "DELETE");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveError"));
    }
    setBusy(null);
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <Link
        href="/portal/announcements/manage/new"
        className="self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        {t("new")}
      </Link>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-sm text-gray-500">{t("empty")}</li>}
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/portal/announcements/manage/${r.id}`} className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">{r.title}</span>
              <span className="text-xs text-gray-500">
                {r.authorName} · {new Date(r.createdAt).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" })}
                {r.published && ` · ${t("reads", { count: r.reads })}`}
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "#d6d4cc", color: r.published ? "#087208" : "#52514e" }}>
                {r.published ? t("published") : t("draft")}
              </span>
              <button
                onClick={() => togglePublish(r)}
                disabled={busy === r.id}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: "#d1d5db", color: PRIMARY }}
              >
                {r.published ? t("unpublish") : t("publish")}
              </button>
              <button
                onClick={() => remove(r)}
                disabled={busy === r.id}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
                style={{ borderColor: "#fecaca" }}
              >
                {t("delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
