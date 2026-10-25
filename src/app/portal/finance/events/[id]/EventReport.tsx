"use client";

import { useEffect, useState } from "react";
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
  rights: { view: boolean };
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

/** One event's money, read-only: budgets are kept and approved in the event's Google Sheet. */
export default function EventReport({ eventId }: { eventId: string }) {
  const t = useTranslations("portal.eventReport");
  const day = useDay();
  const [data, setData] = useState<Finance | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    call(`/api/finance/events/${eventId}`, "GET")
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    return () => {
      active = false;
    };
  }, [eventId, t]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-gray-600">{t("loading")}</p>;

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

      <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-gray-700" style={{ borderColor: PRIMARY }}>
        {t("sheetNote")}
      </p>

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
              <tr><th className="py-1 font-medium">{t("category")}</th><th className="font-medium">{t("item")}</th><th className="text-right font-medium">{t("plannedCol")}</th></tr>
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
              <tr><th className="py-1 font-medium">{t("date")}</th><th className="font-medium">{t("what")}</th><th className="text-right font-medium">{t("amount")}</th></tr>
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
    </div>
  );
}
