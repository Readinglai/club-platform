"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { getPublicEvent } from "@/lib/events/public";
import { saveLocale } from "@/i18n/save-locale";

/*
 * Hilo Party's ticket page. Laid out like the 2026 Halloween page
 * (src/app/[locale]/event/fall-2026): navy header, numbered steps on the
 * left, order summary on the right. Text lives in messages/*.json → hiloPage.
 */

type Data = NonNullable<Awaited<ReturnType<typeof getPublicEvent>>>;
type Tier = Data["tiers"][number];
type Status = "open" | "closed" | "opens" | "soldout" | "ended";
type MemberState = { state: "idle" } | { state: "checking" } | { state: "ok"; discount: number } | { state: "error"; code: string };
type Activity = { emoji: string; title: string; text: string };
type WaiverSection = { title: string; text: string };

const MEMBER_SIGNUP_URL = "https://forms.gle/z9eU3aVh2rMCeX858";
/** Hilo Party sells one ticket per order. */
const QUANTITY = 1;

const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const validPhone = (v: string) => /^[+()\d\s.-]{7,25}$/.test(v.trim());

/** What the page can sell overall, from the tiers' own states. */
function purchaseStatus(data: Data): { status: Status; opensAt?: string } {
  const { tiers } = data;
  if (!data.event.ticketsEnabled || tiers.length === 0) return { status: "closed" };
  if (tiers.some((t) => t.state === "on_sale" && !t.membersOnly)) return { status: "open" };
  const upcoming = tiers
    .filter((t) => t.state === "not_started" && t.salesStartAt)
    .map((t) => t.salesStartAt!)
    .sort()[0];
  if (upcoming) return { status: "opens", opensAt: upcoming };
  if (tiers.some((t) => t.state === "sold_out")) return { status: "soldout" };
  return { status: "ended" };
}

const sellable = (t: Tier) => t.state === "on_sale" && !t.membersOnly;

