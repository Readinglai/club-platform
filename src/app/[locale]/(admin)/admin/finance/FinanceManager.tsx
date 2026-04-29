"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const CATEGORIES = ["活動費用", "行政費用", "宣傳費用", "會員費", "贊助收入", "活動收入", "補助款", "其他"];

interface FinanceRecord {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  currency: string;
  category: string;
  description: string | null;
  date: string;
  createdBy: { id: string; name: string };
}

interface Report {
  totalIncome: number;
  totalExpense: number;
  net: number;
  count: number;
  byCategory: Record<string, { income: number; expense: number }>;
}

interface RecordForm {
  type: "INCOME" | "EXPENSE";
  amount: string;
  currency: string;
  category: string;
  description: string;
  date: string;
}

const EMPTY_FORM: RecordForm = {
  type: "EXPENSE",
  amount: "",
  currency: "CAD",
  category: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
};

const CUR_YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;

function fmt(n: number) {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function FinanceManager() {
  const t = useTranslations("admin.finance");
  const tc = useTranslations("admin.common");
  const [year, setYear] = useState(CUR_YEAR);
  const [month, setMonth] = useState<number | "">(CUR_MONTH);
  const [typeFilter, setTypeFilter] = useState<"" | "INCOME" | "EXPENSE">("");

  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState<FinanceRecord | null>(null);
  const [form, setForm] = useState<RecordForm>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    p.set("year", String(year));
    if (month) p.set("month", String(month));
    if (typeFilter) p.set("type", typeFilter);
    return p.toString();
  }, [year, month, typeFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, repRes] = await Promise.all([
      fetch(`/api/admin/finance/records?${buildQuery()}`),
      fetch(`/api/admin/finance/report?year=${year}${month ? `&month=${month}` : ""}`),
    ]);
    if (rRes.ok) setRecords(await rRes.json());
    if (repRes.ok) setReport(await repRes.json());
    setLoading(false);
  }, [buildQuery, year, month]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setEditRecord(null);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(r: FinanceRecord) {
    setForm({
      type: r.type,
      amount: r.amount,
      currency: r.currency,
      category: r.category,
      description: r.description ?? "",
      date: r.date.slice(0, 10),
    });
    setEditRecord(r);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.amount || Number(form.amount) <= 0) { setFormError(t("amountInvalid")); return; }
    if (!form.category.trim()) { setFormError(t("categoryRequired")); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const url = editRecord
        ? `/api/admin/finance/records/${editRecord.id}`
        : "/api/admin/finance/records";
      const res = await fetch(url, {
        method: editRecord ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? tc("operationFailed")); return; }
      setShowForm(false);
      load();
    } catch { setFormError(tc("networkError")); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    await fetch(`/api/admin/finance/records/${id}`, { method: "DELETE" });
    load();
  }

  function handleExport() {
    const q = new URLSearchParams({ year: String(year) });
    if (month) q.set("month", String(month));
    window.open(`/api/admin/finance/export?${q}`, "_blank");
  }

  const years = Array.from({ length: 6 }, (_, i) => CUR_YEAR - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const summaryCards = [
    { label: t("summaryIncome"), value: report?.totalIncome ?? 0, color: "#16a34a" },
    { label: t("summaryExpense"), value: report?.totalExpense ?? 0, color: "#dc2626" },
    { label: t("summaryNet"), value: report?.net ?? 0, color: (report?.net ?? 0) >= 0 ? "#16a34a" : "#dc2626" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("filterYear")}</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-lg px-2 py-1.5 text-sm"
            style={{ borderColor: "#d1d5db" }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("filterMonth")}</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
            className="border rounded-lg px-2 py-1.5 text-sm"
            style={{ borderColor: "#d1d5db" }}
          >
            <option value="">{t("filterAllMonths")}</option>
            {months.map((m) => <option key={m} value={m}>{t("monthN", { n: m })}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">{t("filterType")}</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "" | "INCOME" | "EXPENSE")}
            className="border rounded-lg px-2 py-1.5 text-sm"
            style={{ borderColor: "#d1d5db" }}
          >
            <option value="">{t("filterAll")}</option>
            <option value="INCOME">{t("typeIncome")}</option>
            <option value="EXPENSE">{t("typeExpense")}</option>
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleExport}
          className="px-3 py-1.5 rounded-lg text-sm border font-medium hover:opacity-80"
          style={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          {t("exportCsv")}
        </button>
        <button
          onClick={openCreate}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {t("createRecord")}
        </button>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          {summaryCards.map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4" style={{ borderColor: "#e5e7eb" }}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-xl font-bold" style={{ color }}>
                ${fmt(value)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Records table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">{t("loading")}</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">{t("emptyState")}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: "#f3f4f6", backgroundColor: "#fafafa" }}>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("tableDate")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("tableType")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("tableCategory")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500">{t("tableAmount")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">{t("tableDescription")}</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-right">{t("tableActions")}</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-4 py-3 text-gray-600">{r.date.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: r.type === "INCOME" ? "#dcfce7" : "#fee2e2",
                        color: r.type === "INCOME" ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {r.type === "INCOME" ? t("typeIncome") : t("typeExpense")}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: PRIMARY }}>{r.category}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: r.type === "INCOME" ? "#16a34a" : "#dc2626" }}>
                    {r.type === "INCOME" ? "+" : "-"}${fmt(Number(r.amount))} {r.currency}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell max-w-xs truncate">{r.description ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs px-2 py-1 rounded border hover:opacity-80"
                        style={{ borderColor: PRIMARY, color: PRIMARY }}
                      >
                        {tc("edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-xs px-2 py-1 rounded border hover:opacity-80"
                        style={{ borderColor: "#ef4444", color: "#ef4444" }}
                      >
                        {tc("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Record form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: PRIMARY }}>
                {editRecord ? t("editRecordTitle") : t("createRecordTitle")}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("fieldType")}</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "INCOME" | "EXPENSE" }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: "#d1d5db" }}
                  >
                    <option value="INCOME">{t("typeIncome")}</option>
                    <option value="EXPENSE">{t("typeExpense")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">{t("fieldCurrency")}</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    style={{ borderColor: "#d1d5db" }}
                  >
                    <option>CAD</option>
                    <option>USD</option>
                    <option>TWD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("fieldAmount")}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: "#d1d5db" }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("fieldCategory")}</label>
                <input
                  list="finance-categories"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: "#d1d5db" }}
                />
                <datalist id="finance-categories">
                  {CATEGORIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("fieldDate")}</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "#d1d5db" }}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">{t("fieldDescription")}</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  autoComplete="off"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: "#d1d5db" }}
                />
              </div>
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: "#d1d5db", color: "#374151" }}
              >
                {tc("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
              >
                {submitting ? tc("processing") : editRecord ? tc("save") : tc("create")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
