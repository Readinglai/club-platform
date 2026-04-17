"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  platinum: { bg: "#e0f2fe", color: "#0369a1" },
  gold:     { bg: "#fef9c3", color: "#854d0e" },
  silver:   { bg: "#f3f4f6", color: "#374151" },
  bronze:   { bg: "#ffedd5", color: "#9a3412" },
};

interface SponsorRow {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  latestTier: string | null;
  latestYear: number | null;
}

interface Props {
  sponsors: SponsorRow[];
  locale: string;
}

export default function SponsorsTable({ sponsors: initial, locale }: Props) {
  const router = useRouter();
  const [sponsors, setSponsors] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLogoUrl, setNewLogoUrl] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function createSponsor() {
    if (!newName.trim()) { setCreateError("名稱不能為空"); return; }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          logoUrl: newLogoUrl || null,
          website: newWebsite || null,
        }),
      });
      if (res.ok) {
        setShowNew(false);
        setNewName(""); setNewLogoUrl(""); setNewWebsite("");
        router.refresh();
      } else {
        const d = await res.json();
        setCreateError(d.error ?? "新增失敗");
      }
    } catch {
      setCreateError("網路錯誤，請稍後再試");
    } finally {
      setCreating(false);
    }
  }

  async function deleteSponsor(id: string, name: string) {
    if (!confirm(`確定要刪除「${name}」？所有歷史記錄也會一併刪除，此操作無法復原。`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== id));
      } else {
        const d = await res.json();
        alert(d.error ?? "刪除失敗");
      }
    } catch {
      alert("網路錯誤，請稍後再試");
    } finally {
      setLoading(null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 新增按鈕 */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew((v) => !v)}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {showNew ? "取消" : "+ 新增贊助商"}
        </button>
      </div>

      {/* 新增表單（inline） */}
      {showNew && (
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold" style={{ color: PRIMARY }}>新增贊助商</h2>
          {createError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{createError}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide">名稱 *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                placeholder="公司名稱"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Logo URL</label>
              <input
                value={newLogoUrl}
                onChange={(e) => setNewLogoUrl(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide">網站</label>
              <input
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={createSponsor}
              disabled={creating}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY, color: SECONDARY }}
            >
              {creating ? "建立中…" : "建立"}
            </button>
          </div>
        </div>
      )}

      {/* 列表 */}
      {sponsors.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">尚無贊助商資料。</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
                {["Logo", "名稱", "網站", "最新等級", "操作"].map((h) => (
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
              {sponsors.map((s) => {
                const tierStyle = s.latestTier ? TIER_STYLE[s.latestTier] : null;
                return (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {s.logoUrl ? (
                        <img
                          src={s.logoUrl}
                          alt={s.name}
                          className="h-8 w-auto object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div
                          className="h-8 w-12 rounded flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: `${PRIMARY}10`, color: `${PRIMARY}66` }}
                        >
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>{s.name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.website ? (
                        <a href={s.website} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-70">
                          {s.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {tierStyle && s.latestTier ? (
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={tierStyle}
                        >
                          {s.latestTier} {s.latestYear && `(${s.latestYear})`}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${locale}/admin/sponsors/${s.id}`}
                          className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70"
                          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
                        >
                          編輯
                        </Link>
                        <button
                          onClick={() => deleteSponsor(s.id, s.name)}
                          disabled={loading === s.id}
                          className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                          style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
