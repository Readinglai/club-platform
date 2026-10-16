"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("portal.dashboard");
  const timeLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
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
          setError(body.error ?? t("loadError"));
          return;
        }
        setData(body);
        setError("");
      } catch {
        if (active) setError(t("connectionLost"));
      }
      if (active) timer = setTimeout(tick, REFRESH_MS);
    };
    void tick();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [eventId, t]);

  if (!data) return <p className="text-sm text-gray-600">{error || t("loading")}</p>;

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(timeLocale, { timeZone: data.event.timezone, hour: "numeric", minute: "2-digit" });
  const { totals } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{data.event.title}</h1>
        <p className="mt-1 text-xs text-gray-500" aria-live="polite">
          {t("live", { time: time(data.updatedAt) })}
          {error && ` · ${error}`}
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("checkedIn")} value={`${totals.checkedIn}`} hint={t("ofSold", { sold: totals.sold })} />
        <StatTile label={t("sold")} value={`${totals.sold}`} hint={totals.capacity === null ? t("noCap") : t("ofSpots", { capacity: totals.capacity })} />
        <StatTile label={t("inCheckout")} value={`${totals.held}`} hint={t("heldFor")} />
        <StatTile label={t("revenue")} value={cad(totals.revenue)} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("byTier")}</h2>
        <p className="mb-4 mt-1 flex gap-4 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_1 }} />{t("legendIn")}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SOLD }} />{t("legendSold")}</span>
        </p>
        <div className="flex flex-col gap-4">
          {data.tiers.map((tier) => {
            const scale = Math.max(1, tier.capacity ?? tier.sold);
            const line = `${t("tierLine", { in: tier.checkedIn, sold: tier.sold })}${tier.capacity !== null ? ` / ${tier.capacity}` : ""}`;
            return (
              <div key={tier.id} title={`${tier.name}: ${line}`}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-gray-900">{tier.name}{!tier.active && ` ${t("hidden")}`}</span>
                  <span className="tabular-nums text-gray-700">{line}</span>
                </div>
                <div className="mt-1.5 flex h-3 overflow-hidden rounded-r" style={{ backgroundColor: TRACK }}>
                  <span style={{ width: `${(tier.checkedIn / scale) * 100}%`, backgroundColor: SERIES_1 }} />
                  <span style={{ width: `${((tier.sold - tier.checkedIn) / scale) * 100}%`, backgroundColor: SOLD, marginLeft: tier.checkedIn ? 2 : 0 }} />
                </div>
              </div>
            );
          })}
          {data.tiers.length === 0 && <p className="text-sm text-gray-500">{t("noTiers")}</p>}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("latest")}</h2>
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {data.recentCheckIns.length === 0 && <li className="py-2 text-gray-500">{t("nobody")}</li>}
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
