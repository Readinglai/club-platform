"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SheetData } from "@/lib/finance/budget-sheet";
import { sheetCategory } from "@/lib/finance/categories";
import { BarList, cad, PlannedVsActual, StatTile, StatusBadge } from "../../charts";

const PRIMARY = "#1a2744";

type Finance = {
  event: { id: string; title: string; startAt: string; location: string | null };
  report: {
    status: "OPEN" | "SUBMITTED" | "APPROVED" | "RETURNED";
    submittedAt: string | null;
    submittedBy: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewNote: string | null;
  };
  sheet: { id: string; url: string; syncedAt: string | null; error: string | null; data: SheetData | null } | null;
  totals: { planned: number; spent: number; income: number; net: number };
  byCategory: Array<{ category: string; planned: number; actual: number }>;
  budgetLines: Array<{ id: string; category: string; item: string; quantity: number | null; unitCost: number | null; plannedAmount: number; note: string | null }>;
  records: Array<{ id: string; type: "INCOME" | "EXPENSE"; category: string; description: string | null; amount: number; date: string; receiptUrl: string | null; enteredBy: string }>;
  rights: { view: boolean; connect: boolean };
  sync: { enabled: boolean; robotEmail: string | null };
};

function useDates() {
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  return {
    day: (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" }),
    moment: (iso: string) => new Date(iso).toLocaleString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }),
  };
}

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** One event's money. Budgets are written and approved in the event's Google Sheet; this page reads it. */
export default function EventReport({ eventId }: { eventId: string }) {
  const t = useTranslations("portal.eventReport");
  const { day } = useDates();
  const [data, setData] = useState<Finance | null>(null);
  const [error, setError] = useState("");
  const base = `/api/finance/events/${eventId}`;

  const load = useCallback(() => call(base, "GET").then((d: Finance) => setData(d)), [base]);

  useEffect(() => {
    let active = true;
    call(base, "GET")
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    return () => {
      active = false;
    };
  }, [base, t]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-gray-600">{t("loading")}</p>;
  const sheetData = data.sheet?.data ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{data.event.title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {day(data.event.startAt)}
          {data.event.location ? ` · ${data.event.location}` : ""}
        </p>
        <div className="mt-3"><StatusBadge status={data.report.status} /></div>
        {data.report.reviewNote && (
          <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
            {data.report.reviewedBy ? `${data.report.reviewedBy}: ` : ""}“{data.report.reviewNote}”
          </p>
        )}
      </div>

      <SheetPanel finance={data} base={base} onChanged={load} />

      {sheetData ? <SheetAnalytics data={sheetData} /> : <TypedInNumbers data={data} />}
    </div>
  );
}

/** Connect, sync and status of the event's Google Sheet. */
function SheetPanel({ finance, base, onChanged }: { finance: Finance; base: string; onChanged: () => Promise<void> }) {
  const t = useTranslations("portal.eventReport");
  const { moment } = useDates();
  const { sheet, rights, sync } = finance;
  const [link, setLink] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<"" | "connect" | "sync">("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const hasTypedIn = !sheet && (finance.budgetLines.length > 0 || finance.records.length > 0);

  async function run(kind: "connect" | "sync") {
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "connect") await call(`${base}/sheet`, "POST", { link });
      else await call(`${base}/sheet/sync`, "POST");
      setMessage({ ok: true, text: t(kind === "connect" ? "connected" : "synced") });
      setEditing(false);
      setLink("");
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : t("loadError") });
    }
    await onChanged().catch(() => undefined);
    setBusy("");
  }

  const connectForm = (
    <form
      className="mt-3 flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        void run("connect");
      }}
    >
      <label htmlFor="sheet-link" className="sr-only">{t("pasteLink")}</label>
      <input
        id="sheet-link"
        required
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder={t("pasteLink")}
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
      />
      <button type="submit" disabled={busy !== ""} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
        {busy === "connect" ? t("connecting") : t("connect")}
      </button>
    </form>
  );

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="sheet-title">
      <h2 id="sheet-title" className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("sheetTitle")}</h2>

      {sheet ? (
        <>
          <p className="mt-1 text-sm text-gray-700">
            <a href={sheet.url} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: PRIMARY }}>
              {sheet.data?.title ?? t("openSheet")}
            </a>
            <span className="text-gray-500"> · {sheet.syncedAt ? t("lastSynced", { when: moment(sheet.syncedAt) }) : t("neverSynced")}</span>
          </p>
          {rights.connect && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => run("sync")} disabled={busy !== ""} className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
                {busy === "sync" ? t("syncing") : t("syncNow")}
              </button>
              <button type="button" onClick={() => setEditing(!editing)} className="rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: PRIMARY, color: PRIMARY }}>
                {t("changeSheet")}
              </button>
            </div>
          )}
          {editing && connectForm}
          {sheet.error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{sheet.error}</p>}
          {sheet.data && sheet.data.warnings.length > 0 && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-medium">{t("warningsTitle")}</p>
              <ul className="mt-1 list-disc pl-5">{sheet.data.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">{t("dailySync")}</p>
        </>
      ) : hasTypedIn ? (
        <p className="mt-1 text-sm text-gray-600">{t("typedInNote")}</p>
      ) : rights.connect ? (
        <>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>{t("step1")}</li>
            <li>{sync.robotEmail ? t("step2", { email: sync.robotEmail }) : t("step2NotReady")}</li>
            <li>{t("step3")}</li>
          </ol>
          {connectForm}
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-600">{t("notConnected")}</p>
      )}

      {!sync.enabled && (sheet || rights.connect) && !hasTypedIn && (
        <p className="mt-3 text-xs text-gray-500">{sheet ? t("syncOffConnected") : t("syncOff")}</p>
      )}
      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>{message.text}</p>
      )}
    </section>
  );
}

