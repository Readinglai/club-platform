"use client";

import { useEffect, useState } from "react";

const PRIMARY = "#1a2744";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  perks: string | null;
  price: number;
  memberPrice: number | null;
  membersOnly: boolean;
  remaining: number | null;
  salesStartAt: string | null;
  state: "on_sale" | "sold_out" | "not_started" | "ended";
};

type Data = {
  event: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    imageUrl: string | null;
    startAt: string;
    endAt: string | null;
    timezone: string;
    ticketsEnabled: boolean;
  };
  tiers: Tier[];
  viewer: { isMember: boolean; memberPriceUsed: boolean; prefill: { name: string; email: string; phone: string } } | null;
  preview: boolean;
};

const money = (n: number) => (n === 0 ? "Free 免費" : `CA$${n % 1 === 0 ? n : n.toFixed(2)}`);

export default function EventTickets({ eventId }: { eventId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [missing, setMissing] = useState(false);
  const [tierId, setTierId] = useState("");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/public/events/${eventId}`)
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setMissing(true);
          return;
        }
        const d: Data = await res.json();
        setData(d);
        if (d.viewer) setBuyer(d.viewer.prefill);
        const first = d.tiers.find((t) => t.state === "on_sale" && (!t.membersOnly || d.viewer?.isMember));
        if (first) setTierId(first.id);
      })
      .catch(() => active && setMissing(true));
    return () => {
      active = false;
    };
  }, [eventId]);

  if (missing) return <p className="text-sm text-gray-600">This event isn&apos;t available. 找不到此活動。</p>;
  if (!data) return <p className="text-sm text-gray-600">Loading… 載入中</p>;

  const { event, viewer } = data;
  const tz = event.timezone;
  const date = new Date(event.startAt).toLocaleDateString("en-CA", { timeZone: tz, weekday: "short", year: "numeric", month: "long", day: "numeric" });
  const time = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat("en-CA", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date(event.startAt)).find((p) => p.type === "timeZoneName")?.value;

  const memberDeal = (t: Tier) => Boolean(viewer?.isMember && !viewer.memberPriceUsed && t.memberPrice !== null);
  const priceFor = (t: Tier) => (memberDeal(t) ? t.memberPrice! : t.price);
  const selectable = (t: Tier) => t.state === "on_sale" && (!t.membersOnly || (viewer?.isMember && !viewer.memberPriceUsed));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId: tierId, ...buyer, waiverAccepted: waiver }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      window.location.href = body.free ? body.ticketUrl : body.checkoutUrl;
    } catch {
      setError("No connection. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {data.preview && (
        <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#d6d4cc", color: "#52514e" }}>
          ○ Preview — this event isn&apos;t published yet. Only managers can see this page. 預覽：尚未公開
        </p>
      )}

      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- organiser-provided link from any host
        <img src={event.imageUrl} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
      )}

      <div>
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{event.title}</h1>
        <p className="mt-2 text-sm text-gray-700">
          {date} · {time(event.startAt)}
          {event.endAt ? ` – ${time(event.endAt)}` : ""} {zone}
        </p>
        {event.location && <p className="text-sm text-gray-700">{event.location}</p>}
        {event.description && <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{event.description}</p>}
      </div>

      {!event.ticketsEnabled || data.tiers.length === 0 ? (
        <p className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm">Tickets aren&apos;t available yet. 尚未開放購票。</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold" style={{ color: PRIMARY }}>1. Choose a ticket 選擇票種</legend>
            {data.tiers.map((t) => {
              const can = selectable(t);
              return (
                <label
                  key={t.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
                  style={{ borderColor: tierId === t.id ? PRIMARY : "#e5e7eb", opacity: can ? 1 : 0.55 }}
                >
                  <input type="radio" name="tier" className="mt-1" disabled={!can} checked={tierId === t.id} onChange={() => setTierId(t.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      <span className="shrink-0 text-right text-sm font-semibold text-gray-900">
                        {memberDeal(t) && <s className="mr-1.5 font-normal text-gray-400">{money(t.price)}</s>}
                        {money(priceFor(t))}
                      </span>
                    </span>
                    {t.perks && <span className="block text-xs text-gray-600">{t.perks}</span>}
                    {!viewer?.isMember && t.memberPrice !== null && !t.membersOnly && (
                      <span className="block text-xs text-gray-600">Members {money(t.memberPrice)} 會員價</span>
                    )}
                    {t.description && <span className="block text-xs text-gray-500">{t.description}</span>}
                    <span className="mt-1 block text-xs text-gray-500">
                      {t.state === "sold_out" && "Sold out 已售完"}
                      {t.state === "ended" && "Sales ended 已截止"}
                      {t.state === "not_started" && t.salesStartAt && `Sales open ${new Date(t.salesStartAt).toLocaleString("en-CA", { timeZone: tz, dateStyle: "medium", timeStyle: "short" })}`}
                      {t.state === "on_sale" && t.remaining !== null && t.remaining <= 20 && `${t.remaining} left 剩餘 ${t.remaining}`}
                      {t.membersOnly && " · Members only 限會員"}
                      {memberDeal(t) && " · Member price 會員價"}
                    </span>
                  </span>
                </label>
              );
            })}
            {!viewer && data.tiers.some((t) => t.memberPrice !== null || t.membersOnly) && (
              <a href={`/login?callbackUrl=${encodeURIComponent(`/e/${eventId}`)}`} className="text-xs underline" style={{ color: PRIMARY }}>
                Member? Log in for member prices 會員請登入享會員價
              </a>
            )}
            {viewer?.isMember && viewer.memberPriceUsed && (
              <p className="text-xs text-gray-500">You&apos;ve used your member price for this event. 本活動會員價已使用。</p>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold" style={{ color: PRIMARY }}>2. Your details 你的資料</legend>
            {(["name", "email", "phone"] as const).map((k) => (
              <input
                key={k}
                required={k !== "phone"}
                type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                autoComplete={k === "phone" ? "tel" : k}
                placeholder={{ name: "Full name 姓名", email: "Email 信箱", phone: "Phone 電話 (optional)" }[k]}
                value={buyer[k]}
                onChange={(e) => setBuyer({ ...buyer, [k]: e.target.value })}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-base text-gray-900"
              />
            ))}
            {viewer && <p className="text-xs text-gray-500">Filled in from your profile. 已自動帶入個人資料。</p>}
          </fieldset>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-1" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} required />
            I agree to the event rules and waiver. 我同意活動規範與免責聲明。
          </label>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy || !tierId}
            className="rounded-xl py-3 text-base font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {busy ? "Please wait… 請稍候" : (() => {
              const t = data.tiers.find((x) => x.id === tierId);
              return t && priceFor(t) === 0 ? "Get ticket 領取票券" : "Continue to payment 前往付款";
            })()}
          </button>
        </form>
      )}
    </div>
  );
}
