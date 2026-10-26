"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const PRIMARY = "#1a2744";

type Request = {
  id: string;
  action: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
  details: {
    title?: string;
    startAt?: string;
    tickets?: number;
    orders?: number;
    legacyTickets?: number;
    registrations?: number;
  } | null;
  requestedBy: { name: string; email: string };
  decidedBy: { name: string } | null;
};

/** Approval actions use keys like "event.delete" → message "action_event_delete". */
const actionKey = (action: string) => `action_${action.replace(/\./g, "_")}`;

function useWhen() {
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  return (iso: string) =>
    new Date(iso).toLocaleString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });
}

async function fetchApprovals(): Promise<{ toDecide: Request[]; mine: Request[] }> {
  const res = await fetch("/api/approvals");
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function ApprovalsList() {
  const t = useTranslations("portal.approvalsPage");
  const when = useWhen();
  const [data, setData] = useState<{ toDecide: Request[]; mine: Request[] } | null>(null);
  const [error, setError] = useState("");

  // Refresh after a decision.
  const load = useCallback(async () => {
    setData(await fetchApprovals());
  }, []);

  useEffect(() => {
    let active = true;
    fetchApprovals()
      .then((d) => active && setData(d))
      .catch(() => active && setError(t("loadError")));
    return () => {
      active = false;
    };
  }, [t]);

  if (error) return <p className="mt-6 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-gray-600">{t("loading")}</p>;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("waiting")}</h2>
        {data.toDecide.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t("nothingToDecide")}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {data.toDecide.map((r) => (
              <DecideCard key={r.id} request={r} onDone={load} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("yourRequests")}</h2>
        {data.mine.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">{t("noRequests")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.mine.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-gray-900">
                  {t(actionKey(r.action))}: {r.details?.title ?? "—"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {t(`status${r.status}`)} · {t("requestedOn", { date: when(r.createdAt) })}
                  {r.decidedBy && ` · ${t("decidedBy", { name: r.decidedBy.name })}`}
                </p>
                {r.note && <p className="mt-1 text-xs text-gray-600">“{r.note}”</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DecideCard({ request, onDone }: { request: Request; onDone: () => Promise<void> }) {
  const t = useTranslations("portal.approvalsPage");
  const when = useWhen();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const d = request.details ?? {};

  async function decide(decision: "APPROVED" | "REJECTED") {
    const verb = decision === "APPROVED" ? t("confirmApprove") : t("confirmReject");
    if (!confirm(verb)) return;
    setBusy(true);
    setMessage("");
    const res = await fetch(`/api/approvals/${request.id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? t("error"));
      return;
    }
    await onDone();
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t(actionKey(request.action))}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: PRIMARY }}>{d.title ?? "—"}</p>
      <p className="mt-1 text-xs text-gray-500">
        {t("requestedBy", { name: request.requestedBy.name || request.requestedBy.email, date: when(request.createdAt) })}
      </p>
      <p className="mt-3 text-sm text-gray-700">
        {d.startAt ? `${t("eventDate", { date: when(d.startAt) })} · ` : ""}
        {t("impact", { tickets: (d.tickets ?? 0) + (d.legacyTickets ?? 0), orders: d.orders ?? 0, registrations: d.registrations ?? 0 })}
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("notePlaceholder")}
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("APPROVED")}
          className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t("approve")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("REJECTED")}
          className="flex-1 rounded-lg border py-2 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          {t("reject")}
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
    </div>
  );
}
