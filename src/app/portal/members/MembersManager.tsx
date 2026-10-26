"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { inputClass, PRIMARY, send } from "../events/EventFields";

type Row = {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  source: "STRIPE" | "IMPORTED" | "MANUAL" | "COMPLIMENTARY";
  hasAccount: boolean;
};
type List = { schoolYear: string; counts: Partial<Record<Row["status"], number>>; rows: Row[] };
type Filters = { q: string; status: string; source: string; year: number };
type Panel = "none" | "add" | "import" | "staff";

const STATUSES = ["ALL", "ACTIVE", "PENDING", "EXPIRED", "CANCELLED"] as const;
const SOURCES = ["ALL", "STRIPE", "IMPORTED", "MANUAL", "COMPLIMENTARY"] as const;

function query(f: Filters) {
  const p = new URLSearchParams({ year: String(f.year) });
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.status !== "ALL") p.set("status", f.status);
  if (f.source !== "ALL") p.set("source", f.source);
  return p.toString();
}

export default function MembersManager({ canManage, currentYear }: { canManage: boolean; currentYear: number }) {
  const t = useTranslations("portal.membersPage");
  const [filters, setFilters] = useState<Filters>({ q: "", status: "ALL", source: "ALL", year: currentYear });
  const [list, setList] = useState<List | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    // Wait for typing to pause before searching.
    const timer = setTimeout(() => {
      send(`/api/club/members?${query(filters)}`, "GET")
        .then((d) => active && (setList(d), setError("")))
        .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters, reload, t]);

  const done = () => setReload((n) => n + 1);
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <div className="mt-6 flex flex-col gap-5">
      {list && (
        <p className="text-sm text-gray-700">
          {t("summary", { year: list.schoolYear, active: list.counts.ACTIVE ?? 0, pending: list.counts.PENDING ?? 0 })}
        </p>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {(["add", "import", "staff"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(panel === p ? "none" : p)}
              className="rounded-lg border px-4 py-2 text-sm font-medium"
              style={panel === p ? { backgroundColor: PRIMARY, color: "white", borderColor: PRIMARY } : { borderColor: "#d1d5db", color: PRIMARY }}
            >
              {t(`panel_${p}`)}
            </button>
          ))}
        </div>
      )}
      {panel === "add" && <AddMember onDone={done} />}
      {panel === "import" && <ImportMembers onDone={done} />}
      {panel === "staff" && <StaffComplimentary onDone={done} />}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          type="search"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          placeholder={t("searchPlaceholder")}
          aria-label={t("search")}
          className={inputClass}
        />
        <select aria-label={t("status")} className={inputClass} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
        </select>
        <select aria-label={t("source")} className={inputClass} value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
          {SOURCES.map((s) => <option key={s} value={s}>{t(`source_${s}`)}</option>)}
        </select>
        <select aria-label={t("year")} className={inputClass} value={filters.year} onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}>
          {years.map((y) => <option key={y} value={y}>{`${y}–${String(y + 1).slice(2)}`}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!list ? (
        !error && <p className="text-sm text-gray-600">{t("loading")}</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{t("shown", { count: list.rows.length })}</span>
            <a href={`/api/club/members?${query(filters)}&format=csv`} className="font-medium underline" style={{ color: PRIMARY }}>
              {t("exportCsv")}
            </a>
          </div>
          <ul className="flex flex-col gap-2">
            {list.rows.length === 0 && <li className="text-sm text-gray-500">{t("none")}</li>}
            {list.rows.map((r) => (
              <li key={r.id}>
                <Link href={`/portal/members/${r.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-gray-900">{r.name || r.email || "—"}</span>
                    <span className="block truncate text-xs text-gray-500">
                      <span className="font-mono">{r.memberCode}</span> · {r.email || t("noEmail")}
                      {!r.hasAccount && ` · ${t("noAccount")}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    <span style={{ color: r.status === "ACTIVE" ? "#087208" : "#52514e" }}>{t(`status_${r.status}`)}</span>
                    <span className="text-gray-500">{t(`source_${r.source}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Box({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold" style={{ color: PRIMARY }}>{title}</h2>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const primaryButton = "rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

function AddMember({ onDone }: { onDone: () => void }) {
  const t = useTranslations("portal.membersPage");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const { memberCode } = await send("/api/club/members", "POST", { name, email });
      setMessage({ ok: true, text: t("added", { code: memberCode }) });
      setName("");
      setEmail("");
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : t("saveError") });
    }
    setBusy(false);
  }

  return (
    <Box title={t("addTitle")} hint={t("addHint")}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} aria-label={t("name")} className={inputClass} />
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("email")} aria-label={t("email")} className={inputClass} />
        <button type="submit" disabled={busy} className={primaryButton} style={{ backgroundColor: PRIMARY }}>{t("add")}</button>
      </form>
      {message && <p role="status" className={`mt-3 text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>{message.text}</p>}
    </Box>
  );
}

type ImportRow = { line: number; name: string; email: string; result: string };

function importResult(result: string, t: ReturnType<typeof useTranslations>) {
  const [kind, code] = result.split(":");
  if (kind === "ready" || kind === "invalid" || kind === "duplicate") return t(kind);
  if (kind === "already") return t("already", { code });
  if (kind === "added") return t("added", { code });
  return result;
}

function ImportMembers({ onDone }: { onDone: () => void }) {
  const t = useTranslations("portal.membersPage");
  const [csv, setCsv] = useState("");
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run(apply: boolean) {
    setBusy(true);
    setError("");
    try {
      const { results } = await send("/api/club/members/import", "POST", { csv, apply });
      setRows(results);
      setApplied(apply);
      if (apply) onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    }
    setBusy(false);
  }

  const ready = rows?.filter((r) => r.result === "ready").length ?? 0;

  return (
    <Box title={t("importTitle")} hint={t("importHint")}>
      <textarea
        value={csv}
        onChange={(e) => (setCsv(e.target.value), setRows(null))}
        rows={6}
        placeholder={"name,email\nJane Chen,jane.chen@mail.utoronto.ca"}
        aria-label={t("importTitle")}
        className={`${inputClass} font-mono`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy || !csv.trim()} onClick={() => run(false)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50" style={{ borderColor: "#d1d5db" }}>
          {t("check")}
        </button>
        {rows && !applied && ready > 0 && (
          <button disabled={busy} onClick={() => run(true)} className={primaryButton} style={{ backgroundColor: PRIMARY }}>
            {t("importN", { count: ready })}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {rows && (
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {rows.map((r) => (
            <li key={r.line} className="flex justify-between gap-3 border-b border-gray-100 py-1">
              <span className="min-w-0 truncate">{r.name || "—"} · {r.email || "—"}</span>
              <span className={`shrink-0 ${r.result === "invalid" || r.result === "duplicate" ? "text-red-700" : "text-gray-600"}`}>
                {importResult(r.result, t)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}

type Person = { name: string; email: string; code: string | null };

function StaffComplimentary({ onDone }: { onDone: () => void }) {
  const t = useTranslations("portal.membersPage");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [granted, setGranted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    send("/api/club/members/complimentary", "POST", { apply: false })
      .then((d) => active && setPeople(d.people))
      .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    return () => {
      active = false;
    };
  }, [t]);

  async function grant() {
    setBusy(true);
    setError("");
    try {
      const d = await send("/api/club/members/complimentary", "POST", { apply: true });
      setPeople(d.people);
      setGranted(true);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    }
    setBusy(false);
  }

  return (
    <Box title={t("staffTitle")} hint={t("staffHint")}>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!people ? (
        !error && <p className="text-sm text-gray-600">{t("loading")}</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-gray-600">{granted ? t("staffDone") : t("staffNone")}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1 text-sm">
            {people.map((p) => (
              <li key={p.email} className="flex justify-between gap-3 border-b border-gray-100 py-1">
                <span className="min-w-0 truncate">{p.name || "—"} · {p.email}</span>
                {p.code && <span className="shrink-0 font-mono text-gray-600">{p.code}</span>}
              </li>
            ))}
          </ul>
          {!granted && (
            <button disabled={busy} onClick={grant} className={`mt-4 ${primaryButton}`} style={{ backgroundColor: PRIMARY }}>
              {t("grantN", { count: people.length })}
            </button>
          )}
        </>
      )}
    </Box>
  );
}
