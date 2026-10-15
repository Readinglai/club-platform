"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";

const PRIMARY = "#1a2744";

type OrderState = {
  status: string;
  eventTitle: string;
  tickets: Array<{ token: string; ticketType: string }>;
};

// Stripe usually confirms within seconds; stop polling after a minute.
const POLL_MS = 2000;
const POLL_LIMIT = 30;

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("cancelled") === "1";

  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!sessionId || cancelled) return;

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(id)}?session_id=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) {
          setError(true);
          return;
        }
        const data: OrderState = await res.json();
        if (stopped) return;
        setOrder(data);
        if (data.status !== "PENDING") return;
      } catch {
        // Network blip: keep polling.
      }
      if (attempts >= POLL_LIMIT) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [id, sessionId, cancelled]);

  let title: string;
  let body: React.ReactNode = null;

  if (cancelled) {
    title = "Payment cancelled";
    body = <p>No payment was taken. You can go back to the event page to try again.</p>;
  } else if (!sessionId || error) {
    title = "Order not found";
    body = <p>Please use the link from the payment page, or check your email for your ticket.</p>;
  } else if (!order || order.status === "PENDING") {
    title = gaveUp ? "Still confirming your payment" : "Confirming your payment…";
    body = gaveUp ? (
      <p>This is taking longer than usual. Your ticket will be emailed to you once the payment is confirmed.</p>
    ) : (
      <p>This usually takes a few seconds. Please keep this page open.</p>
    );
  } else if (order.status === "PAID") {
    title = "You're in!";
    body = (
      <>
        <p>
          Your ticket for <strong>{order.eventTitle}</strong> is confirmed. We&apos;ve also emailed it to you.
        </p>
        <ul className="mt-5 space-y-3">
          {order.tickets.map((t) => (
            <li key={t.token}>
              <a
                href={`/ticket/${t.token}`}
                className="block rounded-xl px-5 py-3 text-center font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                View {t.ticketType} ticket
              </a>
            </li>
          ))}
        </ul>
      </>
    );
  } else {
    title = "Order not completed";
    body = <p>This checkout expired or was cancelled, so no ticket was issued.</p>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {title}
        </h1>
        <div className="mt-3 text-sm text-gray-600">{body}</div>
      </div>
    </main>
  );
}
