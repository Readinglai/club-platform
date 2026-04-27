"use client";

/**
 * AlumniManager — 後台校友管理 Client Component
 *
 * 功能：
 * - 列出所有校友（含隱藏記錄）
 * - 新增校友（展開表單）
 * - 切換 isPublic（顯示/隱藏）
 * - 刪除校友
 * - 點擊校友名稱可展開編輯表單（inline 編輯）
 *
 * Props：
 *   alumni   — 初始校友列表（由 Server Component 傳入）
 *   locale   — 當前語系
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRIMARY   = "#1a2744";
const SECONDARY = "#c9b99a";

interface AlumniRow {
  id: string;
  name: string;
  graduationYear: number | null;
  position: string | null;
  department: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  photoUrl: string | null;
  isPublic: boolean;
}

interface Props {
  alumni: AlumniRow[];
  locale: string;
}

// 空白表單預設值
const EMPTY_FORM = {
  name: "",
  graduationYear: "",
  position: "",
  department: "",
  bio: "",
  linkedinUrl: "",
  instagramUrl: "",
  photoUrl: "",
  isPublic: true,
};

// ── 通用表單欄位元件（減少重複） ──────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
      />
    </div>
  );
}

// ── 表單元件（新增與編輯共用結構）────────────────────────────────────────────
interface AlumniFormProps {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
}

function AlumniForm({ form, setForm, onSubmit, onCancel, submitting, error, submitLabel }: AlumniFormProps) {
  const update = (key: keyof typeof EMPTY_FORM) => (val: string | boolean) =>
    setForm({ ...form, [key]: val });

  return (
    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="姓名" value={form.name} onChange={update("name") as (v: string) => void} placeholder="例：陳大文" required />
        <Field label="離開年份" value={form.graduationYear} onChange={update("graduationYear") as (v: string) => void} placeholder="例：2024" type="number" />
        <Field label="擔任職位" value={form.position} onChange={update("position") as (v: string) => void} placeholder="例：President 2023–2024" />
        <Field label="部門" value={form.department} onChange={update("department") as (v: string) => void} placeholder="例：Event" />
        <Field label="LinkedIn URL" value={form.linkedinUrl} onChange={update("linkedinUrl") as (v: string) => void} placeholder="https://linkedin.com/in/..." />
        <Field label="Instagram URL" value={form.instagramUrl} onChange={update("instagramUrl") as (v: string) => void} placeholder="https://instagram.com/..." />
        <Field label="大頭貼 URL" value={form.photoUrl} onChange={update("photoUrl") as (v: string) => void} placeholder="https://..." />
      </div>

      {/* 個人簡介（全寬） */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">個人簡介</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="簡短介紹..."
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition resize-none"
        />
      </div>

      {/* 公開切換 */}
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          className="rounded"
        />
        <span className="text-sm text-gray-600">在公開頁面顯示</span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          {submitting ? "處理中..." : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
        >
          取消
        </button>
      </div>
    </div>
  );
}

