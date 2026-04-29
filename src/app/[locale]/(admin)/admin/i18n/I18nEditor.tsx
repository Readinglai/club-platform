"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Entry {
  path: string;
  en: string;
  zh: string;
}

interface NSData {
  ns: string;
  entries: Entry[];
}

interface Props {
  namespaces: NSData[];
}

export default function I18nEditor({ namespaces }: Props) {
  const t = useTranslations("admin.i18n");
  const tc = useTranslations("admin.common");

  const [selectedNs, setSelectedNs] = useState(namespaces[0]?.ns ?? "");
  const [editingCell, setEditingCell] = useState<{ path: string; locale: "en" | "zh" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedCells, setSavedCells] = useState<Set<string>>(new Set());
  const [localData, setLocalData] = useState<Map<string, { en: string; zh: string }>>(
    () => new Map(namespaces.flatMap(({ entries }) => entries.map((e) => [e.path, { en: e.en, zh: e.zh }])))
  );

  const current = namespaces.find((n) => n.ns === selectedNs);

  async function saveCell(path: string, locale: "en" | "zh", value: string) {
    const cellKey = `${path}|${locale}`;
    setSaving(cellKey);
    try {
      const res = await fetch("/api/admin/i18n", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, path, value }),
      });
      if (res.ok) {
        setLocalData((prev) => {
          const next = new Map(prev);
          const entry = next.get(path) ?? { en: "", zh: "" };
          next.set(path, { ...entry, [locale]: value });
          return next;
        });
        setSavedCells((prev) => new Set(prev).add(cellKey));
        setTimeout(() => {
          setSavedCells((prev) => {
            const next = new Set(prev);
            next.delete(cellKey);
            return next;
          });
        }, 2000);
        setEditingCell(null);
      }
    } finally {
      setSaving(null);
    }
  }

  function startEdit(path: string, locale: "en" | "zh") {
    setEditingCell({ path, locale });
    setEditValue(localData.get(path)?.[locale] ?? "");
  }

  return (
    <div className="flex gap-4 min-h-0">
      {/* Namespace list */}
      <aside className="w-48 shrink-0 flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {namespaces.map(({ ns }) => (
          <button
            key={ns}
            onClick={() => { setSelectedNs(ns); setEditingCell(null); }}
            className="text-left px-3 py-2 rounded-lg text-xs font-mono transition-all"
            style={{
              backgroundColor: selectedNs === ns ? `${SECONDARY}22` : "transparent",
              color: selectedNs === ns ? PRIMARY : "#6b7280",
              fontWeight: selectedNs === ns ? 600 : 400,
            }}
          >
            {ns}
          </button>
        ))}
      </aside>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-40">
                {t("keyColumn")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/2">
                {t("enColumn")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 w-1/2">
                {t("zhColumn")}
              </th>
            </tr>
          </thead>
          <tbody>
            {current?.entries.map(({ path }) => {
              const vals = localData.get(path) ?? { en: "", zh: "" };
              const keyName = path.split(".").at(-1) ?? path;
              return (
                <tr
                  key={path}
                  style={{ borderBottom: "1px solid #f3f4f6" }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs text-gray-400">{keyName}</span>
                  </td>
                  {(["en", "zh"] as const).map((locale) => {
                    const cellKey = `${path}|${locale}`;
                    const isEditing = editingCell?.path === path && editingCell?.locale === locale;
                    const isSaving = saving === cellKey;
                    const isSaved = savedCells.has(cellKey);

                    return (
                      <td key={locale} className="px-4 py-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveCell(path, locale, editValue);
                                }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none min-w-0"
                              style={{ borderColor: PRIMARY, color: PRIMARY }}
                            />
                            <button
                              onClick={() => saveCell(path, locale, editValue)}
                              disabled={isSaving}
                              className="shrink-0 text-xs px-2 py-1 rounded font-semibold hover:opacity-80 disabled:opacity-50"
                              style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                            >
                              {isSaving ? "…" : tc("save")}
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="shrink-0 text-xs px-1 py-1 rounded text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 group cursor-text min-h-[2rem]"
                            onClick={() => startEdit(path, locale)}
                          >
                            <span className="text-sm flex-1 truncate" style={{ color: PRIMARY }}>
                              {vals[locale] || (
                                <span className="text-gray-300 italic text-xs">empty</span>
                              )}
                            </span>
                            {isSaved ? (
                              <span className="text-xs text-green-600 shrink-0">✓ {t("saved")}</span>
                            ) : (
                              <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity select-none">
                                ✎
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
