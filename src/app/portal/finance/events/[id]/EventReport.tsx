"use client";

import { useCallback, useEffect, useState } from "react";
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

const day = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium" });

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
      .catch((e) => active && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      active = false;
    };
  }, [base]);

  async function act(action: () => Promise<unknown>) {
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-gray-600">Loading… 載入中</p>;

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
        <StatTile label="Planned 預算" value={cad(data.totals.planned)} />
        <StatTile label="Spent 支出" value={cad(data.totals.spent)} />
        <StatTile label="Income 收入" value={cad(data.totals.income)} />
        <StatTile label="Net 結餘" value={cad(data.totals.net)} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold" style={{ color: PRIMARY }}>Budget vs actual 預算與實際</h2>
        <PlannedVsActual rows={data.byCategory} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Budget 預算明細</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr><th className="py-1 font-medium">Category</th><th className="font-medium">Item</th><th className="text-right font-medium">Planned</th>{editable && <th />}</tr>
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
                    <button className="text-xs text-red-700 underline" onClick={() => confirm("Remove this line?") && act(() => call(`${base}/budget-lines/${l.id}`, "DELETE"))}>
                      Remove
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
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Actual costs & income 實際收支</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-gray-500">
            <tr><th className="py-1 font-medium">Date</th><th className="font-medium">What</th><th className="text-right font-medium">Amount</th>{editable && <th />}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.records.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-2 text-gray-600">{day(r.date)}</td>
                <td className="pr-2 text-gray-900">
                  {r.description}
                  <span className="block text-xs text-gray-500">
                    {r.type === "INCOME" ? "Income" : "Cost"} · {r.category} · {r.enteredBy}
                    {r.receiptUrl && <> · <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="underline">receipt</a></>}
                  </span>
                </td>
                <td className="text-right tabular-nums text-gray-900">{r.type === "INCOME" ? "+" : "−"}{cad(r.amount)}</td>
                {editable && (
                  <td className="pl-2 text-right">
                    <button className="text-xs text-red-700 underline" onClick={() => confirm("Remove this entry?") && act(() => call(`${base}/records/${r.id}`, "DELETE"))}>
                      Remove
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
          onClick={() => confirm("Submit the final report? It locks until the Events VP reviews it. 送出後將鎖定。") && act(() => call(`${base}/submit`, "POST"))}
        >
          Submit final report 送出結案報告
        </button>
      )}

      {data.rights.review && data.report.status === "SUBMITTED" && <ReviewPanel onDecide={(decision, note) => act(() => call(`${base}/review`, "POST", { decision, note }))} />}
    </div>
  );
}

function BudgetLineForm({ categories, onAdd }: { categories: string[]; onAdd: (v: Record<string, string>) => Promise<void> }) {
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
      <input className={`${input} col-span-2`} required placeholder="Item 項目" value={v.item} onChange={(e) => setV({ ...v, item: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder="Qty" value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder="Unit $" value={v.unitCost} onChange={(e) => setV({ ...v, unitCost: e.target.value })} />
      <input className={input} inputMode="decimal" placeholder="or total $" value={v.plannedAmount} onChange={(e) => setV({ ...v, plannedAmount: e.target.value })} />
      <button type="submit" className="col-span-2 rounded-lg border px-3 py-2 text-sm font-semibold sm:col-span-6" style={{ borderColor: PRIMARY, color: PRIMARY }}>
        Add budget line 新增預算
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
        <option value="EXPENSE">Cost 支出</option>
        <option value="INCOME">Income 收入</option>
      </select>
      <select className={input} value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
        {categories.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input className={`${input} col-span-2`} required placeholder="What for 用途" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      <input className={input} required inputMode="decimal" placeholder="Amount $" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
      <input className={input} required type="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
      <input className={`${input} col-span-2 sm:col-span-5`} type="url" placeholder="Receipt link (optional) 收據連結" value={v.receiptUrl} onChange={(e) => setV({ ...v, receiptUrl: e.target.value })} />
      <button type="submit" className="col-span-2 rounded-lg border px-3 py-2 text-sm font-semibold sm:col-span-1" style={{ borderColor: PRIMARY, color: PRIMARY }}>
        Add 新增
      </button>
    </form>
  );
}

function ReviewPanel({ onDecide }: { onDecide: (decision: "APPROVED" | "RETURNED", note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" style={{ border: `2px solid ${PRIMARY}` }}>
      <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Review this report 審核報告</h2>
      <p className="mt-1 text-sm text-gray-600">Approve to make it final, or return it with a note saying what to fix.</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (required when returning) 備註（退回時必填）"
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        rows={2}
      />
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style={{ backgroundColor: PRIMARY }} onClick={() => onDecide("APPROVED", note)}>
          Approve 核准
        </button>
        <button className="flex-1 rounded-lg border py-2 text-sm font-semibold" style={{ borderColor: PRIMARY, color: PRIMARY }} onClick={() => onDecide("RETURNED", note)}>
          Return 退回
        </button>
      </div>
    </section>
  );
}
