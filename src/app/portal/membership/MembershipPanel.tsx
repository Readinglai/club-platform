"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

const PRIMARY = "#1a2744";

type State = {
  status: "ACTIVE" | "PENDING" | "NONE";
  memberCode?: string;
  validUntil?: string;
  walletUrl?: string | null;
  priceCad: number;
};

// After paying, Stripe's confirmation usually arrives within seconds.
const POLL_MS = 2000;
const POLL_LIMIT = 30;

export default function MembershipPanel() {
  const t = useTranslations("portal.membershipPage");
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  const searchParams = useSearchParams();
  const justPaid = Boolean(searchParams.get("session_id"));
  const cancelled = searchParams.get("cancelled") === "1";

  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [waitedTooLong, setWaitedTooLong] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/me/membership");
    if (!res.ok) throw new Error(String(res.status));
    const data: State = await res.json();
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const tick = async () => {
      attempts += 1;
      try {
        const data = await load();
        // Keep checking only while a just-made payment is being confirmed.
        if (stopped || !justPaid || data.status === "ACTIVE") return;
      } catch {
        if (!justPaid) {
          setError(t("loadError"));
          return;
        }
      }
      if (attempts >= POLL_LIMIT) {
        setWaitedTooLong(true);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [load, justPaid, t]);

  async function startCheckout() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/me/membership/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? t("startError"));
        setStarting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError(t("noConnection"));
      setStarting(false);
    }
  }

  const card = "mt-6 rounded-2xl bg-white p-5 shadow-sm";

  if (!state) {
    return <div className={card}><p className="text-sm text-gray-600">{error || t("loading")}</p></div>;
  }

  if (state.status === "ACTIVE") {
    const until = new Date(state.validUntil!).toLocaleDateString(dateLocale, {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return (
      <div className={card}>
        <p className="text-sm font-semibold text-green-700">✓ {t("active")}</p>
        <p className="mt-4 text-xs font-medium text-gray-500">{t("memberCode")}</p>
        <p className="mt-1 text-2xl font-bold tracking-wide" style={{ color: PRIMARY }}>{state.memberCode}</p>
        <p className="mt-4 text-xs font-medium text-gray-500">{t("validUntil")}</p>
        <p className="mt-1 text-sm" style={{ color: PRIMARY }}>{until}</p>
        {state.walletUrl && (
          <a
            href={state.walletUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block w-full rounded-xl py-3 text-center text-base font-semibold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            {t("addToWallet")}
          </a>
        )}
      </div>
    );
  }

  if (justPaid) {
    return (
      <div className={card}>
        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
          {waitedTooLong ? t("stillConfirming") : t("confirming")}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          {waitedTooLong ? t("stillConfirmingHint") : t("confirmingHint")}
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      {cancelled && (
        <p className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          {t("cancelled")}
        </p>
      )}
      <p className="text-sm text-gray-700">
        {t("join")}
      </p>
      <p className="mt-4 text-3xl font-bold" style={{ color: PRIMARY }}>
        CA${state.priceCad.toFixed(2)}
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={startCheckout}
        disabled={starting}
        className="mt-5 w-full rounded-xl py-3 text-base font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: PRIMARY }}
      >
        {starting ? t("opening") : t("becomeMember")}
      </button>
    </div>
  );
}
