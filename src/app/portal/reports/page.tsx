import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { termFor } from "@/lib/membership/term";
import { eventAttendance, membershipsByMonth, SOURCES } from "@/lib/reports/summary";

const PRIMARY = "#1a2744";
const BAR = "#1a2744";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requirePagePermission("reports.view");
  const currentYear = termFor().startYear;
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked > 2000 && asked <= currentYear ? asked : currentYear;

  const [t, locale, events, members] = await Promise.all([
    getTranslations("portal.reportsPage"),
    getLocale(),
    eventAttendance(),
    membershipsByMonth(year),
  ]);
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";
  const monthLabel = (month: string) =>
    new Date(`${month}-15T12:00:00Z`).toLocaleDateString(dateLocale, { timeZone: "UTC", year: "numeric", month: "short" });
  const busiest = Math.max(1, ...members.months.map((m) => m.total));
  const years = Array.from({ length: 4 }, (_, i) => currentYear - i);

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("intro")}</p>
        </div>

        <section aria-labelledby="events-title" className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="events-title" className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("eventsTitle")}</h2>
            {/* A file download, not a page, so a plain link rather than <Link>. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/api/club/reports?type=events&format=csv" className="text-sm font-medium underline" style={{ color: PRIMARY }}>
              {t("downloadCsv")}
            </a>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-gray-500">{t("eventsEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-3 font-semibold">{t("event")}</th>
                    <th className="py-2 pr-3 font-semibold">{t("date")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("sold")}</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t("checkedIn")}</th>
                    <th className="py-2 text-right font-semibold">{t("rate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.eventId} className="border-b border-gray-100 last:border-0">
                      <td className="py-2.5 pr-3 font-medium">{e.title}</td>
                      <td className="py-2.5 pr-3 text-gray-600">
                        {new Date(e.startAt).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" })}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{e.sold}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{e.checkedIn}</td>
                      <td className="py-2.5 text-right tabular-nums">{e.rate == null ? "—" : `${e.rate}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="members-title" className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="members-title" className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("membersTitle")}</h2>
            <a href={`/api/club/reports?type=memberships&year=${year}&format=csv`} className="text-sm font-medium underline" style={{ color: PRIMARY }}>
              {t("downloadCsv")}
            </a>
          </div>
          <nav aria-label={t("schoolYear")} className="mb-4 flex flex-wrap gap-1.5">
            {years.map((y) => (
              <Link
                key={y}
                href={y === currentYear ? "/portal/reports" : `/portal/reports?year=${y}`}
                aria-current={y === year ? "page" : undefined}
                className="rounded-full border px-3 py-1 text-xs"
                style={y === year ? { backgroundColor: PRIMARY, color: "#fff", borderColor: PRIMARY } : { borderColor: "#d1d5db", color: PRIMARY }}
              >
                {`${y}–${String(y + 1).slice(2)}`}
              </Link>
            ))}
          </nav>

          <dl className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-gray-200 p-3">
              <dt className="text-xs text-gray-500">{t("total")}</dt>
              <dd className="text-xl font-semibold tabular-nums">{members.total}</dd>
            </div>
            {SOURCES.map((s) => (
              <div key={s} className="rounded-xl border border-gray-200 p-3">
                <dt className="text-xs text-gray-500">{t(`source_${s}`)}</dt>
                <dd className="text-xl font-semibold tabular-nums">{members.totals[s]}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mb-2 text-sm font-medium text-gray-700">{t("byMonth")}</h3>
          <ul className="flex flex-col gap-1.5">
            {members.months.map((m) => (
              <li key={m.month} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                <span className="text-gray-600">{monthLabel(m.month)}</span>
                <span className="h-3 rounded-r" aria-hidden="true">
                  {m.total > 0 && (
                    <span
                      className="block h-3 rounded-r"
                      style={{ width: `${Math.max(2, (m.total / busiest) * 100)}%`, backgroundColor: BAR }}
                      title={SOURCES.filter((s) => m[s] > 0).map((s) => `${t(`source_${s}`)}: ${m[s]}`).join(" · ")}
                    />
                  )}
                </span>
                <span className="text-right tabular-nums">{m.total}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">{t("byMonthNote")}</p>
        </section>
      </div>
    </main>
  );
}
