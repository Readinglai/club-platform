"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
}

export default function ImportForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setParseError(null);

    const fd = new FormData(e.currentTarget);
    const raw = (fd.get("csv") as string).trim();

    const members: { email: string; name: string; role?: string; departmentId?: string }[] = [];

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(",").map((p) => p.trim());
      if (parts.length < 2) {
        setParseError(`格式錯誤（需至少兩欄）：${trimmed}`);
        setSubmitting(false);
        return;
      }
      const [email, name, role, departmentId] = parts;
      members.push({
        email,
        name,
        ...(role && { role }),
        ...(departmentId && { departmentId }),
      });
    }

    if (members.length === 0) {
      setParseError("沒有可匯入的資料，請確認格式是否正確。");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/members/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        router.refresh();
      } else {
        setParseError(data.error ?? "匯入失敗");
      }
    } catch {
      setParseError("網路錯誤，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 格式說明 */}
      <div
        className="rounded-xl p-5 text-sm"
        style={{ backgroundColor: `${PRIMARY}08`, color: PRIMARY }}
      >
        <p className="font-semibold mb-2">格式說明</p>
        <p className="text-xs text-gray-500 mb-3">每行一筆，以逗號分隔，後兩欄選填：</p>
        <code
          className="block text-xs p-3 rounded-lg"
          style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
        >
          email,姓名,角色,部門ID{"\n"}
          alice@mail.utoronto.ca,Alice Chen,EXEC,{"\n"}
          bob@mail.utoronto.ca,Bob Wang,MEMBER,dept_id_here
        </code>
        <p className="text-xs text-gray-400 mt-3">
          角色可填：SUPER_ADMIN / EXEC / TEAM_LEAD / MEMBER（預設 MEMBER）
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5">
        {parseError && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {parseError}
          </div>
        )}

        {result && (
          <div className="px-4 py-4 rounded-lg bg-green-50 border border-green-200 text-sm">
            <p className="font-semibold text-green-700 mb-1">匯入完成</p>
            <p className="text-green-600">新建：{result.imported} 筆　更新：{result.updated} 筆</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600 font-medium">錯誤（{result.errors.length} 筆）：</p>
                <ul className="mt-1 text-xs text-red-500 list-disc list-inside">
                  {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            成員資料（CSV 格式）
          </label>
          <textarea
            name="csv"
            required
            rows={12}
            placeholder={"alice@mail.utoronto.ca,Alice Chen,EXEC,\nbob@mail.utoronto.ca,Bob Wang,MEMBER,"}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 resize-y"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {submitting ? "匯入中…" : "開始匯入"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/admin/members`)}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
            style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
          >
            返回列表
          </button>
        </div>
      </form>
    </div>
  );
}
