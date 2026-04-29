"use client";

import { useEffect, useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface VoteOption {
  id: string;
  label: string;
  count: number;
  isMyVote: boolean;
}

interface Vote {
  id: string;
  title: string;
  description: string | null;
  createdById: string;
  createdBy: { id: string; name: string };
  closedAt: string | null;
  createdAt: string;
  options: VoteOption[];
}

interface Props {
  taskGroupId: string;
  userId: string;
  canCreate: boolean;
}

interface CreateModalProps {
  loading: boolean;
  error: string | null;
  onSubmit: (data: { title: string; description: string; options: string[]; closedAt: string }) => void;
  onClose: () => void;
}

function CreateVoteModal({ loading, error, onSubmit, onClose }: CreateModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closedAt, setClosedAt] = useState("");

  function addOption() {
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function setOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  const canSubmit =
    title.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: PRIMARY }}>建立投票</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>
              標題 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="投票標題"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>描述（選填）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: PRIMARY }}>
              選項（至少兩個）
            </label>
            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => setOption(idx, e.target.value)}
                    placeholder={`選項 ${idx + 1}`}
                    className="flex-1 rounded-xl border px-3 py-1.5 text-sm outline-none"
                    style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(idx)}
                      className="text-xs text-red-300 hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-left hover:opacity-70"
                style={{ color: SECONDARY }}
              >
                + 新增選項
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: PRIMARY }}>截止時間（選填）</label>
            <input
              type="datetime-local"
              value={closedAt}
              onChange={(e) => setClosedAt(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border"
            style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
          >
            取消
          </button>
          <button
            onClick={() => onSubmit({ title, description, options, closedAt })}
            disabled={loading || !canSubmit}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {loading ? "建立中…" : "建立投票"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VoteCardProps {
  vote: Vote;
  userId: string;
  taskGroupId: string;
  onVoted: (voteId: string, optionId: string) => void;
  onClosed: (voteId: string) => void;
}

function VoteCard({ vote, userId, taskGroupId, onVoted, onClosed }: VoteCardProps) {
  const isOwner = vote.createdById === userId;
  const isClosed = !!vote.closedAt && new Date(vote.closedAt) <= new Date();
  const totalVotes = vote.options.reduce((s, o) => s + o.count, 0);

  async function castVote(optionId: string) {
    const res = await fetch(
      `/api/exec/task-groups/${taskGroupId}/votes/${vote.id}/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteOptionId: optionId }),
      }
    );
    if (res.ok) onVoted(vote.id, optionId);
  }

  async function closeVote() {
    const res = await fetch(
      `/api/exec/task-groups/${taskGroupId}/votes/${vote.id}/close`,
      { method: "PATCH" }
    );
    if (res.ok) onClosed(vote.id);
  }

  return (
    <div
      className="rounded-2xl border p-5 bg-white shadow-sm"
      style={{ borderColor: `${SECONDARY}44` }}
    >
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-bold" style={{ color: PRIMARY }}>{vote.title}</h3>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              backgroundColor: isClosed ? "#f3f4f6" : "#dcfce7",
              color: isClosed ? "#6b7280" : "#16a34a",
            }}
          >
            {isClosed ? "已關閉" : "進行中"}
          </span>
          {isOwner && !isClosed && (
            <button
              onClick={closeVote}
              className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
            >
              關閉投票
            </button>
          )}
        </div>
      </div>

      {vote.description && (
        <p className="text-xs text-gray-500 mb-3">{vote.description}</p>
      )}

      <div className="flex flex-col gap-2 mt-3">
        {vote.options.map((opt) => {
          const pct = totalVotes === 0 ? 0 : Math.round((opt.count / totalVotes) * 100);
          return (
            <div key={opt.id}>
              <div className="flex items-center justify-between mb-0.5">
                <button
                  disabled={isClosed}
                  onClick={() => !isClosed && castVote(opt.id)}
                  className="text-xs text-left transition-opacity disabled:cursor-default"
                  style={{
                    color: opt.isMyVote ? SECONDARY : PRIMARY,
                    fontWeight: opt.isMyVote ? 700 : 400,
                  }}
                >
                  {opt.isMyVote ? "✓ " : ""}{opt.label}
                </button>
                <span className="text-xs text-gray-400 ml-2 shrink-0">
                  {opt.count} 票 ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#f3f4f6" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: opt.isMyVote ? SECONDARY : `${PRIMARY}66`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        共 {totalVotes} 票　·　建立者：{vote.createdBy.name}
      </p>
    </div>
  );
}

export default function VotePanel({ taskGroupId, userId, canCreate }: Props) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/exec/task-groups/${taskGroupId}/votes`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setVotes(data as Vote[]);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [taskGroupId]);

  async function handleCreate(data: {
    title: string;
    description: string;
    options: string[];
    closedAt: string;
  }) {
    setModalLoading(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/exec/task-groups/${taskGroupId}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          options: data.options.filter((o) => o.trim().length > 0),
          closedAt: data.closedAt || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setModalError(json.error ?? "建立失敗");
        return;
      }
      setVotes((prev) => [json as Vote, ...prev]);
      setShowModal(false);
    } catch {
      setModalError("網路錯誤");
    } finally {
      setModalLoading(false);
    }
  }

  function handleVoted(voteId: string, optionId: string) {
    setVotes((prev) =>
      prev.map((v) => {
        if (v.id !== voteId) return v;
        const hadVoted = v.options.find((o) => o.isMyVote);
        return {
          ...v,
          options: v.options.map((o) => ({
            ...o,
            isMyVote: o.id === optionId,
            count:
              o.id === optionId
                ? o.count + 1
                : o.id === hadVoted?.id
                ? o.count - 1
                : o.count,
          })),
        };
      })
    );
  }

  function handleClosed(voteId: string) {
    setVotes((prev) =>
      prev.map((v) =>
        v.id === voteId ? { ...v, closedAt: new Date().toISOString() } : v
      )
    );
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-gray-400">載入中…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {canCreate && (
        <div className="flex justify-end">
          <button
            onClick={() => { setShowModal(true); setModalError(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            + 建立投票
          </button>
        </div>
      )}

      {votes.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">還沒有投票</p>
      )}

      {votes.map((vote) => (
        <VoteCard
          key={vote.id}
          vote={vote}
          userId={userId}
          taskGroupId={taskGroupId}
          onVoted={handleVoted}
          onClosed={handleClosed}
        />
      ))}

      {showModal && (
        <CreateVoteModal
          loading={modalLoading}
          error={modalError}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
