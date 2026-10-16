"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventDetailsFields, Field, inputClass, PRIMARY, send, type EventForm } from "../EventFields";

type Tier = {
  id: string;
  name: string;
  description: string;
  price: number;
  memberPrice: number | null;
  capacity: number | null;
  salesStartAt: string;
  salesEndAt: string;
  membersOnly: boolean;
  color: string;
  perks: string;
  sortOrder: number;
  active: boolean;
};

type Loaded = EventForm & { id: string; published: boolean; ticketTypes: Tier[] };

/** Scanner colours that never look like an error (red/amber mean problems at the door). */
const TIER_COLORS = ["#0b6e4f", "#1d4ed8", "#6b21a8", "#0e7490", "#334155"];
const COLOR_NAMES: Record<string, string> = {
  "#0b6e4f": "Green 綠",
  "#1d4ed8": "Blue 藍",
  "#6b21a8": "Purple 紫",
  "#0e7490": "Teal 青",
  "#334155": "Grey 灰",
};

const blankTier = { name: "", price: "", memberPrice: "", capacity: "", salesStartAt: "", salesEndAt: "", membersOnly: false, color: TIER_COLORS[0], perks: "", description: "" };
type TierForm = typeof blankTier;

const toForm = (t: Tier): TierForm => ({
  name: t.name,
  price: String(t.price),
  memberPrice: t.memberPrice === null ? "" : String(t.memberPrice),
  capacity: t.capacity === null ? "" : String(t.capacity),
  salesStartAt: t.salesStartAt,
  salesEndAt: t.salesEndAt,
  membersOnly: t.membersOnly,
  color: t.color || TIER_COLORS[0],
  perks: t.perks,
  description: t.description,
});

