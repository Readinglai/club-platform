"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass, PRIMARY, send } from "../../events/EventFields";

type Value = { id?: string; title: string; content: string; published: boolean };

export default function AnnouncementForm({ initial }: { initial?: Value }) {
  const t = useTranslations("portal.manageAnnouncementsPage");
  const router = useRouter();
  const [value, setValue] = useState<Value>(initial ?? { title: "", content: "", published: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const isNew = !initial?.id;
  // Publishing for the first time notifies members, so say so before saving.
  const willNotify = value.published && !initial?.published;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (willNotify && !confirm(t("confirmPublish", { title: value.title }))) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const body = { title: value.title, content: value.content, published: value.published };
      if (isNew) {
        await send("/api/announcements", "POST", body);
        router.push("/portal/announcements/manage");
        router.refresh();
        return;
      }
      await send(`/api/announcements/${initial!.id}`, "PUT", body);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    }
    setBusy(false);
  }

  return (
    <form onSubmit={save} className="mt-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        {t("fieldTitle")}
        <input required maxLength={200} value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
        {t("fieldContent")}
        <textarea required rows={10} value={value.content} onChange={(e) => setValue({ ...value, content: e.target.value })} className={`${inputClass} resize-y`} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" checked={value.published} onChange={(e) => setValue({ ...value, published: e.target.checked })} className="h-4 w-4" />
        {t("fieldPublished")}
      </label>
      {willNotify && <p className="text-xs text-gray-500">{t("notifyHint")}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-800">{t("saved")}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
          {isNew ? t("create") : t("save")}
        </button>
        <button type="button" onClick={() => router.push("/portal/announcements/manage")} className="rounded-lg border px-5 py-2 text-sm" style={{ borderColor: "#d1d5db" }}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