export default function HiloTickets({ initial }: { initial: Data }) {
  const t = useTranslations("hiloPage");
  const locale = useLocale();
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";

  const [data, setData] = useState(initial);
  const { event, tiers } = data;

  const [tierId, setTierId] = useState(() => initial.tiers.find(sellable)?.id ?? "");
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [isMember, setIsMember] = useState(false);
  const [member, setMember] = useState({ code: "", cardName: "" });
  const [memberState, setMemberState] = useState<MemberState>({ state: "idle" });
  const [waiver, setWaiver] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  // The field the checkout button just sent the user to (briefly outlined).
  const [missingField, setMissingField] = useState<string | null>(null);
  const missingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tz = event.timezone;
  const money = (amount: number) =>
    amount === 0
      ? t("free")
      : new Intl.NumberFormat(dateLocale, {
          style: "currency",
          currency: event.currency,
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        }).format(amount);
  const money2 = (amount: number) =>
    new Intl.NumberFormat(dateLocale, { style: "currency", currency: event.currency, currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(amount);
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString(dateLocale, { timeZone: tz, ...opts });
  const clock = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit" });

  const { status, opensAt } = purchaseStatus(data);
  const forSale = tiers.filter((x) => !x.membersOnly);
  const chosen = tiers.find((x) => x.id === tierId && sellable(x));
  const memberDiscount = event.memberDiscount;
  const verified = memberState.state === "ok";
  const discount = verified && chosen ? Math.min(memberState.discount, chosen.price) : 0;
  const subtotal = chosen ? chosen.price * QUANTITY : 0;
  const total = Math.max(0, subtotal - discount);

  const canContinue = Boolean(
    chosen && buyer.name.trim() && validEmail(buyer.email) && validPhone(buyer.phone) && waiver && (!isMember || verified),
  );

  const activities = t.raw("content.activities") as Activity[];
  const important = t.raw("content.important") as string[];
  const waiverSections = t.raw("content.waiver") as WaiverSection[];

  /** The server's reason in the page's language; its English message only for unknown codes. */
  function explain(body: { code?: string; message?: string; max?: number }) {
    const key = `errors.${body.code}`;
    if (body.code && t.has(key)) return t(key, { max: body.max ?? 1 });
    return body.message ?? t("genericError");
  }

  async function refresh() {
    const res = await fetch("/api/hilo/event", { cache: "no-store" });
    if (!res.ok) throw new Error("refresh failed");
    const next: Data = await res.json();
    setData(next);
    setTierId((current) => (next.tiers.some((x) => x.id === current && sellable(x)) ? current : next.tiers.find(sellable)?.id ?? ""));
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

  function toggleMember(checked: boolean) {
    setIsMember(checked);
    setMember({ code: "", cardName: "" });
    setMemberState({ state: "idle" });
  }

  /** Ask the server whether these member details earn the discount. */
  async function verifyMember() {
    if (!member.code.trim() || !member.cardName.trim()) {
      setMemberState({ state: "error", code: "member_missing" });
      return;
    }
    setMemberState({ state: "checking" });
    try {
      const res = await fetch("/api/hilo/member-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      });
      const body = await res.json().catch(() => ({}));
      setMemberState(body.ok ? { state: "ok", discount: body.discount } : { state: "error", code: body.code ?? "genericError" });
    } catch {
      setMemberState({ state: "error", code: "connection" });
    }
  }

  /** First thing still missing, in page order (element ids). */
  function firstIncomplete(): string | null {
    if (!chosen) return "hilo-tier";
    if (!buyer.name.trim()) return "hilo-name";
    if (!validEmail(buyer.email)) return "hilo-email";
    if (!validPhone(buyer.phone)) return "hilo-phone";
    if (isMember && !verified) {
      if (!member.code.trim()) return "hilo-member-code";
      if (!member.cardName.trim()) return "hilo-member-name";
      return "hilo-member-verify";
    }
    if (!waiver) return "hilo-waiver";
    return null;
  }

  function goToFirstIncomplete() {
    const id = firstIncomplete();
    const el = id ? document.getElementById(id) : null;
    if (!id || !el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
    setMissingField(id);
    if (missingTimer.current) clearTimeout(missingTimer.current);
    missingTimer.current = setTimeout(() => setMissingField(null), 2500);
  }

  const missing = (id: string) => (missingField === id ? " ring-2 ring-red-500 ring-offset-2" : "");

  async function checkout() {
    setError("");
    if (!canContinue || !chosen) {
      setError(t("completeFields"));
      goToFirstIncomplete();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/hilo/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketTypeId: chosen.id,
          quantity: QUANTITY,
          name: buyer.name.trim(),
          email: buyer.email.trim(),
          phone: buyer.phone.trim(),
          waiverAccepted: waiver,
          member: isMember ? member : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Sold out since the page loaded: show the new state too.
        if (res.status === 409) await refresh().catch(() => undefined);
        if (typeof body.code === "string" && body.code.startsWith("member_")) {
          setMemberState({ state: "error", code: body.code });
        }
        setError(explain(body));
        setBusy(false);
        return;
      }
      window.location.href = body.free ? body.ticketUrl : body.checkoutUrl;
    } catch {
      setError(t("connectionError"));
      setBusy(false);
    }
  }

  const memberError =
    memberState.state === "error"
      ? t.has(`memberErrors.${memberState.code}`)
        ? t(`memberErrors.${memberState.code}`)
        : t("genericError")
      : "";

  return (
    <main className="min-h-screen bg-[#f9f7f4] text-[#1a2744]">
      {/* Header */}
      <section className="bg-[#1a2744] px-5 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c9b99a]">{t("eventsLabel")}</p>
            <LanguageToggle />
          </div>
          {data.preview && (
            <p className="mb-4 inline-block rounded-lg border border-dashed border-[#c9b99a]/60 px-3 py-1.5 text-xs text-[#c9b99a]">{t("previewNote")}</p>
          )}
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-[#c9b99a] sm:text-5xl">{event.title}</h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/85 sm:text-lg">{t("content.intro")}</p>
          <p className="mt-3 max-w-3xl leading-7 text-white/75">{t("content.introText")}</p>
          {event.description && <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-6 text-white/60">{event.description}</p>}

          <div className="mt-8 grid gap-4 border-t border-white/15 pt-6 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[#c9b99a]">{t("time")}</p>
              <p className="mt-1 font-semibold">{fmt(event.startAt, { month: "short", day: "numeric", year: "numeric" })}</p>
              <p>
                {clock(event.startAt)}
                {event.endAt && ` – ${clock(event.endAt)}`}
              </p>
            </div>
            {event.location && (
              <div>
                <p className="text-[#c9b99a]">{t("location")}</p>
                <p className="mt-1 font-semibold">{event.location}</p>
              </div>
            )}
            <div>
              <p className="text-[#c9b99a]">Dress Code</p>
              <p className="mt-1 font-semibold">{t("content.dressCode")}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            {/* 1. Ticket */}
            <Card>
              <h2 className="text-lg font-bold">{t("chooseTicket")}</h2>
              <p className="mt-2 text-sm text-gray-500">{t("chooseTicketHelp")}</p>
              <div className="mt-5 space-y-3">
                {forSale.map((tier, i) => {
                  const enabled = sellable(tier) && status === "open";
                  const picked = enabled && tier.id === tierId;
                  return (
                    <button
                      key={tier.id}
                      id={i === 0 ? "hilo-tier" : undefined}
                      type="button"
                      disabled={!enabled}
                      onClick={() => setTierId(tier.id)}
                      className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        picked ? "border-[#1a2744] bg-[#f7f5f0] ring-1 ring-[#1a2744]" : "border-gray-200 bg-white hover:border-gray-400"
                      }${i === 0 ? missing("hilo-tier") : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${picked ? "border-[#1a2744]" : "border-gray-300"}`}>
                          {picked && <div className="h-2.5 w-2.5 rounded-full bg-[#1a2744]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{tier.name}</p>
                          {tier.perks && <p className="mt-1 text-sm text-gray-500">{tier.perks}</p>}
                          <div className="mt-3 space-y-1 text-sm">
                            {memberDiscount !== null && (
                              <p>
                                <span className="text-gray-500">{t("memberPriceLabel")}:</span>{" "}
                                <span className="font-semibold">{money(Math.max(0, tier.price - memberDiscount))}</span>
                              </p>
                            )}
                            <p>
                              <span className="text-gray-500">{t("regularPriceLabel")}:</span> <span className="font-semibold">{money(tier.price)}</span>
                            </p>
                          </div>
                          {tier.state === "sold_out" && <p className="mt-2 text-sm font-semibold text-red-700">{t("soldOut")}</p>}
                          {sellable(tier) && tier.remaining !== null && tier.remaining <= 20 && (
                            <p className="mt-2 text-sm font-semibold text-red-700">{t("left", { count: tier.remaining })}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Activities */}
            <Card>
              <h2 className="text-xl font-bold">{t("content.activitiesTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{t("content.activitiesIntro")}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {activities.map((a) => (
                  <div key={a.title} className="flex gap-4 rounded-xl border border-gray-100 bg-[#fcfbf9] p-4">
                    <span className="text-2xl" aria-hidden="true">{a.emoji}</span>
                    <div>
                      <h3 className="font-semibold">{a.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-gray-600">{a.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 rounded-xl bg-[#faf8f3] p-4 text-sm leading-6">🌟 {t("content.highlightNote")}</p>
            </Card>

            {status === "open" && (
              <>
                {/* 2. Buyer */}
                <Card>
                  <h2 className="text-lg font-bold">{t("yourInfo")}</h2>
                  <p className="mt-2 text-sm text-gray-500">{t("yourInfoHelp")}</p>
                  <div className="mt-5 space-y-4">
                    <Field id="hilo-name" label={t("name")}>
                      <input
                        id="hilo-name"
                        autoComplete="name"
                        maxLength={100}
                        value={buyer.name}
                        onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                        placeholder={t("namePlaceholder")}
                        className={inputClass + missing("hilo-name")}
                      />
                    </Field>
                    <Field id="hilo-email" label={t("email")} error={buyer.email && !validEmail(buyer.email) ? t("errors.invalid_email") : ""}>
                      <input
                        id="hilo-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        value={buyer.email}
                        onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                        placeholder="you@example.com"
                        className={inputClass + missing("hilo-email")}
                      />
                    </Field>
                    <Field id="hilo-phone" label={t("phone")} error={buyer.phone && !validPhone(buyer.phone) ? t("errors.invalid_phone") : ""}>
                      <input
                        id="hilo-phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={25}
                        value={buyer.phone}
                        onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                        placeholder={t("phonePlaceholder")}
                        className={inputClass + missing("hilo-phone")}
                      />
                    </Field>
                  </div>
                </Card>

                {/* 3. Membership */}
                {memberDiscount !== null && (
                  <Card>
                    <h2 className="text-lg font-bold">{t("memberSection")}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{t("memberDiscountText", { amount: money(memberDiscount) })}</p>
                    <p className="mt-2 text-sm font-semibold leading-6">{t("oneMemberTicket")}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {t("notMemberLong")}{" "}
                      <a href={MEMBER_SIGNUP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1a2744] underline underline-offset-4 hover:text-[#26395e]">
                        {t("signUpHere")}
                      </a>
                    </p>

                    <label className="mt-5 flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={isMember} onChange={(e) => toggleMember(e.target.checked)} className="mt-1 h-4 w-4 accent-[#1a2744]" />
                      <span className="text-sm font-medium">{t("memberCheckbox")}</span>
                    </label>

                    {isMember && (
                      <div className="mt-5 space-y-4 border-t border-gray-100 pt-5">
                        <p className="text-sm leading-6 text-gray-500">{t("memberHelp")}</p>
                        {!verified ? (
                          <>
                            <Field id="hilo-member-code" label={t("memberCode")}>
                              <input
                                id="hilo-member-code"
                                autoCapitalize="characters"
                                maxLength={50}
                                value={member.code}
                                onChange={(e) => {
                                  setMember({ ...member, code: e.target.value });
                                  setMemberState({ state: "idle" });
                                }}
                                placeholder="OTSA-2026-XXXX"
                                className={inputClass + missing("hilo-member-code")}
                              />
                            </Field>
                            <Field id="hilo-member-name" label={t("memberName")}>
                              <input
                                id="hilo-member-name"
                                maxLength={100}
                                value={member.cardName}
                                onChange={(e) => {
                                  setMember({ ...member, cardName: e.target.value });
                                  setMemberState({ state: "idle" });
                                }}
                                placeholder={t("memberNamePlaceholder")}
                                className={inputClass + missing("hilo-member-name")}
                              />
                            </Field>
                            <button
                              id="hilo-member-verify"
                              type="button"
                              onClick={() => void verifyMember()}
                              disabled={memberState.state === "checking"}
                              className={`rounded-xl bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#26395e] disabled:cursor-not-allowed disabled:opacity-50${missing("hilo-member-verify")}`}
                            >
                              {memberState.state === "checking" ? t("verifying") : t("verify")}
                            </button>
                            {memberError && (
                              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{memberError}</p>
                            )}
                          </>
                        ) : (
                          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                            <p className="font-semibold text-green-800">✓ {t("verified")}</p>
                            <p className="mt-1 text-sm text-green-700">{t("verifiedHelp")}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )}

                {/* 4. Policies */}
                <Card>
                  <h2 className="text-lg font-bold">{t("agreement")}</h2>
                  <div className="mt-5">
                    <button type="button" onClick={() => setShowWaiver(true)} className="text-sm font-semibold text-[#1a2744] underline underline-offset-4">
                      {t("viewWaiver")}
                    </button>
                    <label className="mt-3 flex cursor-pointer items-start gap-3">
                      <input
                        id="hilo-waiver"
                        type="checkbox"
                        checked={waiver}
                        onChange={(e) => setWaiver(e.target.checked)}
                        className={`mt-1 h-4 w-4 accent-[#1a2744]${missing("hilo-waiver")}`}
                      />
                      <span className="text-sm leading-6">{t("waiver")}</span>
                    </label>
                  </div>
                  <div className="mt-6 rounded-xl bg-[#faf8f3] p-4 text-sm leading-6">
                    <p className="font-semibold">{t("content.importantTitle")}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
                      {important.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Order summary */}
          <aside className="lg:sticky lg:top-6">
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              {status !== "open" ? (
                <ClosedMessage
                  status={status}
                  opensAt={opensAt ? fmt(opensAt, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : undefined}
                  onCheckAgain={status === "soldout" ? checkAgain : undefined}
                  checking={checking}
                  error={error}
                />
              ) : (
                <>
                  <h2 className="border-b border-gray-100 pb-4 text-lg font-bold">{t("summary")}</h2>
                  {!chosen ? (
                    <p className="py-6 text-sm text-gray-400">{t("chooseFirst")}</p>
                  ) : (
                    <div className="space-y-4 py-5 text-sm">
                      <div>
                        <p className="font-semibold">{chosen.name}</p>
                        {chosen.perks && <p className="mt-1 text-gray-500">{chosen.perks}</p>}
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-gray-500">{t("subtotal")}</span>
                        <span>{money2(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between gap-4 text-green-700">
                          <span>{t("lineDiscount")}</span>
                          <span>−{money2(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-gray-100 pt-4 text-base font-bold">
                        <span>{t("total")}</span>
                        <span>
                          {money2(total)} {event.currency}
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void checkout()}
                    disabled={busy}
                    aria-disabled={!canContinue}
                    className={`w-full rounded-xl bg-[#1a2744] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#26395e] disabled:cursor-not-allowed disabled:opacity-40${canContinue ? "" : " opacity-40"}`}
                  >
                    {busy ? t("processing") : t("continue")}
                  </button>

                  {error && (
                    <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p>
                  )}
                  {!canContinue && !error && <p className="mt-4 text-xs leading-5 text-gray-500">{t("completeFields")}</p>}
                  <p className="mt-4 text-center text-xs leading-5 text-gray-400">{t("paymentNote")}</p>
                </>
              )}
            </section>
          </aside>
        </div>
      </div>

      {showWaiver && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowWaiver(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="waiver-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="waiver-title" className="text-xl font-bold">{t("content.waiverTitle")}</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-gray-600">
              {waiverSections.map((s) => (
                <section key={s.title}>
                  <h3 className="font-semibold text-[#1a2744]">{s.title}</h3>
                  <p>{s.text}</p>
                </section>
              ))}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowWaiver(false)} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-[#1a2744]">
                {t("close")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setWaiver(true);
                  setShowWaiver(false);
                }}
                className="rounded-xl bg-[#1a2744] px-5 py-3 text-sm font-semibold text-white"
              >
                {t("agreeButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-[#1a2744] outline-none focus:border-[#1a2744] focus:ring-2 focus:ring-[#1a2744]/10";

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">{children}</section>;
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ClosedMessage({
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
  const t = useTranslations("hiloPage");
  const copy = {
    closed: [t("notOnSaleTitle"), t("notOnSaleText")],
    opens: [t("opensTitle", { when: opensAt ?? "" }), t("opensText")],
    soldout: [t("soldOutTitle"), t("soldOutText")],
    ended: [t("endedTitle"), t("endedText")],
  }[status];
  return (
    <div>
      <h2 className="text-lg font-bold">{copy[0]}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-500">{copy[1]}</p>
      {onCheckAgain && (
        <button
          type="button"
          onClick={onCheckAgain}
          disabled={checking}
          className="mt-5 w-full rounded-xl border border-[#1a2744] px-5 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {t("checkAgain")}
        </button>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** Same switch as the Halloween page: one button naming the other language. */
function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const target = locale === "zh" ? "en" : "zh";
  return (
    <button
      type="button"
      onClick={() => {
        saveLocale(target);
        router.refresh();
      }}
      className="rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
    >
      {target === "en" ? "English" : "繁體中文"}
    </button>
  );
}
