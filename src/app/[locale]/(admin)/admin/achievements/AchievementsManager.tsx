"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import ImageUpload from "@/components/admin/ImageUpload";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface AchievementRow {
  id: string;
  title: string;
  year: number;
  imageUrl: string | null;
}

interface Props {
  achievements: AchievementRow[];
  locale: string;
}

const currentYear = new Date().getFullYear();

export default function AchievementsManager({ achievements: initial, locale }: Props) {
  const t = useTranslations("admin.achievements");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [achievements, setAchievements] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", year: String(currentYear), description: "", imageUrl: "" });

  const allYears = [...new Set(achievements.map((a) => a.year))].sort((a, b) => b - a);
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const filtered = filterYear ? achievements.filter((a) => a.year === filterYear) : achievements;

  async function createAchievement() {
    if (!form.title.trim()) { setCreateError(t("titleRequired")); return; }
    const year = parseInt(form.year, 10);
    if (!year || year < 2000 || year > 2100) { setCreateError(t("yearInvalid")); return; }
    if (!form.description.trim()) { setCreateError(t("descRequired")); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          year,
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setForm({ title: "", year: String(currentYear), description: "", imageUrl: "" });
        router.refresh();
      } else {
        const data = await res.json();
        setCreateError(data.error ?? tc("createFailed"));
      }
    } catch {
      setCreateError(tc("networkError"));
    } finally {
      setCreating(false);
    }
  }

  async function deleteAchievement(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/achievements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAchievements((prev) => prev.filter((a) => a.id !== id));
      } else {
        alert(tc("deleteFailed"));
      }
    } catch {
      alert(tc("networkError"));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t("filterYear")}</span>
          <button
            onClick={() => setFilterYear(null)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={
              filterYear === null
                ? { backgroundColor: PRIMARY, color: SECONDARY, borderColor: PRIMARY }
                : { backgroundColor: "white", color: PRIMARY, borderColor: "#d1d5db" }
            }
          >
            {t("filterAll")}
          </button>
          {allYears.map((y) => (
            <button
              key={y}
              onClick={() => setFilterYear(y)}
              className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
              style={
                filterYear === y
                  ? { backgroundColor: PRIMARY, color: SECONDARY, borderColor: PRIMARY }
                  : { backgroundColor: "white", color: PRIMARY, borderColor: "#d1d5db" }
              }
            >
              {y}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => { setShowNew(true); setCreateError(null); }}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {t("createButton")}
        </button>
      </div>

      {showNew && (
        <div className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-4" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="text-sm font-semibold" style={{ color: PRIMARY }}>{t("createFormTitle")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{t("fieldTitle")}</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                autoComplete="off"
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: "#d1d5db" }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">{t("fieldYear")}</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                min={2000}
                max={2100}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: "#d1d5db" }}
              />
            </div>
            <div className="sm:col-span-2">
              <ImageUpload
                label={t("fieldImageUrl")}
                value={form.imageUrl}
                onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
                previewClassName="h-14 w-24 object-cover"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs text-gray-500">{t("fieldDescription")}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 resize-y"
                style={{ borderColor: "#d1d5db" }}
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <div className="flex gap-2">
            <button
              onClick={createAchievement}
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY, color: SECONDARY }}
            >
              {creating ? tc("creating") : tc("create")}
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
              style={{ borderColor: "#d1d5db", color: "#374151" }}
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 rounded-xl bg-white border" style={{ borderColor: "#e5e7eb" }}>
          {filterYear ? t("emptyYear", { year: filterYear }) : t("emptyAll")}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "#f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">{t("tableYear")}</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500">{t("tableTitle")}</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("tableImage")}</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 text-right">{t("tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-5 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${SECONDARY}33`, color: PRIMARY }}
                    >
                      {a.year}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium" style={{ color: PRIMARY }}>{a.title}</td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt="" className="h-8 w-14 object-cover rounded" />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/achievements/${a.id}`}
                        className="px-3 py-1 rounded text-xs font-medium border transition-all hover:opacity-80"
                        style={{ borderColor: PRIMARY, color: PRIMARY }}
                      >
                        {tc("edit")}
                      </Link>
                      <button
                        onClick={() => deleteAchievement(a.id)}
                        disabled={deleting === a.id}
                        className="px-3 py-1 rounded text-xs font-medium border transition-all hover:opacity-80 disabled:opacity-50"
                        style={{ borderColor: "#ef4444", color: "#ef4444" }}
                      >
                        {deleting === a.id ? t("deleting") : tc("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
