"use client";

import { useEffect, useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Author {
  id: string;
  name: string;
}

interface Comment {
  id: string;
  content: string;
  isAnonymous: boolean;
  authorId: string | null;
  author: Author | null;
  createdAt: string;
}

interface Props {
  taskGroupId: string;
  userId: string;
}

export default function DiscussionPanel({ taskGroupId, userId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/exec/task-groups/${taskGroupId}/discussion`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setComments((data.comments as Comment[]) ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taskGroupId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/discussion/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim(), isAnonymous }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "發送失敗");
      } else {
        setComments((prev) => [...prev, data as Comment]);
        setContent("");
        setIsAnonymous(false);
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(
        `/api/exec/task-groups/${taskGroupId}/discussion/comments/${commentId}`,
        { method: "DELETE" }
      );
      if (res.ok || res.status === 204) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">載入中…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {comments.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">還沒有留言，來第一個吧！</p>
        )}
        {comments.map((c) => {
          const isOwn = !c.isAnonymous && c.authorId === userId;
          return (
            <div
              key={c.id}
              className="rounded-xl border px-4 py-3 bg-white"
              style={{ borderColor: `${SECONDARY}33` }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: PRIMARY }}>
                    {c.isAnonymous ? "匿名" : (c.author?.name ?? "未知")}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {new Date(c.createdAt).toLocaleString("zh-TW", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {isOwn && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-[11px] text-red-300 hover:text-red-500 transition-colors"
                  >
                    刪除
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border p-4 bg-white flex flex-col gap-3"
        style={{ borderColor: `${SECONDARY}44` }}
      >
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="輸入留言…"
          rows={3}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
          style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: PRIMARY }}>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            匿名發言
          </label>
          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-50"
              style={{ backgroundColor: PRIMARY, color: SECONDARY }}
            >
              {submitting ? "發送中…" : "發送"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