/** What the last sync read: cap, plan vs actual, allocation, approval and lines. */
function SheetAnalytics({ data }: { data: SheetData }) {
  const t = useTranslations("portal.eventReport");
  const plannedPnl = data.planned.revenue.total - data.planned.expense.total;
  const actualPnl = data.actual.revenue.total - data.actual.expense.total;
  const rows = [
    { label: t("revenue"), planned: data.planned.revenue.total, actual: data.actual.revenue.total },
    { label: t("expense"), planned: data.planned.expense.total, actual: data.actual.expense.total },
    { label: t("pnl"), planned: plannedPnl, actual: actualPnl },
  ];
  const allocated = data.allocation.reduce((s, a) => s + a.amount, 0);

  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("cap")} value={data.cap === null ? "—" : cad(data.cap)} />
        <StatTile
          label={t("projectedExpense")}
          value={cad(data.planned.expense.total)}
          hint={data.cap !== null ? (data.planned.expense.total > data.cap ? t("overCap", { amount: cad(data.planned.expense.total - data.cap) }) : t("withinCap")) : undefined}
        />
        <StatTile label={t("actualExpense")} value={cad(data.actual.expense.total)} />
        <StatTile label={t("actualPnl")} value={cad(actualPnl)} hint={t("projectedHint", { amount: cad(plannedPnl) })} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("planVsActual")}</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[360px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1 font-medium"><span className="sr-only">{t("item")}</span></th>
                <th className="text-right font-medium">{t("projected")}</th>
                <th className="text-right font-medium">{t("actual")}</th>
                <th className="text-right font-medium">{t("difference")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-2 pr-2 font-medium text-gray-900">{r.label}</td>
                  <td className="text-right tabular-nums text-gray-700">{cad(r.planned)}</td>
                  <td className="text-right tabular-nums text-gray-900">{cad(r.actual)}</td>
                  <td className="text-right tabular-nums text-gray-700">{cad(r.actual - r.planned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold" style={{ color: PRIMARY }}>{t("allocation")}</h2>
        <p className="mb-4 text-xs text-gray-500">{t("allocationHint", { total: cad(allocated) })}</p>
        <BarList
          rows={data.allocation.map((a) => {
            // Show the club's spelling (the template says "Alchohol"); unknown labels as written.
            const category = sheetCategory(a.label);
            return { label: category === "Other" ? a.label : category, value: a.amount };
          })}
          label={t("allocation")}
        />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("approval")}</h2>
        <p className="mt-1 text-sm text-gray-700">
          {t("approvalStatus")}: <span className="font-medium">{data.approval.status ?? "—"}</span>
        </p>
        {data.approval.lines.length > 0 ? (
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {data.approval.lines.map((l, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium text-gray-900">{l.position || "—"}</span> <span className="text-gray-600">{l.name}</span>
                </span>
                <span className="text-gray-600">
                  {l.date}
                  <span className="ml-3">{l.approved === true ? `✓ ${t("approved")}` : l.approved === false ? `✗ ${t("notApproved")}` : "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t("noApprovalLines")}</p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineList title={t("planTitle")} revenue={data.planned.revenue.lines} expense={data.planned.expense.lines} />
        <LineList title={t("actualSheetTitle")} revenue={data.actual.revenue.lines} expense={data.actual.expense.lines} />
      </div>
    </>
  );
}

type Lines = SheetData["planned"]["revenue"]["lines"];

function LineList({ title, revenue, expense }: { title: string; revenue: Lines; expense: Lines }) {
  const t = useTranslations("portal.eventReport");
  const group = (label: string, lines: Lines, sign: string) => (
    <>
      <tr>
        <th colSpan={2} className="pt-3 text-left text-xs font-medium text-gray-500">{label}</th>
      </tr>
      {lines.length === 0 ? (
        <tr>
          <td colSpan={2} className="py-1 text-gray-400">—</td>
        </tr>
      ) : (
        lines.map((l, i) => (
          <tr key={`${label}-${i}`}>
            <td className="py-1.5 pr-2 text-gray-900">
              {l.item}
              {l.note && <span className="block text-xs text-gray-500">{l.note}</span>}
            </td>
            <td className="text-right tabular-nums text-gray-900">{sign}{cad(l.total)}</td>
          </tr>
        ))
      )}
    </>
  );
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{title}</h2>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {group(t("revenue"), revenue, "+")}
          {group(t("expense"), expense, "−")}
        </tbody>
      </table>
    </section>
  );
}

/** Events without a sheet (e.g. the [DEMO] ones): the numbers typed in before, read-only. */
function TypedInNumbers({ data }: { data: Finance }) {
  const t = useTranslations("portal.eventReport");
  const { day } = useDates();
  if (data.budgetLines.length === 0 && data.records.length === 0) return null;
  return (
    <>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("planned")} value={cad(data.totals.planned)} />
        <StatTile label={t("spent")} value={cad(data.totals.spent)} />
        <StatTile label={t("income")} value={cad(data.totals.income)} />
        <StatTile label={t("net")} value={cad(data.totals.net)} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: PRIMARY }}>{t("budgetVsActual")}</h2>
        <PlannedVsActual rows={data.byCategory} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("budget")}</h2>
        {data.budgetLines.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noBudget")}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1 font-medium">{t("category")}</th>
                <th className="font-medium">{t("item")}</th>
                <th className="text-right font-medium">{t("plannedCol")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.budgetLines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-2 text-gray-600">{l.category}</td>
                  <td className="pr-2 text-gray-900">
                    {l.item}
                    {l.quantity !== null && l.unitCost !== null && <span className="block text-xs text-gray-500">{l.quantity} × {cad(l.unitCost)}</span>}
                  </td>
                  <td className="text-right tabular-nums text-gray-900">{cad(l.plannedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("actualTitle")}</h2>
        {data.records.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">{t("noActuals")}</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="py-1 font-medium">{t("date")}</th>
                <th className="font-medium">{t("what")}</th>
                <th className="text-right font-medium">{t("amount")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.records.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-2 text-gray-600">{day(r.date)}</td>
                  <td className="pr-2 text-gray-900">
                    {r.description}
                    <span className="block text-xs text-gray-500">
                      {r.type === "INCOME" ? t("incomeType") : t("costType")} · {r.category}
                      {r.receiptUrl && <> · <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">{t("receipt")}</a></>}
                    </span>
                  </td>
                  <td className="text-right tabular-nums text-gray-900">{r.type === "INCOME" ? "+" : "−"}{cad(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
