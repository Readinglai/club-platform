"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  locale: string;
}

export default function NewEventForm({ locale }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title") as string,
      description: fd.get("description") as string || undefined,
      startAt: fd.get("startAt") as string,
      endAt: fd.get("endAt") as string || undefined,
      location: fd.get("location") as string || undefined,
      capacity: fd.get("capacity") ? Number(fd.get("capacity")) : undefined,
      published: fd.get("published") === "on",
    };

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        router.push(`/${locale}/admin/events`);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "建立失敗，請稍後再試。");
        setSubmitting(false);
      }
    } catch {
      setError("網路錯誤，請稍後再試。");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      <Field label="標題 *">
        <input
          name="title"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </Field>

      <Field label="描述">
        <textarea
          name="description"
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="開始時間 *">
          <input
            name="startAt"
            type="datetime-local"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
        <Field label="結束時間">
          <input
            name="endAt"
            type="datetime-local"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="地點">
          <input
            name="location"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
        <Field label="容量上限（留空表示不限）">
          <input
            name="capacity"
            type="number"
            min={1}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: PRIMARY }}>
        <input type="checkbox" name="published" className="w-4 h-4 rounded" />
        立即發布（取消勾選則儲存為草稿）
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {submitting ? "建立中…" : "建立活動"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
        >
          取消
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
