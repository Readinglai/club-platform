"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_STYLE: Record<string, { bg: string; color: string }> = {
  platinum: { bg: "#e0f2fe", color: "#0369a1" },
  gold:     { bg: "#fef9c3", color: "#854d0e" },
  silver:   { bg: "#f3f4f6", color: "#374151" },
  bronze:   { bg: "#ffedd5", color: "#9a3412" },
};

const TIERS = ["platinum", "gold", "silver", "bronze"];

interface HistoryRow {
  id: string;
  year: number;
  tier: string;
}

interface SponsorData {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  histories: HistoryRow[];
}

interface Props {
  sponsor: SponsorData;
  locale: string;
}

export default function SponsorEditForm({ sponsor, locale: _locale }: Props) {
  const t = useTranslations("admin.sponsors");
  const tc = useTranslations("admin.common");
  const router = useRouter();

  const [name, setName] = useState(sponsor.name);
  const [logoUrl, setLogoUrl] = useState(sponsor.logoUrl ?? "");
  const [website, setWebsite] = useState(sponsor.website ?? "");
  const [description, setDescription] = useState(sponsor.description ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [histories, setHistories] = useState<HistoryRow[]>(sponsor.histories);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showAddHistory, setShowAddHistory] = useState(false);
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newTier, setNewTier] = useState("gold");
  const [addingHistory, setAddingHistory] = useState(false);
  const [addHistoryError, setAddHistoryError] = useState<string | null>(null);

  async function saveBasicInfo() {
    if (!name.trim()) { setSaveError(t("nameRequired")); return; }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logoUrl: logoUrl || null,
          website: website || null,
          description: description || null,
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        router.refresh();
      } else {
        const d = await res.json();
        setSaveError(d.error ?? tc("saveFailed"));
      }
    } catch {
      setSaveError(tc("networkErrorRetry"));
    } finally {
      setSaving(false);
    }
  }

  async function addHistory() {
    const yearNum = parseInt(newYear, 10);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setAddHistoryError(t("historyYearInvalid"));
      return;
    }
    setAddingHistory(true);
    setAddHistoryError(null);
    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: yearNum, tier: newTier }),
      });
      if (res.ok) {
        const created = await res.json();
        setHistories((prev) =>
          [{ id: created.id, year: created.year, tier: created.tier }, ...prev].sort(
            (a, b) => b.year - a.year
          )
        );
        setShowAddHistory(false);
        setNewYear(String(new Date().getFullYear()));
        setNewTier("gold");
      } else {
        const d = await res.json();
        setAddHistoryError(d.error ?? tc("createFailed"));
      }
    } catch {
      setAddHistoryError(tc("networkErrorRetry"));
    } finally {
      setAddingHistory(false);
    }
  }

  async function deleteHistory(historyId: string) {
    if (!confirm(t("historyConfirmDelete"))) return;
    setDeletingId(historyId);
    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}/history/${historyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistories((prev) => prev.filter((h) => h.id !== historyId));
      } else {
        const d = await res.json();
        alert(d.error ?? tc("deleteFailed"));
      }
    } catch {
      alert(tc("networkErrorRetry"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
          {t("editBasicInfo")}
        </h2>

        {saveError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            {tc("saved")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t("fieldName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#e5e7eb", color: PRIMARY }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t("fieldWebsite")}</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="off"
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#e5e7eb", color: PRIMARY }}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{t("fieldLogo")}</label>
          <div className="flex items-center gap-3">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              autoComplete="off"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#e5e7eb", color: PRIMARY }}
              placeholder="https://..."
            />
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo preview"
                className="h-10 w-auto object-contain rounded border"
                style={{ borderColor: "#e5e7eb" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">{t("fieldDescription")}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={saveBasicInfo}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {saving ? tc("saving") : tc("save")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
            {t("historyTitle")}
          </h2>
          <button
            onClick={() => setShowAddHistory((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {showAddHistory ? tc("cancel") : t("addYear")}
          </button>
        </div>

        {showAddHistory && (
          <div className="rounded-lg p-4 flex flex-col gap-3" style={{ backgroundColor: `${PRIMARY}06` }}>
            {addHistoryError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {addHistoryError}
              </p>
            )}
            <div className="flex items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">{t("historyFieldYear")}</label>
                <input
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  type="number"
                  min={2000}
                  max={2100}
                  autoComplete="off"
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none w-28"
                  style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">{t("historyFieldTier")}</label>
                <select
                  value={newTier}
                  onChange={(e) => setNewTier(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addHistory}
                disabled={addingHistory}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
              >
                {addingHistory ? t("historyAdding") : tc("add")}
              </button>
            </div>
          </div>
        )}

        {histories.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">{t("historyEmpty")}</div>
        ) : (
          <div className="overflow-hidden rounded-lg border" style={{ borderColor: "#e5e7eb" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
                  {[t("historyTableYear"), t("historyTableTier"), t("historyTableActions")].map((h) => (
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
                {histories.map((h) => {
                  const tierStyle = TIER_STYLE[h.tier];
                  return (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>
                        {h.year}
                      </td>
                      <td className="px-4 py-3">
                        {tierStyle ? (
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={tierStyle}
                          >
                            {h.tier}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">{h.tier}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteHistory(h.id)}
                          disabled={deletingId === h.id}
                          className="text-xs px-2.5 py-1 rounded font-medium transition-all hover:opacity-70 disabled:opacity-40"
                          style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                        >
                          {deletingId === h.id ? tc("deleting") : tc("delete")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