export default function AlumniManager({ alumni: initial, locale }: Props) {
  const router = useRouter();
  const [alumni, setAlumni] = useState<AlumniRow[]>(initial);

  // ── 新增表單狀態 ──────────────────────────────────────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });

  // ── 編輯表單狀態（行內展開）────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── 刪除狀態 ─────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── 新增校友 ──────────────────────────────────────────────────────────────
  async function createAlumni() {
    if (!createForm.name.trim()) {
      setCreateError("姓名不能為空");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          graduationYear: createForm.graduationYear ? parseInt(createForm.graduationYear, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error ?? "新增失敗");
        return;
      }
      const newAlumni: AlumniRow = await res.json();
      // 插入清單最前面
      setAlumni((prev) => [newAlumni, ...prev]);
      setCreateForm({ ...EMPTY_FORM });
      setShowNew(false);
      router.refresh();
    } catch {
      setCreateError("網路錯誤，請稍後再試");
    } finally {
      setCreating(false);
    }
  }

  // ── 開啟行內編輯 ──────────────────────────────────────────────────────────
  function startEdit(a: AlumniRow) {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      graduationYear: a.graduationYear?.toString() ?? "",
      position: a.position ?? "",
      department: a.department ?? "",
      bio: a.bio ?? "",
      linkedinUrl: a.linkedinUrl ?? "",
      instagramUrl: a.instagramUrl ?? "",
      photoUrl: a.photoUrl ?? "",
      isPublic: a.isPublic,
    });
    setEditError(null);
  }

  // ── 儲存編輯 ──────────────────────────────────────────────────────────────
  async function saveEdit(id: string) {
    if (!editForm.name.trim()) {
      setEditError("姓名不能為空");
      return;
    }
    setUpdating(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          graduationYear: editForm.graduationYear ? parseInt(editForm.graduationYear, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error ?? "更新失敗");
        return;
      }
      const updated: AlumniRow = await res.json();
      setAlumni((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
      router.refresh();
    } catch {
      setEditError("網路錯誤，請稍後再試");
    } finally {
      setUpdating(false);
    }
  }

  // ── 快速切換公開/隱藏 ────────────────────────────────────────────────────
  async function togglePublic(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !current }),
      });
      if (res.ok) {
        setAlumni((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isPublic: !current } : a))
        );
      }
    } catch {
      // 靜默失敗，不影響 UX
    }
  }

  // ── 刪除校友 ──────────────────────────────────────────────────────────────
  async function deleteAlumni(id: string) {
    if (!window.confirm("確定要刪除此校友記錄？此操作無法復原。")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlumni((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      }
    } catch {
      // 靜默失敗
    } finally {
      setDeleting(null);
    }
  }

  // ── 渲染 ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* 新增按鈕 */}
      {!showNew && (
        <button
          onClick={() => { setShowNew(true); setCreateError(null); }}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          + 新增校友
        </button>
      )}

      {/* 新增表單 */}
      {showNew && (
        <AlumniForm
          form={createForm}
          setForm={setCreateForm}
          onSubmit={createAlumni}
          onCancel={() => { setShowNew(false); setCreateError(null); setCreateForm({ ...EMPTY_FORM }); }}
          submitting={creating}
          error={createError}
          submitLabel="建立"
        />
      )}

      {/* 校友清單 */}
      {alumni.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">尚無校友記錄</p>
      ) : (
        <div className="space-y-2">
          {alumni.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* 摘要列 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                {/* 大頭貼縮圖 */}
                {a.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.photoUrl}
                    alt={a.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${PRIMARY}18`, color: PRIMARY }}
                  >
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* 資訊 */}
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => editingId === a.id ? setEditingId(null) : startEdit(a)}
                    className="font-medium text-sm hover:underline text-left truncate block"
                    style={{ color: PRIMARY }}
                  >
                    {a.name}
                  </button>
                  <p className="text-xs text-gray-400 truncate">
                    {[a.graduationYear, a.position, a.department].filter(Boolean).join("  ·  ") || "（無其他資料）"}
                  </p>
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* 公開/隱藏切換：顯示目前狀態的 badge + 動作按鈕 */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.isPublic
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {a.isPublic ? "公開中" : "已隱藏"}
                  </span>
                  <button
                    onClick={() => togglePublic(a.id, a.isPublic)}
                    className="text-xs px-2 py-1 rounded-full font-medium transition bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    {a.isPublic ? "隱藏" : "公開"}
                  </button>

                  {/* 編輯按鈕 */}
                  <button
                    onClick={() => editingId === a.id ? setEditingId(null) : startEdit(a)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                  >
                    {editingId === a.id ? "收起" : "編輯"}
                  </button>

                  {/* 刪除按鈕 */}
                  <button
                    onClick={() => deleteAlumni(a.id)}
                    disabled={deleting === a.id}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 disabled:opacity-50"
                  >
                    {deleting === a.id ? "刪除中..." : "刪除"}
                  </button>
                </div>
              </div>

              {/* 行內編輯表單 */}
              {editingId === a.id && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="pt-4">
                    <AlumniForm
                      form={editForm}
                      setForm={setEditForm}
                      onSubmit={() => saveEdit(a.id)}
                      onCancel={() => setEditingId(null)}
                      submitting={updating}
                      error={editError}
                      submitLabel="儲存"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
                                                                                                                                                 