export default function EventEditor({ eventId }: { eventId: string }) {
  const base = `/api/manage/events/${eventId}`;
  const [data, setData] = useState<Loaded | null>(null);
  const [form, setForm] = useState<EventForm | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const apply = useCallback((d: Loaded) => {
    setData(d);
    setForm({
      title: d.title,
      description: d.description,
      location: d.location,
      imageUrl: d.imageUrl,
      startAt: d.startAt,
      endAt: d.endAt,
      timezone: d.timezone,
      ticketsEnabled: d.ticketsEnabled,
      checkInEnabled: d.checkInEnabled,
      budgetEnabled: d.budgetEnabled,
      dashboardEnabled: d.dashboardEnabled,
    });
  }, []);

  const reload = useCallback(async () => apply(await send(base, "GET")), [apply, base]);

  useEffect(() => {
    let active = true;
    send(base, "GET")
      .then((d) => active && apply(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      active = false;
    };
  }, [apply, base]);

  async function act(action: () => Promise<unknown>, done: string) {
    setError("");
    setNotice("");
    try {
      await action();
      await reload();
      setNotice(done);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (!data || !form) return <p className="text-sm text-gray-600">{error || "Loading… 載入中"}</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{data.title}</h1>
        <span className="rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "#d6d4cc", color: data.published ? "#087208" : "#52514e" }}>
          {data.published ? "● Published 已公開" : "○ Draft 未公開"}
        </span>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm">
        <a href={`/e/${eventId}`} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1.5" style={{ borderColor: PRIMARY, color: PRIMARY }}>
          {data.published ? "Public page 公開頁面 ↗" : "Preview page 預覽頁面 ↗"}
        </a>
        {data.dashboardEnabled && (
          <Link href={`/portal/events/${eventId}/dashboard`} className="rounded-full border px-3 py-1.5" style={{ borderColor: PRIMARY, color: PRIMARY }}>
            Live dashboard 即時數據
          </Link>
        )}
        {data.budgetEnabled && (
          <Link href={`/portal/finance/events/${eventId}`} className="rounded-full border px-3 py-1.5" style={{ borderColor: PRIMARY, color: PRIMARY }}>
            Budget & report 預算
          </Link>
        )}
        <Link href="/portal/team" className="rounded-full border px-3 py-1.5" style={{ borderColor: PRIMARY, color: PRIMARY }}>
          Event team 活動團隊
        </Link>
      </nav>

      {notice && <p className="rounded-lg bg-white px-3 py-2 text-sm text-green-800 shadow-sm">✓ {notice}</p>}
      {error && <p role="alert" className="rounded-lg bg-white px-3 py-2 text-sm text-red-700 shadow-sm">{error}</p>}

      <form
        className="rounded-2xl bg-white p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => send(base, "PATCH", form), "Saved 已儲存");
        }}
      >
        <h2 className="mb-4 text-lg font-semibold" style={{ color: PRIMARY }}>Details 活動資訊</h2>
        <EventDetailsFields value={form} onChange={setForm} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
            Save 儲存
          </button>
          <button
            type="button"
            className="rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
            onClick={() => {
              const next = !data.published;
              if (confirm(next ? "Publish? Everyone can then see the page. 公開？" : "Unpublish? Only managers will see it. 取消公開？")) {
                void act(() => send(`${base}/publish`, "POST", { published: next }), next ? "Published 已公開" : "Unpublished 已取消公開");
              }
            }}
          >
            {data.published ? "Unpublish 取消公開" : "Publish 公開"}
          </button>
        </div>
      </form>

      {data.ticketsEnabled && (
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Ticket tiers 票種</h2>
          <p className="mt-1 text-xs text-gray-500">Times are in the event&apos;s time zone ({data.timezone}). Price 0 = free registration.</p>
          <div className="mt-4 flex flex-col gap-3">
            {data.ticketTypes.map((t) => (
              <TierEditor
                key={t.id}
                initial={toForm(t)}
                active={t.active}
                onSave={(v) => act(() => send(`${base}/ticket-types/${t.id}`, "PATCH", { ...v, sortOrder: t.sortOrder, active: t.active }), "Tier saved 票種已儲存")}
                onToggle={() => act(() => send(`${base}/ticket-types/${t.id}`, "PATCH", { ...toForm(t), sortOrder: t.sortOrder, active: !t.active }), t.active ? "Tier hidden 已隱藏" : "Tier shown 已顯示")}
              />
            ))}
            <TierEditor
              key={data.ticketTypes.length}
              initial={blankTier}
              isNew
              onSave={(v) => act(() => send(`${base}/ticket-types`, "POST", { ...v, sortOrder: data.ticketTypes.length }), "Tier added 已新增票種")}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function TierEditor({
  initial,
  isNew,
  active = true,
  onSave,
  onToggle,
}: {
  initial: TierForm;
  isNew?: boolean;
  active?: boolean;
  onSave: (v: TierForm) => Promise<void>;
  onToggle?: () => Promise<void>;
}) {
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(false);
  const set = <K extends keyof TierForm>(k: K, val: TierForm[K]) => setV({ ...v, [k]: val });

  if (!open) {
    return isNew ? (
      <button className="self-start rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: PRIMARY, color: PRIMARY }} onClick={() => setOpen(true)}>
        + Add tier 新增票種
      </button>
    ) : (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3" style={{ opacity: active ? 1 : 0.55 }}>
        <span className="flex min-w-0 items-center gap-2">
          <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: initial.color }} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-gray-900">
              {initial.name}
              {initial.membersOnly && " · members only 限會員"}
              {!active && " · hidden 已隱藏"}
            </span>
            <span className="text-xs text-gray-500">
              {Number(initial.price) === 0 ? "Free" : `CA$${initial.price}`}
              {initial.memberPrice !== "" && ` · member CA$${initial.memberPrice}`}
              {` · ${initial.capacity === "" ? "unlimited" : `${initial.capacity} spots`}`}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 gap-3 text-xs">
          <button className="underline" style={{ color: PRIMARY }} onClick={() => setOpen(true)}>Edit 編輯</button>
          <button className="text-gray-600 underline" onClick={() => void onToggle?.()}>{active ? "Hide 隱藏" : "Show 顯示"}</button>
        </span>
      </div>
    );
  }

  return (
    <form
      className="grid grid-cols-2 gap-2 rounded-xl border border-gray-300 p-3 sm:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(v);
        setOpen(false);
        if (isNew) setV(blankTier);
      }}
    >
      <div className="col-span-2"><Field label="Name 名稱 *"><input className={inputClass} required value={v.name} onChange={(e) => set("name", e.target.value)} /></Field></div>
      <Field label="Price CA$ *"><input className={inputClass} required inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value)} /></Field>
      <Field label="Member price"><input className={inputClass} inputMode="decimal" placeholder="none" value={v.memberPrice} onChange={(e) => set("memberPrice", e.target.value)} /></Field>
      <Field label="Capacity 名額"><input className={inputClass} inputMode="numeric" placeholder="unlimited" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} /></Field>
      <Field label="Sales start"><input className={inputClass} type="datetime-local" value={v.salesStartAt} onChange={(e) => set("salesStartAt", e.target.value)} /></Field>
      <Field label="Sales end"><input className={inputClass} type="datetime-local" value={v.salesEndAt} onChange={(e) => set("salesEndAt", e.target.value)} /></Field>
      <Field label="Scanner colour">
        <select className={inputClass} value={v.color} onChange={(e) => set("color", e.target.value)} style={{ color: v.color }}>
          {TIER_COLORS.map((c) => <option key={c} value={c} style={{ color: c }}>● {COLOR_NAMES[c]}</option>)}
        </select>
      </Field>
      <div className="col-span-2"><Field label="Perks 福利 (shown at the door)"><input className={inputClass} value={v.perks} onChange={(e) => set("perks", e.target.value)} /></Field></div>
      <div className="col-span-2"><Field label="Description 說明"><input className={inputClass} value={v.description} onChange={(e) => set("description", e.target.value)} /></Field></div>
      <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-4">
        <input type="checkbox" checked={v.membersOnly} onChange={(e) => set("membersOnly", e.target.checked)} />
        Members only 限會員
      </label>
      <div className="col-span-2 flex gap-2 sm:col-span-4">
        <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
          {isNew ? "Add 新增" : "Save 儲存"}
        </button>
        <button type="button" className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: "#d1d5db" }} onClick={() => { setV(initial); setOpen(false); }}>
          Cancel 取消
        </button>
      </div>
    </form>
  );
}
