"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { emptyEvent, EventDetailsFields, PRIMARY, send, type EventForm } from "./EventFields";

type Row = {
  id: string;
  title: string;
  startAt: string;
  published: boolean;
  canManage: boolean;
  settings: { timezone: string } | null;
};

export default function EventsList() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [canCreate, setCanCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyEvent);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    send("/api/manage/events", "GET")
      .then((d) => {
        if (!active) return;
        setRows(d.events);
        setCanCreate(d.canCreate);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      active = false;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await send("/api/manage/events", "POST", form);
      router.push(`/portal/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create.");
      setBusy(false);
    }
  }

  if (!rows) return <p className="mt-6 text-sm text-gray-600">{error || "Loading… 載入中"}</p>;

  return (
    <div className="mt-6 flex flex-col gap-6">
      {canCreate && !creating && (
        <button
          className="self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}
          onClick={() => setCreating(true)}
        >
          + New event 新增活動
        </button>
      )}

      {creating && (
        <form onSubmit={create} className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold" style={{ color: PRIMARY }}>New event 新增活動</h2>
          <EventDetailsFields value={form} onChange={setForm} />
          <p className="mt-3 text-xs text-gray-500">
            It starts unpublished, so only managers can see it until you publish. 建立後預設不公開。
          </p>
          {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
              Create 建立
            </button>
            <button type="button" onClick={() => setCreating(false)} className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "#d1d5db" }}>
              Cancel 取消
            </button>
          </div>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {rows.length === 0 && <li className="text-sm text-gray-500">No events yet. 尚無活動。</li>}
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={r.canManage ? `/portal/events/${r.id}` : `/portal/events/${r.id}/dashboard`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-900">{r.title}</span>
                <span className="text-xs text-gray-500">
                  {new Date(r.startAt).toLocaleString("en-CA", {
                    timeZone: r.settings?.timezone ?? "America/Toronto",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {r.settings && r.settings.timezone !== "America/Toronto" ? ` (${r.settings.timezone})` : ""}
                </span>
              </span>
              <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "#d6d4cc", color: r.published ? "#087208" : "#52514e" }}>
                {r.published ? "● Published 已公開" : "○ Draft 未公開"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
