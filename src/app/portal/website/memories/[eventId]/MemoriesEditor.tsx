"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ImageUpload from "@/components/admin/ImageUpload";

const PRIMARY = "#1a2744";
type Photo = { id: string | null; key: string; imageUrl: string; caption: string };
const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

/** Recap and photos for one event's "past memories". Saving replaces the set as shown. */
export default function MemoriesEditor({
  eventId,
  initial,
}: {
  eventId: string;
  initial: { recap: string | null; photos: Array<{ id: string; imageUrl: string; caption: string | null }> };
}) {
  const t = useTranslations("portal.memoriesEditor");
  const locale = useLocale();
  const [recap, setRecap] = useState(initial.recap ?? "");
  const [photos, setPhotos] = useState<Photo[]>(initial.photos.map((p) => ({ id: p.id, key: p.id, imageUrl: p.imageUrl, caption: p.caption ?? "" })));
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const addPhoto = (url: string) => {
    if (!url) return;
    setPhotos((all) => [...all, { id: null, key: `new-${Date.now()}`, imageUrl: url, caption: "" }]);
    setNewUrl("");
  };
  const move = (i: number, by: -1 | 1) =>
    setPhotos((all) => {
      const next = [...all];
      const to = i + by;
      if (to < 0 || to >= next.length) return all;
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/club/events/${eventId}/memories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recap, photos: photos.map((p) => ({ id: p.id, imageUrl: p.imageUrl, caption: p.caption })) }),
      });
      const body = await res.json().catch(() => ({}));
      setMessage(res.ok ? { ok: true, text: t("saved") } : { ok: false, text: body.error ?? t("saveError") });
    } catch {
      setMessage({ ok: false, text: t("saveError") });
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <label htmlFor="recap" className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("recap")}</label>
        <p className="mt-1 text-xs text-gray-500">{t("recapHint")}</p>
        <textarea id="recap" value={recap} onChange={(e) => setRecap(e.target.value)} maxLength={2000} rows={4} className={`${inputClass} mt-3 resize-y`} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("photos")}</h2>
        <p className="mt-1 text-xs text-gray-500">{t("photosHint")}</p>
        {photos.length > 0 && (
          <ul className="mt-4 flex flex-col divide-y divide-gray-100">
            {photos.map((p, i) => (
              <li key={p.key} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded to the club's storage */}
                <img src={p.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-gray-600">
                  {t("caption")}
                  <input value={p.caption} maxLength={200} onChange={(e) => setPhotos((all) => all.map((x) => (x.key === p.key ? { ...x, caption: e.target.value } : x)))} className={inputClass} />
                </label>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t("moveUp")} className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label={t("moveDown")} className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => setPhotos((all) => all.filter((x) => x.key !== p.key))} className="rounded-md border border-red-200 px-2 py-1 text-sm text-red-700">{t("remove")}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <ImageUpload value={newUrl} onChange={addPhoto} label={t("addPhoto")} previewClassName="h-20 object-cover" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
          {busy ? t("saving") : t("save")}
        </button>
        <a href={`/${locale}/events/${eventId}`} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: PRIMARY }}>{t("viewPage")}</a>
        {message && <p role="status" className={`text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>{message.text}</p>}
      </div>
    </div>
  );
}
