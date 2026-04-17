"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    if (!form.title.trim()) { setError("標題不能為空"); return; }
    const year = parseInt(form.year, 10);
    if (!year || year < 2000 || year > 2100) { setError("請輸入有效的年份"); return; }
    if (!form.description.trim()) { setError("描述不能為空"); return; }

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
        setError(data.error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500">標題 *</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">年份 *</label>
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
          <label className="text-xs font-medium text-gray-500">圖片 URL</label>
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://..."
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            style={{ borderColor: "#d1d5db" }}
          />
        </div>

        {form.imageUrl && (
          <div className="sm:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt="Preview" className="h-32 rounded-lg object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500">描述 *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={8}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-y"
            style={{ borderColor: "#d1d5db" }}
          />
          <p className="text-xs text-gray-400">段落間以空行（\n\n）分隔；以 - 開頭的行會被渲染為項目符號列表。</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs text-green-600">已儲存！</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {saving ? "儲存中…" : "儲存變更"}
        </button>
        <a
          href={`/${locale}/admin/achievements`}
          className="px-5 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-80"
          style={{ borderColor: "#d1d5db", color: "#374151" }}
        >
          返回列表
        </a>
      </div>
    </div>
  );
}
