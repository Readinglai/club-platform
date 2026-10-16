"use client";

import { useCallback, useEffect, useState } from "react";

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

const ACTION_LABEL: Record<string, string> = { "event.delete": "Delete event 刪除活動" };
const STATUS_LABEL: Record<Request["status"], string> = {
  PENDING: "Waiting 等待中",
  APPROVED: "Approved 已核准",
  REJECTED: "Rejected 已拒絕",
  CANCELLED: "Cancelled 已取消",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" });

async function fetchApprovals(): Promise<{ toDecide: Request[]; mine: Request[] }> {
  const res = await fetch("/api/approvals");
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default function ApprovalsList() {
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
      .catch(() => active && setError("Could not load approvals."));
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p className="mt-6 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-gray-600">Loading… 載入中</p>;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Waiting for you 待你審核</h2>
        {data.toDecide.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Nothing to decide. 目前沒有待審項目。</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {data.toDecide.map((r) => (
              <DecideCard key={r.id} request={r} onDone={load} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Your requests 你的申請</h2>
        {data.mine.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">You haven&apos;t requested anything. 尚無申請。</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {data.mine.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 text-sm shadow-sm">
                <p className="font-medium text-gray-900">
                  {ACTION_LABEL[r.action] ?? r.action}: {r.details?.title ?? "—"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {STATUS_LABEL[r.status]} · requested {when(r.createdAt)}
                  {r.decidedBy && ` · by ${r.decidedBy.name}`}
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
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const d = request.details ?? {};

  async function decide(decision: "APPROVED" | "REJECTED") {
    const verb = decision === "APPROVED" ? "Approve and delete this event permanently? 核准並永久刪除？" : "Reject this request? 拒絕？";
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
      setMessage(data.error ?? "Something went wrong.");
      return;
    }
    await onDone();
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{ACTION_LABEL[request.action] ?? request.action}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: PRIMARY }}>{d.title ?? "—"}</p>
      <p className="mt-1 text-xs text-gray-500">
        Requested by {request.requestedBy.name || request.requestedBy.email} · {when(request.createdAt)}
      </p>
      <p className="mt-3 text-sm text-gray-700">
        {d.startAt ? `Event date: ${when(d.startAt)} · ` : ""}
        Tickets {(d.tickets ?? 0) + (d.legacyTickets ?? 0)} · Orders {d.orders ?? 0} · Registrations {d.registrations ?? 0}
      </p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="note (optional) 備註（選填）"
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("APPROVED")}
          className="flex-1 rounded-lg bg-red-700 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Approve 核准
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void decide("REJECTED")}
          className="flex-1 rounded-lg border py-2 text-sm font-semibold disabled:opacity-50"
          style={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          Reject 拒絕
        </button>
      </div>
      {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
    </div>
  );
}
