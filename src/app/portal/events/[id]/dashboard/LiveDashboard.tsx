"use client";

import { useEffect, useState } from "react";
import { cad, StatTile } from "../../../finance/charts";

const PRIMARY = "#1a2744";
const SERIES_1 = "#2a78d6"; // checked in
const SOLD = "#9ec5f4"; // sold, not yet in (lighter step of the same hue)
const TRACK = "#e5e4df";
const REFRESH_MS = 10_000;

type Data = {
  event: { id: string; title: string; startAt: string; timezone: string };
  totals: { sold: number; held: number; checkedIn: number; revenue: number; capacity: number | null };
  tiers: Array<{ id: string; name: string; color: string | null; active: boolean; capacity: number | null; sold: number; held: number; checkedIn: number; revenue: number }>;
  recentCheckIns: Array<{ name: string; tier: string; at: string }>;
  updatedAt: string;
};

export default function LiveDashboard({ eventId }: { eventId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/manage/events/${eventId}/dashboard`);
        const body = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(body.error ?? "Could not load.");
          return;
        }
        setData(body);
        setError("");
      } catch {
        if (active) setError("Connection lost — retrying… 連線中斷，重試中");
      }
      if (active) timer = setTimeout(tick, REFRESH_MS);
    };
    void tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [eventId]);

  if (!data) return <p className="text-sm text-gray-600">{error || "Loading… 載入中"}</p>;

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-CA", { timeZone: data.event.timezone, hour: "numeric", minute: "2-digit" });
  const { totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{data.event.title}</h1>
        <p className="mt-1 text-xs text-gray-500" aria-live="polite">
          Live · updated {time(data.updatedAt)} · refreshes every 10 s 每 10 秒更新
          {error && ` · ${error}`}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Checked in 已入場" value={`${totals.checkedIn}`} hint={`of ${totals.sold} sold`} />
        <StatTile label="Sold 已售出" value={`${totals.sold}`} hint={totals.capacity === null ? "no cap" : `of ${totals.capacity} spots`} />
        <StatTile label="In checkout 付款中" value={`${totals.held}`} hint="held for 30 min" />
        <StatTile label="Revenue 收入" value={cad(totals.revenue)} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>By tier 各票種</h2>
        <p className="mb-4 mt-1 flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_1 }} />Checked in 已入場</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SOLD }} />Sold, not in yet 未入場</span>
        </p>
        <div className="flex flex-col gap-4">
          {data.tiers.map((t) => {
            const scale = Math.max(1, t.capacity ?? t.sold);
            return (
              <div key={t.id} title={`${t.name}: ${t.checkedIn} in · ${t.sold} sold${t.capacity !== null ? ` · ${t.capacity} spots` : ""}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-gray-900">{t.name}{!t.active && " (hidden)"}</span>
                  <span className="tabular-nums text-gray-700">
                    {t.checkedIn} in / {t.sold} sold{t.capacity !== null ? ` / ${t.capacity}` : ""}
                  </span>
                </div>
                <div className="mt-1.5 flex h-3 overflow-hidden rounded-r" style={{ backgroundColor: TRACK }}>
                  <span style={{ width: `${(t.checkedIn / scale) * 100}%`, backgroundColor: SERIES_1 }} />
                  <span style={{ width: `${((t.sold - t.checkedIn) / scale) * 100}%`, backgroundColor: SOLD, marginLeft: t.checkedIn ? 2 : 0 }} />
                </div>
              </div>
            );
          })}
          {data.tiers.length === 0 && <p className="text-sm text-gray-500">No tiers yet.</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Latest check-ins 最新入場</h2>
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {data.recentCheckIns.length === 0 && <li className="py-2 text-gray-500">Nobody yet. 尚無人入場。</li>}
          {data.recentCheckIns.map((c, i) => (
            <li key={`${c.at}-${i}`} className="flex justify-between gap-3 py-2">
              <span className="text-gray-900">{c.name} · <span className="text-gray-500">{c.tier}</span></span>
              <span className="tabular-nums text-gray-600">{time(c.at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
