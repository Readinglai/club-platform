"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ImageUpload from "@/components/admin/ImageUpload";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  id: string;
  initial: {
    title: string;
    year: number;
    description: string;
    imageUrl: string | null;
  };
  locale: string;
}

export default function AchievementEditForm({ id, initial, locale }: Props) {
  const t = useTranslations("admin.achievements");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [form, setForm] = useState({
    title: initial.title,
    year: String(initial.year),
    description: initial.description,
    imageUrl: initial.imageUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    if (!form.title.trim()) { setError(t("titleRequired")); return; }
    const year = parseInt(form.year, 10);
    if (!year || year < 2000 || year > 2100) { setError(t("yearInvalid")); return; }
    if (!form.description.trim()) { setError(t("descRequired")); return; }

    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/achievements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          year,
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? tc("saveFailed"));
      }
    } catch {
      setError(tc("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t("fieldTitle")}</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoComplete="off"
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t("fieldYear")}</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
            min={2000}
            max={2100}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <ImageUpload
            label={t("fieldImageUrl")}
            value={form.imageUrl}
            onChange={(v) => setForm((f) => ({ ...f, imageUrl: v }))}
            previewClassName="h-32 object-cover"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t("fieldDescription")}</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={8}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-y"
            style={{ borderColor: "#d1d5db" }}
          />
          <p className="text-xs text-gray-400">{t("descHint")}</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">{t("savedSuccess")}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {saving ? tc("saving") : tc("saveChanges")}
        </button>
        <a
          href={`/${locale}/admin/achievements`}
          className="px-5 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
          style={{ borderColor: "#d1d5db", color: "#374151" }}
        >
          {t("backToList")}
        </a>
      </div>
    </div>
  );
}
