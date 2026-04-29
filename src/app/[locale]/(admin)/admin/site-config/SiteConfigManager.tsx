"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  updatedAt?: Date | string;
}

interface EmailTemplate {
  key: string;
  subject: string;
  body: string;
  updatedAt?: Date | string;
}

interface SectionConfig {
  key: string;
  label: string;
  visible: boolean;
  order: number;
}

interface Props {
  initialFlags: FeatureFlag[];
  initialTemplates: EmailTemplate[];
  initialSections: SectionConfig[];
  initialReminderHours: number;
}

const FLAG_LABELS: Record<string, string> = {
  sponsors: "贊助商模組",
  alumni: "校友網路模組",
  finance: "財務管理模組",
};

const TEMPLATE_LABELS: Record<string, string> = {
  welcome: "歡迎信（新成員加入）",
  event_reminder: "活動/任務提醒",
};

export default function SiteConfigManager({
  initialFlags,
  initialTemplates,
  initialSections,
  initialReminderHours,
}: Props) {
  // ── Feature Flags ──────────────────────────────────────────────────────────
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [flagSaving, setFlagSaving] = useState<string | null>(null);

  async function toggleFlag(key: string, enabled: boolean) {
    setFlagSaving(key);
    try {
      const res = await fetch(`/api/admin/feature-flags/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFlags((prev) => prev.map((f) => (f.key === key ? updated : f)));
      }
    } finally {
      setFlagSaving(null);
    }
  }

  // ── Email Templates ────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [tplForm, setTplForm] = useState({ subject: "", body: "" });
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState<string | null>(null);

  function openTemplateEdit(tpl: EmailTemplate) {
    setEditingTemplate(tpl.key);
    setTplForm({ subject: tpl.subject, body: tpl.body });
    setTplError(null);
  }

  async function saveTemplate(key: string) {
    if (!tplForm.subject.trim() || !tplForm.body.trim()) {
      setTplError("標題與內容為必填");
      return;
    }
    setTplSaving(true);
    setTplError(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tplForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates((prev) => prev.map((t) => (t.key === key ? updated : t)));
        setEditingTemplate(null);
      } else {
        const d = await res.json();
        setTplError(d.error ?? "儲存失敗");
      }
    } catch {
      setTplError("網路錯誤");
    } finally {
      setTplSaving(false);
    }
  }

  // ── Homepage Sections ──────────────────────────────────────────────────────
  const [sections, setSections] = useState<SectionConfig[]>(initialSections);
  const [sectionsSaving, setSectionsSaving] = useState(false);
  const [sectionsSuccess, setSectionsSuccess] = useState(false);

  function moveSection(idx: number, dir: -1 | 1) {
    const next = [...sections];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    setSections(next.map((s, i) => ({ ...s, order: i })));
  }

  function toggleSection(key: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s))
    );
  }

  async function saveSections() {
    setSectionsSaving(true);
    setSectionsSuccess(false);
    try {
      const payload = sections.map(({ key, visible, order }) => ({ key, visible, order }));
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "sections", value: JSON.stringify(payload) }),
      });
      if (res.ok) setSectionsSuccess(true);
    } finally {
      setSectionsSaving(false);
    }
  }

  // ── Reminder Hours ─────────────────────────────────────────────────────────
  const [reminderHours, setReminderHours] = useState(String(initialReminderHours));
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);

  async function saveReminderHours() {
    const val = parseInt(reminderHours, 10);
    if (isNaN(val) || val <= 0) { setReminderError("請輸入有效的正整數"); return; }
    setReminderSaving(true);
    setReminderError(null);
    setReminderSuccess(false);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "reminder_hours_before", value: String(val) }),
      });
      if (res.ok) setReminderSuccess(true);
      else { const d = await res.json(); setReminderError(d.error ?? "儲存失敗"); }
    } catch {
      setReminderError("網路錯誤");
    } finally {
      setReminderSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Feature Flags */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
          功能開關
        </h2>
        {flags.length === 0 ? (
          <p className="text-sm text-gray-400">目前無功能開關設定</p>
        ) : (
          flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: "#f3f4f6" }}>
              <span className="text-sm" style={{ color: PRIMARY }}>
                {FLAG_LABELS[flag.key] ?? flag.key}
              </span>
              <button
                type="button"
                onClick={() => toggleFlag(flag.key, !flag.enabled)}
                disabled={flagSaving === flag.key}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-50"
                style={{ backgroundColor: flag.enabled ? PRIMARY : "#d1d5db" }}
                aria-label={`${FLAG_LABELS[flag.key] ?? flag.key} ${flag.enabled ? "開啟" : "關閉"}`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: flag.enabled ? "translateX(24px)" : "translateX(4px)" }}
                />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Homepage Sections */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
          首頁區塊排序
        </h2>
        <p className="text-xs text-gray-400">調整首頁各區塊的顯示順序與可見性。</p>
        <div className="flex flex-col gap-2">
          {sections.map((s, idx) => (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ backgroundColor: "#fafafa", border: "1px solid #e5e7eb" }}
            >
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveSection(idx, -1)}
                  disabled={idx === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  aria-label="上移"
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveSection(idx, 1)}
                  disabled={idx === sections.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none"
                  aria-label="下移"
                >▼</button>
              </div>
              <span className="flex-1 text-sm" style={{ color: s.visible ? PRIMARY : "#9ca3af" }}>
                {s.label}
              </span>
              <button
                type="button"
                onClick={() => toggleSection(s.key)}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200"
                style={{ backgroundColor: s.visible ? PRIMARY : "#d1d5db" }}
                aria-label={`${s.label} ${s.visible ? "顯示" : "隱藏"}`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: s.visible ? "translateX(18px)" : "translateX(3px)" }}
                />
              </button>
            </div>
          ))}
        </div>
        {sectionsSuccess && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">已儲存</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveSections}
            disabled={sectionsSaving}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {sectionsSaving ? "儲存中…" : "儲存排序"}
          </button>
        </div>
      </div>

      {/* Notification Timing */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
          通知時機
        </h2>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 shrink-0">活動提前幾小時發送提醒</label>
          <input
            type="number"
            value={reminderHours}
            onChange={(e) => { setReminderHours(e.target.value); setReminderSuccess(false); }}
            min={1}
            max={168}
            autoComplete="off"
            className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
          <span className="text-sm text-gray-500">小時</span>
        </div>
        {reminderError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{reminderError}</p>
        )}
        {reminderSuccess && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">已儲存</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveReminderHours}
            disabled={reminderSaving}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {reminderSaving ? "儲存中…" : "儲存"}
          </button>
        </div>
      </div>

      {/* Email Templates */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
          Email 模板
        </h2>
        <p className="text-xs text-gray-400">支援變數：&#123;name&#125;、&#123;event_title&#125;、&#123;event_date&#125;</p>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-400">目前無 Email 模板</p>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.key} className="border rounded-xl p-4 flex flex-col gap-3" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: PRIMARY }}>
                  {TEMPLATE_LABELS[tpl.key] ?? tpl.key}
                </p>
                {editingTemplate !== tpl.key && (
                  <button
                    type="button"
                    onClick={() => openTemplateEdit(tpl)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}
                  >
                    編輯
                  </button>
                )}
              </div>

              {editingTemplate === tpl.key ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">郵件主旨</label>
                    <input
                      value={tplForm.subject}
                      onChange={(e) => setTplForm((f) => ({ ...f, subject: e.target.value }))}
                      autoComplete="off"
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">郵件內容</label>
                    <textarea
                      value={tplForm.body}
                      onChange={(e) => setTplForm((f) => ({ ...f, body: e.target.value }))}
                      rows={6}
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none resize-y"
                      style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                    />
                  </div>
                  {tplError && (
                    <p className="text-xs text-red-500">{tplError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="px-3 py-1.5 rounded-lg text-sm border"
                      style={{ borderColor: "#d1d5db", color: "#374151" }}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => saveTemplate(tpl.key)}
                      disabled={tplSaving}
                      className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                    >
                      {tplSaving ? "儲存中…" : "儲存"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 space-y-1">
                  <p><span className="font-medium text-gray-600">主旨：</span>{tpl.subject}</p>
                  <p className="truncate"><span className="font-medium text-gray-600">內容：</span>{tpl.body.slice(0, 60)}{tpl.body.length > 60 ? "…" : ""}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
