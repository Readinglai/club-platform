"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  capacity: number | null;
  published: boolean;
}

interface Props {
  event: EventData;
  locale: string;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // Slice to "YYYY-MM-DDTHH:MM" format required by datetime-local input
  return new Date(iso).toISOString().slice(0, 16);
}

export default function EventEditForm({ event, locale }: Props) {
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
      title: fd.get("title") as string,
      description: fd.get("description") as string || null,
      startAt: fd.get("startAt") as string,
      endAt: fd.get("endAt") as string || null,
      location: fd.get("location") as string || null,
      capacity: fd.get("capacity") ? Number(fd.get("capacity")) : null,
      published: fd.get("published") === "on",
    };

    const res = await fetch(`/api/admin/events/${event.id}`, {
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
          活動已更新。
        </div>
      )}

      <Field label="標題 *">
        <input
          name="title"
          required
          defaultValue={event.title}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </Field>

      <Field label="描述">
        <textarea
          name="description"
          rows={3}
          defaultValue={event.description ?? ""}
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
            defaultValue={toDatetimeLocal(event.startAt)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
        <Field label="結束時間">
          <input
            name="endAt"
            type="datetime-local"
            defaultValue={toDatetimeLocal(event.endAt)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="地點">
          <input
            name="location"
            defaultValue={event.location ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
        <Field label="容量上限（留空表示不限）">
          <input
            name="capacity"
            type="number"
            min={1}
            defaultValue={event.capacity ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: PRIMARY }}>
        <input
          type="checkbox"
          name="published"
          defaultChecked={event.published}
          className="w-4 h-4 rounded"
        />
        已發布（取消勾選則切換為草稿）
      </label>

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
          onClick={() => router.push(`/${locale}/admin/events`)}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
        >
          返回列表
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
