"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ImageUpload from "@/components/admin/ImageUpload";

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

      <ImageUpload
        label={t("heroImageLabel")}
        value={url}
        onChange={setUrl}
        hint={t("heroImageHint")}
        previewClassName="h-14 w-24 object-cover"
      />

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
