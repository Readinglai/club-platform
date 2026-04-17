/**
 * portal/profile/edit/page.tsx — 個人資料編輯頁（Client Component）
 *
 * 功能：讓使用者修改姓名與大頭貼 URL
 * 輸入：姓名（text input）、大頭貼 URL（text input）
 * 輸出：呼叫 PATCH /api/user/profile，成功後導向 /portal/profile
 * 驗證：未登入導向 /login（透過 API 回傳 401 後處理）
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function EditProfilePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 頁面載入時取得目前資料填入表單
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setName(data.name ?? "");
          setImage(data.image ?? "");
        }
      })
      .catch(() => setError("無法載入資料，請重新整理"))
      .finally(() => setFetchLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新失敗，請稍後再試");
        return;
      }

      setSuccess(true);
      // 短暫顯示成功訊息後導向資料頁
      setTimeout(() => router.push("/portal/profile"), 800);
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#f9f7f4" }}
      >
        <p style={{ color: "#9ca3af" }}>載入中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section className="px-4 py-12" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-2xl mx-auto">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            Portal / 個人資料
          </p>
          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>
            編輯資料
          </h1>
        </div>
      </section>

      {/* 表單 */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl bg-white shadow-sm p-8"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* 姓名 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="name"
                className="text-xs uppercase tracking-wide"
                style={{ color: "#9ca3af" }}
              >
                姓名
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="請輸入姓名"
                required
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#374151",
                }}
              />
            </div>

            {/* 大頭貼 URL */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="image"
                className="text-xs uppercase tracking-wide"
                style={{ color: "#9ca3af" }}
              >
                大頭貼 URL
              </label>
              <input
                id="image"
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#e5e7eb",
                  color: "#374151",
                }}
              />
            </div>

            {/* 錯誤 / 成功訊息 */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            {success && (
              <p className="text-sm" style={{ color: "#16a34a" }}>
                更新成功，正在跳轉…
              </p>
            )}

            {/* 按鈕列 */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
              >
                {loading ? "儲存中…" : "儲存"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/portal/profile")}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
