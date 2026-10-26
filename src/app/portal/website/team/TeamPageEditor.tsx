"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { getPublicTeam, TeamPerson } from "@/lib/team/public";

const PRIMARY = "#1a2744";
type Departments = Awaited<ReturnType<typeof getPublicTeam>>;
type Row = Pick<TeamPerson, "id" | "name" | "position" | "group"> & { hidden: boolean; title: string; bio: string };

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

/** Who shows on the public Members page, in what order, with what title and bio. */
export default function TeamPageEditor({ initial }: { initial: Departments }) {
  const t = useTranslations("portal.teamPageEditor");
  const tm = useTranslations("members");
  const locale = useLocale();
  const [departments, setDepartments] = useState(() =>
    initial.map((d) => ({
      slug: d.slug,
      people: d.people.map((p): Row => ({ id: p.id, name: p.name, position: p.position, group: p.group, hidden: p.hidden, title: p.title ?? "", bio: p.bio ?? "" })),
    }))
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Show/hide, title and bio belong to the person, so they change in every department they appear in.
  const update = (id: string, patch: Partial<Row>) =>
    setDepartments((all) => all.map((d) => ({ ...d, people: d.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) })));
  const move = (slug: string, index: number, by: -1 | 1) =>
    setDepartments((all) =>
      all.map((d) => {
        if (d.slug !== slug) return d;
        const people = [...d.people];
        const to = index + by;
        if (to < 0 || to >= people.length) return d;
        [people[index], people[to]] = [people[to], people[index]];
        return { ...d, people };
      })
    );

  async function save() {
    setBusy(true);
    setMessage(null);
    // The order on screen becomes the saved order within each department.
    const people: Record<string, { hidden: boolean; title: string; bio: string; orders: Record<string, number> }> = {};
    for (const d of departments) {
      d.people.forEach((p, i) => {
        const entry = (people[p.id] ??= { hidden: p.hidden, title: p.title, bio: p.bio, orders: {} });
        entry.orders[d.slug] = i;
      });
    }
    try {
      const res = await fetch("/api/club/team-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ people }) });
      const body = await res.json().catch(() => ({}));
      setMessage(res.ok ? { ok: true, text: t("saved") } : { ok: false, text: body.error ?? t("saveError") });
    } catch {
      setMessage({ ok: false, text: t("saveError") });
    }
    setBusy(false);
  }

  if (departments.length === 0) return <p className="text-sm text-gray-600">{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-6">
      {departments.map((d) => (
        <section key={d.slug} className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby={`team-${d.slug}`}>
          <h2 id={`team-${d.slug}`} className="text-lg font-semibold" style={{ color: PRIMARY }}>{tm(`dept_${d.slug}`)}</h2>
          <ul className="mt-3 flex flex-col divide-y divide-gray-100">
            {d.people.map((p, i) => (
              <li key={p.id} className={`flex flex-col gap-3 py-4 ${p.hidden ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      {tm(`position_${p.position}`)}
                      {p.group ? ` · ${p.group}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!p.hidden} onChange={(e) => update(p.id, { hidden: !e.target.checked })} className="h-4 w-4" />
                      {t("show")}
                    </label>
                    <button type="button" onClick={() => move(d.slug, i, -1)} disabled={i === 0} aria-label={t("moveUp", { name: p.name })} className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(d.slug, i, 1)} disabled={i === d.people.length - 1} aria-label={t("moveDown", { name: p.name })} className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-30">↓</button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                    {t("publicTitle")}
                    <input value={p.title} maxLength={60} onChange={(e) => update(p.id, { title: e.target.value })} placeholder={tm(`position_${p.position}`)} className={inputClass} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                    {t("publicBio")}
                    <textarea value={p.bio} maxLength={600} rows={2} onChange={(e) => update(p.id, { bio: e.target.value })} placeholder={t("bioPlaceholder")} className={`${inputClass} resize-y`} />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={busy} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: PRIMARY }}>
          {busy ? t("saving") : t("save")}
        </button>
        <a href={`/${locale}/members`} target="_blank" rel="noopener noreferrer" className="text-sm underline" style={{ color: PRIMARY }}>
          {t("viewPage")}
        </a>
        {message && <p role="status" className={`text-sm ${message.ok ? "text-green-800" : "text-red-700"}`}>{message.text}</p>}
      </div>
      <p className="text-xs text-gray-500">{t("whoAppears")}</p>
    </div>
  );
}
