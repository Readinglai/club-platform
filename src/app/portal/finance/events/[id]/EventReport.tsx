"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cad, PlannedVsActual, StatTile, StatusBadge } from "../../charts";

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
  totals: { planned: number; spent: number; income: number; net: number };
  byCategory: Array<{ category: string; planned: number; actual: number }>;
  budgetLines: Array<{ id: string; category: string; item: string; quantity: number | null; unitCost: number | null; plannedAmount: number; note: string | null }>;
  records: Array<{ id: string; type: "INCOME" | "EXPENSE"; category: string; description: string | null; amount: number; date: string; receiptUrl: string | null; enteredBy: string }>;
  rights: { view: boolean; edit: boolean; submit: boolean; review: boolean };
};

function useDay() {
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  return (iso: string) => new Date(iso).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" });
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

export default function EventReport({
  eventId,
  expenseCategories,
  incomeCategories,
}: {
  eventId: string;
  expenseCategories: string[];
  incomeCategories: string[];
}) {
  const t = useTranslations("portal.eventReport");
  const day = useDay();
  const [data, setData] = useState<Finance | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const base = `/api/finance/events/${eventId}`;

  const refresh = useCallback(async () => {
    setData(await call(base, "GET"));
  }, [base]);

  useEffect(() => {
    let active = true;
    call(base, "GET")
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    return () => {
      active = false;
    };
  }, [base, t]);

  async function act(action: () => Promise<unknown>) {
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("error"));
    }
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-gray-600">{t("loading")}</p>;

  const editable = data.rights.edit && (data.report.status === "OPEN" || data.report.status === "RETURNED");

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
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr><th className="py-1 font-medium">{t("category")}</th><th className="font-medium">{t("item")}</th><th className="text-right font-medium">{t("plannedCol")}</th>{editable && <th />}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.budgetLines.map((l) => (
              <tr key={l.id}>
                <td className="py-2 pr-2 text-gray-600">{l.category}</td>
                <td className="pr-2 text-gray-900">
                  {l.item}
                  {l.quantity !== null && l.unitCost !== null && (
                    <span className="block text-xs text-gray-500">{l.quantity} × {cad(l.unitCost)}</span>
                  )}
                </td>
                <td className="text-right tabular-nums text-gray-900">{cad(l.plannedAmount)}</td>
                {editable && (
                  <td className="pl-2 text-right">
                    <button className="text-xs text-red-700 underline" onClick={() => confirm(t("removeLineConfirm")) && act(() => call(`${base}/budget-lines/${l.id}`, "DELETE"))}>
                      {t("remove")}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && <BudgetLineForm categories={expenseCategories} onAdd={(v) => act(() => call(`${base}/budget-lines`, "POST", v))} />}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("actualTitle")}</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr><th className="py-1 font-medium">{t("date")}</th><th className="font-medium">{t("what")}</th><th className="text-right font-medium">{t("amount")}</th>{editable && <th />}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.records.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-2 text-gray-600">{day(r.date)}</td>
                <td className="pr-2 text-gray-900">
                  {r.description}
                  <span className="block text-xs text-gray-500">
                    {r.type === "INCOME" ? t("incomeType") : t("costType")} · {r.category} · {r.enteredBy}
                    {r.receiptUrl && <> · <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">{t("receipt")}</a></>}
                  </span>
                </td>
                <td className="text-right tabular-nums text-gray-900">{r.type === "INCOME" ? "+" : "−"}{cad(r.amount)}</td>
                {editable && (
                  <td className="pl-2 text-right">
                    <button className="text-xs text-red-700 underline" onClick={() => confirm(t("removeEntryConfirm")) && act(() => call(`${base}/records/${r.id}`, "DELETE"))}>
                      {t("remove")}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <RecordForm expenseCategories={expenseCategories} incomeCategories={incomeCategories} onAdd={(v) => act(() => call(`${base}/records`, "POST", v))} />
        )}
      </section>

      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}

      {editable && data.rights.submit && (
        <button
          className="rounded-xl py-3 text-base font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}
          onClick={() => confirm(t("submitConfirm")) && act(() => call(`${base}/submit`, "POST"))}
        >
          {t("submit")}
        </button>
      )}

      {data.rights.review && data.report.status === "SUBMITTED" && <ReviewPanel onDecide={(decision, note) => act(() => call(`${base}/review`, "POST", { decision, note }))} />}
    </div>
  );
}

function BudgetLineForm({ categories, onAdd }: { categories: string[]; onAdd: (v: Record<string, string>) => Promise<void> }) {
  const t = useTranslations("portal.eventReport");
  const [v, setV] = useState({ category: categories[0], item: "", quantity: "", unitCost: "", plannedAmount: "" });
  const input = "rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900";
  return (
    <form
      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await onAdd(v);
        setV({ ...v, item: "", quantity: "", unitCost: "", plannedAmount: "" });
      }}
    >
      <select className={`${input} col-span-2 sm:col-span-1`} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input className={`${input} col-span-2`} required placeholder={t("itemPlaceholder")} value={v.item} onChange={(e) => setV({ ...v, item: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder={t("qty")} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder={t("unit")} value={v.unitCost} onChange={(e) => setV({ ...v, unitCost: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder={t("orTotal")} value={v.plannedAmount} onChange={(e) => setV({ ...v, plannedAmount: e.target.value })} />
      <button type="submit" className="col-span-2 rounded-lg border px-3 py-2 text-sm font-semibold sm:col-span-6" style={{ borderColor: PRIMARY, color: PRIMARY }}>
        {t("addBudgetLine")}
      </button>
    </form>
  );
}

function RecordForm({
  expenseCategories,
  incomeCategories,
  onAdd,
}: {
  expenseCategories: string[];
  incomeCategories: string[];
  onAdd: (v: Record<string, string>) => Promise<void>;
}) {
  const t = useTranslations("portal.eventReport");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
  const [v, setV] = useState({ type: "EXPENSE", category: expenseCategories[0], description: "", amount: "", date: today, receiptUrl: "" });
  const categories = v.type === "EXPENSE" ? expenseCategories : incomeCategories;
  const input = "rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900";
  return (
    <form
      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await onAdd(v);
        setV({ ...v, description: "", amount: "", receiptUrl: "" });
      }}
    >
      <select
        className={input}
        value={v.type}
        onChange={(e) => {
          const type = e.target.value;
          setV({ ...v, type, category: (type === "EXPENSE" ? expenseCategories : incomeCategories)[0] });
        }}
      >
        <option value="EXPENSE">{t("costType")}</option>
        <option value="INCOME">{t("incomeType")}</option>
      </select>
      <select className={input} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input className={`${input} col-span-2`} required placeholder={t("whatFor")} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      <input className={input} required inputMode="decimal" placeholder={t("amountPlaceholder")} value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
      <input className={input} required type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
      <input className={`${input} col-span-2 sm:col-span-5`} type="url" placeholder={t("receiptPlaceholder")} value={v.receiptUrl} onChange={(e) => setV({ ...v, receiptUrl: e.target.value })} />
      <button type="submit" className="col-span-2 rounded-lg border px-3 py-2 text-sm font-semibold sm:col-span-1" style={{ borderColor: PRIMARY, color: PRIMARY }}>
        {t("add")}
      </button>
    </form>
  );
}

function ReviewPanel({ onDecide }: { onDecide: (decision: "APPROVED" | "RETURNED", note: string) => Promise<void> }) {
  const t = useTranslations("portal.eventReport");
  const [note, setNote] = useState("");
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `2px solid ${PRIMARY}` }}>
      <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("reviewTitle")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("reviewHint")}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("notePlaceholder")}
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        rows={2}
      />
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }} onClick={() => onDecide("APPROVED", note)}>
          {t("approve")}
        </button>
        <button className="flex-1 rounded-lg border py-2 text-sm font-semibold" style={{ borderColor: PRIMARY, color: PRIMARY }} onClick={() => onDecide("RETURNED", note)}>
          {t("return")}
        </button>
      </div>
    </section>
  );
}
