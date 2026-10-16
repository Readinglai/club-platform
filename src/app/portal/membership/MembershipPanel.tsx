"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const PRIMARY = "#1a2744";

type State = {
  status: "ACTIVE" | "PENDING" | "NONE";
  memberCode?: string;
  validUntil?: string;
  priceCad: number;
};

// After paying, Stripe's confirmation usually arrives within seconds.
const POLL_MS = 2000;
const POLL_LIMIT = 30;

export default function MembershipPanel() {
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
          setError("Could not load your membership. Please refresh.");
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
  }, [load, justPaid]);

  async function startCheckout() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/me/membership/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Payment could not be started. Please try again.");
        setStarting(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("No connection. Please try again.");
      setStarting(false);
    }
  }

  const card = "mt-6 rounded-2xl bg-white p-5 shadow-sm";

  if (!state) {
    return <div className={card}><p className="text-sm text-gray-600">{error || "Loading… 載入中"}</p></div>;
  }

  if (state.status === "ACTIVE") {
    const until = new Date(state.validUntil!).toLocaleDateString("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return (
      <div className={card}>
        <p className="text-sm font-semibold text-green-700">✓ Active member 有效會員</p>
        <p className="mt-4 text-xs font-medium text-gray-500">Member code 會員編號</p>
        <p className="mt-1 text-2xl font-bold tracking-wide" style={{ color: PRIMARY }}>{state.memberCode}</p>
        <p className="mt-4 text-xs font-medium text-gray-500">Valid until 有效期限</p>
        <p className="mt-1 text-sm" style={{ color: PRIMARY }}>{until}</p>
      </div>
    );
  }

  if (justPaid) {
    return (
      <div className={card}>
        <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
          {waitedTooLong ? "Still confirming your payment 付款確認中" : "Confirming your payment… 付款確認中…"}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          {waitedTooLong
            ? "This is taking longer than usual. You'll get an email once it's confirmed."
            : "This usually takes a few seconds. Please keep this page open."}
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      {cancelled && (
        <p className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
          Payment cancelled — nothing was charged. 已取消付款，未扣款。
        </p>
      )}
      <p className="text-sm text-gray-700">
        Become a ROCSAUT member for this school year (until August 31).
        <br />
        加入 ROCSAUT 成為本學年會員（至 8 月 31 日）。
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
        {starting ? "Opening payment… 前往付款…" : "Become a member 加入會員"}
      </button>
    </div>
  );
}
