"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function SiteConfigForm({ heroImageUrl }: { heroImageUrl: string }) {
  const t = useTranslations("admin.siteConfig");
  const tc = useTranslations("admin.common");
  const [url, setUrl] = useState(heroImageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "heroImageUrl", value: url }),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const d = await res.json();
        setError(d.error ?? t("saveFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
        {t("heroTitle")}
      </h2>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">{t("saved")}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-gray-500 uppercase tracking-wide">{t("heroImageLabel")}</label>
        <div className="flex items-center gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
            placeholder="https://..."
          />
          {url && (
            <img
              src={url}
              alt="preview"
              className="h-14 w-24 object-cover rounded border"
              style={{ borderColor: "#e5e7eb" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1">{t("heroImageHint")}</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {saving ? tc("saving") : tc("save")}
        </button>
      </div>
    </div>
  );
}
