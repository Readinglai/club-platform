"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { getPublicEvent } from "@/lib/events/public";
import { saveLocale } from "@/i18n/save-locale";

type Data = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
type Tier = Data["tiers"][number];
type Status = "open" | "closed" | "opens" | "soldout" | "ended";

/** What the stub can offer overall, from the tiers' own states. */
function purchaseStatus(data: Data): { status: Status; opensAt?: string } {
  const { tiers } = data;
  if (!data.event.ticketsEnabled || tiers.length === 0) return { status: "closed" };
  if (tiers.some((t) => t.state === "on_sale")) return { status: "open" };
  const upcoming = tiers
    .filter((t) => t.state === "not_started" && t.salesStartAt)
    .map((t) => t.salesStartAt!)
    .sort()[0];
  if (upcoming) return { status: "opens", opensAt: upcoming };
  if (tiers.some((t) => t.state === "sold_out")) return { status: "soldout" };
  return { status: "ended" };
}

export default function EventTickets({ eventId, initial }: { eventId: string; initial: Data }) {
  const t = useTranslations("ticketPage");
  const locale = useLocale();
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";

  const [data, setData] = useState(initial);
  const { event, viewer, tiers } = data;

  const memberDeal = (tier: Tier) => Boolean(viewer?.isMember && !viewer.memberPriceUsed && tier.memberPrice !== null);
  const priceFor = (tier: Tier) => (memberDeal(tier) ? tier.memberPrice! : tier.price);
  const selectable = (tier: Tier) =>
    tier.state === "on_sale" && (!tier.membersOnly || Boolean(viewer?.isMember && !viewer.memberPriceUsed));
  const firstSelectable = (list: Tier[]) => list.find(selectable)?.id ?? "";

  const [tierId, setTierId] = useState(() => firstSelectable(initial.tiers));
  const [buyer, setBuyer] = useState(initial.viewer?.prefill ?? { name: "", email: "", phone: "" });
  // Signed-in buyers see a one-line summary; guests (or incomplete profiles) fill the form.
  const [editing, setEditing] = useState(!initial.viewer?.prefill.name || !initial.viewer?.prefill.email);
  const [waiver, setWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const tz = event.timezone;
  const start = new Date(event.startAt);
  const part = (opts: Intl.DateTimeFormatOptions) => start.toLocaleDateString(dateLocale, { timeZone: tz, ...opts });
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(dateLocale, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const zone = new Intl.DateTimeFormat(dateLocale, { timeZone: tz, timeZoneName: "short" })
    .formatToParts(start)
    .find((p) => p.type === "timeZoneName")?.value;
  const when = (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const money = (amount: number) =>
    amount === 0
      ? t("free")
      : new Intl.NumberFormat(dateLocale, {
          style: "currency",
          currency: event.currency,
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        }).format(amount);

  const { status, opensAt } = purchaseStatus(data);
  const chosen = tiers.find((x) => x.id === tierId && selectable(x));
  const loginHref = `/login?callbackUrl=${encodeURIComponent(`/e/${eventId}`)}`;

  /** The server's reason in the page's language; its English message only for unknown codes. */
  function orderError(body: { code?: string; message?: string; max?: number }) {
    const key = `errors.${body.code}`;
    if (body.code && t.has(key)) return t(key, { max: body.max ?? 1 });
    return body.message ?? t("genericError");
  }

  async function refresh() {
    const res = await fetch(`/api/public/events/${eventId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("refresh failed");
    const next: Data = await res.json();
    setData(next);
    setTierId((current) => (next.tiers.some((x) => x.id === current && x.state === "on_sale") ? current : firstSelectable(next.tiers)));
  }

  async function checkAgain() {
    setChecking(true);
    setError("");
    try {
      await refresh();
    } catch {
      setError(t("connectionError"));
    }
    setChecking(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId: chosen.id, ...buyer, waiverAccepted: waiver }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sold out or member ticket used since the page loaded: show the new state too.
        if (res.status === 409) await refresh().catch(() => undefined);
        setError(orderError(body));
        setBusy(false);
        return;
      }
      window.location.href = body.free ? body.ticketUrl : body.checkoutUrl;
    } catch {
      setError(t("connectionError"));
      setBusy(false);
    }
  }

  return (
    <main className="px-3 pb-36 pt-4 sm:px-6 lg:pb-16 lg:pt-10">
      {data.preview && (
        <p className="mx-auto mb-3 max-w-md rounded-lg border border-dashed px-3 py-2 text-sm lg:max-w-5xl" style={{ borderColor: "var(--ink)", color: "var(--ink)" }}>
          {t("previewNote")}
        </p>
      )}

      {/* The ticket: navy event half + paper stub. */}
      <div className="mx-auto grid max-w-md overflow-visible rounded-2xl lg:max-w-5xl lg:grid-cols-[1.15fr_1fr]">
        <section
          aria-labelledby="event-title"
          className="rounded-t-2xl px-5 pb-8 pt-5 text-white lg:rounded-l-2xl lg:rounded-tr-none lg:px-10 lg:pb-12 lg:pt-8"
          style={{ backgroundColor: "var(--ink)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--gold)" }}>
              <Image src="/assets/logo.png" alt="" width={28} height={28} className="rounded-full" />
              ROCSAUT
            </span>
            <LanguageToggle />
          </div>

          <div className="mt-8 flex items-end gap-4 lg:mt-14">
            <span className="ticket-display text-[5.5rem] font-bold leading-[0.8] lg:text-[8rem]" style={{ color: "var(--gold)" }}>
              {part({ day: "numeric" }).replace(/\D/g, "")}
            </span>
            <span className="pb-1 leading-tight">
              <span className="ticket-display block text-2xl font-semibold lg:text-3xl">{part({ month: "long" })}</span>
              <span className="block text-sm text-white/75">
                {part({ weekday: "long" })}
                <span className="ml-2 text-white/50">{part({ year: "numeric" })}</span>
              </span>
            </span>
          </div>

          <h1 id="event-title" className="mt-6 text-[1.75rem] font-bold leading-tight lg:text-4xl" style={{ textWrap: "balance" }}>
            {event.title}
          </h1>

          <dl className="mt-5 grid gap-1.5 text-[0.9375rem] text-white/85">
            <div className="flex gap-2">
              <dt className="sr-only">{t("when")}</dt>
              <dd>
                {clock(event.startAt)}
                {event.endAt ? `–${clock(event.endAt)}` : ""} <span className="text-white/60">{zone}</span>
              </dd>
            </div>
            {event.location && (
              <div className="flex gap-2">
                <dt className="sr-only">{t("where")}</dt>
                <dd>{event.location}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* The stub: everything needed to buy. */}
        <section aria-labelledby="buy-title" className="ticket-stub rounded-b-2xl px-5 pb-6 pt-7 lg:rounded-r-2xl lg:rounded-bl-none lg:px-8 lg:pt-8">
          {status === "open" ? (
            <form onSubmit={submit} className="flex flex-col gap-6" noValidate={false}>
              <fieldset>
                <legend id="buy-title" className="mb-3 text-lg font-semibold">{t("chooseTicket")}</legend>
                <div className="flex flex-col gap-2">
                  {tiers.map((tier) => (
                    <TierOption
                      key={tier.id}
                      tier={tier}
                      checked={tierId === tier.id}
                      enabled={selectable(tier)}
                      onChoose={() => setTierId(tier.id)}
                      price={money(priceFor(tier))}
                      regularPrice={memberDeal(tier) ? money(tier.price) : null}
                      note={tierNote(tier)}
                    />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-lg font-semibold">{t("yourDetails")}</legend>
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <Field label={t("name")} id="buyer-name">
                      <input id="buyer-name" required autoComplete="name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label={t("email")} id="buyer-email">
                      <input id="buyer-email" required type="email" inputMode="email" autoComplete="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label={t("phone")} hint={t("optional")} id="buyer-phone">
                      <input id="buyer-phone" type="tel" autoComplete="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} className={inputClass} />
                    </Field>
                    {!viewer && (
                      <p className="text-sm" style={{ color: "var(--muted)" }}>
                        {t("haveAccount")}{" "}
                        <a href={loginHref} className="font-medium underline underline-offset-2" style={{ color: "var(--ink)" }}>{t("logIn")}</a>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--line)" }}>
                    <span className="min-w-0">
                      <span className="block font-medium">{buyer.name}</span>
                      <span className="block truncate text-sm" style={{ color: "var(--muted)" }}>{buyer.email}</span>
                    </span>
                    <button type="button" onClick={() => setEditing(true)} className="shrink-0 rounded-md px-2 py-1 text-sm font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2">
                      {t("edit")}
                    </button>
                  </div>
                )}
              </fieldset>

              <label className="flex items-start gap-3 text-[0.9375rem]">
                <input type="checkbox" required checked={waiver} onChange={(e) => setWaiver(e.target.checked)} className="mt-0.5 size-5 shrink-0" style={{ accentColor: "var(--ink)" }} />
                {t("waiver")}
              </label>

              {/* Pinned to the bottom of the screen on phones; part of the stub on wide screens. */}
              <div
                className="fixed inset-x-0 bottom-0 z-10 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 lg:static lg:border-0 lg:p-0"
                style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
              >
                {/* Errors sit next to the button that caused them, which on phones is pinned. */}
                <p role="alert" aria-live="assertive" className="mx-auto mb-2 max-w-md text-sm empty:hidden lg:mb-3 lg:max-w-none" style={{ color: "var(--danger)" }}>{error}</p>
                <div className="mx-auto flex max-w-md items-center gap-4 lg:max-w-none">
                  <span className="min-w-0 flex-1 lg:hidden">
                    <span className="block truncate text-sm" style={{ color: "var(--muted)" }}>{chosen ? chosen.name : t("pickFirst")}</span>
                    {chosen && <span className="ticket-display block text-2xl font-bold leading-none">{money(priceFor(chosen))}</span>}
                  </span>
                  <button
                    type="submit"
                    disabled={busy || !chosen}
                    className="min-h-12 shrink-0 rounded-xl px-6 text-base font-semibold text-white transition-opacity disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 lg:w-full"
                    style={{ backgroundColor: "var(--ink)", outlineColor: "var(--ink)" }}
                  >
                    {busy
                      ? chosen && priceFor(chosen) === 0 ? t("getting") : t("opening")
                      : !chosen ? t("pickFirst")
                      : priceFor(chosen) === 0 ? t("getFree")
                      : t("pay", { price: money(priceFor(chosen)) })}
                  </button>
                </div>
              </div>
              <p className="-mt-2 text-sm lg:text-center" style={{ color: "var(--muted)" }}>
                {chosen && priceFor(chosen) === 0 ? t("freeNote") : t("payNote")}
              </p>
            </form>
          ) : (
            <StubMessage
              status={status}
              opensAt={opensAt ? when(opensAt) : undefined}
              onCheckAgain={status === "soldout" ? checkAgain : undefined}
              checking={checking}
              error={error}
            />
          )}
        </section>
      </div>

      {(event.description || event.imageUrl) && (
        <section aria-labelledby="about-title" className="mx-auto mt-10 max-w-md lg:max-w-5xl">
          <h2 id="about-title" className="text-lg font-semibold">{t("aboutEvent")}</h2>
          <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_1fr]">
            {event.description && (
              <p className="max-w-[65ch] whitespace-pre-line text-[0.9375rem] leading-relaxed" style={{ color: "#2c3446" }}>
                {event.description}
              </p>
            )}
            {event.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- organiser-provided link from any host
              <img src={event.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
            )}
          </div>
        </section>
      )}
    </main>
  );

  /** The small line under a ticket type: availability, member pricing, or why it's unavailable. */
  function tierNote(tier: Tier): React.ReactNode {
    if (tier.state === "sold_out") return t("soldOut");
    if (tier.state === "ended") return t("salesEnded");
    if (tier.state === "not_started" && tier.salesStartAt) return t("onSaleFrom", { when: when(tier.salesStartAt) });
    if (tier.membersOnly && !viewer?.isMember) {
      return (
        <>
          {t("membersOnly")}{" "}
          <a href={viewer ? "/portal/membership" : loginHref} className="font-medium underline underline-offset-2" style={{ color: "var(--ink)" }}>
            {viewer ? t("becomeMember") : t("logInForMemberPrice")}
          </a>
        </>
      );
    }
    if (tier.membersOnly && viewer?.memberPriceUsed) return t("memberTicketUsed");
    const parts: React.ReactNode[] = [];
    if (memberDeal(tier)) parts.push(t("memberPrice"));
    if (!viewer?.isMember && tier.memberPrice !== null && !tier.membersOnly) {
      parts.push(
        <span key="member">
          {t("membersPay", { price: money(tier.memberPrice) })}{" "}
          <a href={viewer ? "/portal/membership" : loginHref} className="font-medium underline underline-offset-2" style={{ color: "var(--ink)" }}>
            {viewer ? t("becomeMember") : t("logInForMemberPrice")}
          </a>
        </span>
      );
    }
    if (tier.remaining !== null && tier.remaining <= 20) parts.push(t("left", { count: tier.remaining }));
    return parts.length ? <span className="flex flex-wrap gap-x-4 gap-y-1">{parts.map((p, i) => <span key={i}>{p}</span>)}</span> : null;
  }
}

const inputClass =
  "w-full rounded-lg border bg-white px-3.5 py-3 text-base text-[var(--ink)] outline-none focus-visible:border-[var(--ink)] focus-visible:ring-2 focus-visible:ring-[var(--ink)]/20 border-[var(--line)]";

function Field({ label, hint, id, children }: { label: string; hint?: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {hint && <span className="font-normal" style={{ color: "var(--muted)" }}> ({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function TierOption({
  tier,
  checked,
  enabled,
  onChoose,
  price,
  regularPrice,
  note,
}: {
  tier: Tier;
  checked: boolean;
  enabled: boolean;
  onChoose: () => void;
  price: string;
  regularPrice: string | null;
  note: React.ReactNode;
}) {
  const stripe = enabled ? tier.color ?? "var(--ink)" : "var(--line)";
  return (
    <label
      className={`relative flex items-start gap-3 overflow-hidden rounded-xl border py-3.5 pl-5 pr-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ink)] ${enabled ? "cursor-pointer" : "cursor-default"}`}
      style={{
        borderColor: checked ? "var(--ink)" : "var(--line)",
        boxShadow: checked ? "inset 0 0 0 1px var(--ink)" : undefined,
        backgroundColor: enabled ? "var(--paper)" : "#fbfaf8",
      }}
    >
      {/* The ticket type's own colour, like a wristband. */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: stripe }} />
      <input
        type="radio"
        name="tier"
        value={tier.id}
        checked={checked}
        disabled={!enabled}
        onChange={onChoose}
        className="mt-1 size-5 shrink-0"
        style={{ accentColor: "var(--ink)" }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={`font-semibold ${enabled ? "" : "text-[var(--muted)]"}`}>{tier.name}</span>
          <span className="shrink-0 text-right">
            {regularPrice && <s className="mr-2 text-sm" style={{ color: "var(--muted)" }}>{regularPrice}</s>}
            <span className={`ticket-display text-2xl font-bold leading-none ${enabled ? "" : "text-[var(--muted)]"}`}>{price}</span>
          </span>
        </span>
        {tier.perks && <span className="mt-0.5 block text-sm" style={{ color: "var(--muted)" }}>{tier.perks}</span>}
        {tier.description && <span className="mt-0.5 block text-sm" style={{ color: "var(--muted)" }}>{tier.description}</span>}
        {note && <span className="mt-1.5 block text-sm font-medium" style={{ color: enabled ? "var(--ink)" : "var(--muted)" }}>{note}</span>}
      </span>
    </label>
  );
}

function StubMessage({
  status,
  opensAt,
  onCheckAgain,
  checking,
  error,
}: {
  status: Exclude<Status, "open">;
  opensAt?: string;
  onCheckAgain?: () => void;
  checking: boolean;
  error: string;
}) {
  const t = useTranslations("ticketPage");
  const copy = {
    closed: [t("notOnSaleTitle"), t("notOnSaleText")],
    opens: [t("opensTitle", { when: opensAt ?? "" }), t("opensText")],
    soldout: [t("soldOutTitle"), t("soldOutText")],
    ended: [t("endedTitle"), t("endedText")],
  }[status];
  return (
    <div className="py-2 lg:py-6">
      <h2 id="buy-title" className={status === "soldout" ? "ticket-display text-4xl font-bold" : "text-xl font-semibold"}>
        {copy[0]}
      </h2>
      <p className="mt-2 max-w-[44ch] text-[0.9375rem]" style={{ color: "var(--muted)" }}>{copy[1]}</p>
      {onCheckAgain && (
        <button
          type="button"
          onClick={onCheckAgain}
          disabled={checking}
          className="mt-5 min-h-11 rounded-xl border px-5 text-sm font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: "var(--ink)" }}
        >
          {t("checkAgain")}
        </button>
      )}
      <p role="alert" className="mt-3 text-sm empty:hidden" style={{ color: "var(--danger)" }}>{error}</p>
    </div>
  );
}

function LanguageToggle() {
  const t = useTranslations("ticketPage");
  const locale = useLocale();
  const router = useRouter();
  return (
    <div role="group" aria-label={t("language")} className="flex rounded-lg border text-xs" style={{ borderColor: "var(--ink-line)" }}>
      {[
        { code: "en", label: "EN" },
        { code: "zh", label: "中文" },
      ].map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={locale === l.code}
          onClick={() => {
            saveLocale(l.code);
            router.refresh();
          }}
          className="min-h-8 px-3 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={locale === l.code ? { backgroundColor: "var(--gold)", color: "var(--ink)", outlineColor: "var(--gold)" } : { color: "#ffffffcc", outlineColor: "var(--gold)" }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
