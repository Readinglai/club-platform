"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  announcement: {
    id: string;
    title: string;
    content: string;
    published: boolean;
  };
  locale: string;
}

export default function AnnouncementEditForm({ announcement, locale }: Props) {
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
      content: fd.get("content") as string,
      published: fd.get("published") === "on",
    };

    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
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
    } catch {
      setError("網路錯誤，請稍後再試。");
    } finally {
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
      {success && (
        <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          公告已更新。
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          標題 *
        </label>
        <input
          name="title"
          required
          defaultValue={announcement.title}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          內容 *
        </label>
        <textarea
          name="content"
          required
          rows={8}
          defaultValue={announcement.content}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-y"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: PRIMARY }}>
        <input
          type="checkbox"
          name="published"
          defaultChecked={announcement.published}
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
          onClick={() => router.push(`/${locale}/admin/announcements`)}
          className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
        >
          返回列表
        </button>
      </div>
    </form>
  );
}
