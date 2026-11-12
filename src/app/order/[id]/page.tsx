"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { use } from "react";

const PRIMARY = "#1a2744";

type OrderState = {
  status: string;
  eventTitle: string;
  eventPath: string;
  tickets: Array<{ token: string; ticketType: string }>;
};

// Stripe usually confirms within seconds; stop polling after a minute.
const POLL_MS = 2000;
const POLL_LIMIT = 30;

/** This page's text. Stripe returns buyers with ?lang=zh when they bought from a Chinese page. */
const TEXT = {
  en: {
    cancelledTitle: "Payment cancelled",
    cancelled: "No payment was taken. You can go back to the event page to try again.",
    notFoundTitle: "Order not found",
    notFound: "Please use the link from the payment page, or check your email for your ticket.",
    confirmingTitle: "Confirming your payment…",
    confirming: "This usually takes a few seconds. Please keep this page open.",
    slowTitle: "Still confirming your payment",
    slow: "This is taking longer than usual. Your ticket will be emailed to you once the payment is confirmed.",
    paidTitle: "You're in!",
    paid: (title: string) => (
      <>
        Your ticket for{" "}
        <strong className="mr-1">{title}</strong>
        {" "}is confirmed. We&apos;ve also emailed it to you.
      </>
    ),
    spam: "Didn't get the email? Check your spam or junk folder. It can take a few minutes to arrive.",
    view: (type: string) => `View ${type} ticket`,
    endedTitle: "Order not completed",
    ended: "This checkout expired or was cancelled, so no ticket was issued.",
    back: "Back to the event page",
  },
  zh: {
    cancelledTitle: "已取消付款",
    cancelled: "沒有扣款。你可以回到活動頁面重新購票。",
    notFoundTitle: "找不到訂單",
    notFound: "請使用付款頁面提供的連結，或到你的電郵查看票券。",
    confirmingTitle: "正在確認付款…",
    confirming: "通常只需要幾秒鐘，請不要關閉此頁面。",
    slowTitle: "仍在確認付款",
    slow: "確認時間比平常久。付款確認後，票券會寄到你的電郵。",
    paidTitle: "購票成功！",
    paid: (title: string) => (
      <>
        你的 <strong>{title}</strong> 門票已確認，我們也已將票券寄到你的電郵。
      </>
    ),
    spam: "沒收到電郵？請檢查垃圾郵件匣，郵件可能需要幾分鐘才會寄到。",
    view: () => "查看門票",
    endedTitle: "訂單未完成",
    ended: "此結帳已逾時或已取消，因此沒有開立票券。",
    back: "回到活動頁面",
  },
};

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const cancelled = searchParams.get("cancelled") === "1";
  const lang = searchParams.get("lang") === "zh" ? "zh" : "en";
  const t = TEXT[lang];

  const [order, setOrder] = useState<OrderState | null>(null);
  const [error, setError] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const query = `session_id=${encodeURIComponent(sessionId)}&lang=${lang}`;
    const url = `/api/orders/${encodeURIComponent(id)}?${query}`;
    let stopped = false;

    if (cancelled) {
      // They left Stripe with its back link: free the seat and member discount now,
      // then read the order once for the link back to the event page.
      void fetch(`/api/orders/${encodeURIComponent(id)}/cancel?${query}`, { method: "POST" })
        .catch(() => undefined)
        .then(() => fetch(url))
        .then((res) => (res.ok ? res.json() : null))
        .then((data: OrderState | null) => {
          if (!stopped && data) setOrder(data);
        })
        .catch(() => undefined);
      return () => {
        stopped = true;
      };
    }

    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      try {
        const res = await fetch(url);
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
  }, [id, sessionId, cancelled, lang]);

  let title: string;
  let body: React.ReactNode = null;
  let showBack = false;

  if (cancelled && sessionId && order?.status !== "PAID") {
    title = t.cancelledTitle;
    body = <p>{t.cancelled}</p>;
    showBack = true;
  } else if (!sessionId || error) {
    title = t.notFoundTitle;
    body = <p>{t.notFound}</p>;
  } else if (!order || order.status === "PENDING") {
    title = gaveUp ? t.slowTitle : t.confirmingTitle;
    body = <p>{gaveUp ? t.slow : t.confirming}</p>;
  } else if (order.status === "PAID") {
    title = t.paidTitle;
    body = (
      <>
        <p>{t.paid(order.eventTitle)}</p>
        <ul className="mt-5 space-y-3">
          {order.tickets.map((ticket) => (
            <li key={ticket.token}>
              <a
                href={`/ticket/${ticket.token}`}
                className="block rounded-xl px-5 py-3 text-center font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                {t.view(ticket.ticketType)}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-gray-500">{t.spam}</p>
      </>
    );
  } else {
    title = t.endedTitle;
    body = <p>{t.ended}</p>;
    showBack = true;
  }

  return (
    <main
      lang={lang === "zh" ? "zh-Hant" : "en"}
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#f9f7f4" }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {title}
        </h1>
        <div className="mt-3 text-sm text-gray-600">{body}</div>
        {showBack && order?.eventPath && (
          <a
            href={order.eventPath}
            className="mt-5 block rounded-xl border px-5 py-3 text-center text-sm font-semibold"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            {t.back}
          </a>
        )}
      </div>
    </main>
  );
}
