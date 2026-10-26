import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { can, getAccess } from "@/lib/access/can";
import { eventFinanceAccess, getClubFinanceSummary } from "@/lib/finance/reports";
import { BarList, cad, StatTile, StatusBadge } from "./charts";

const PRIMARY = "#1a2744";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("portal.financePage");
  const dateLocale = (await getLocale()) === "zh" ? "zh-TW" : "en-CA";

  const canViewClub = can(await getAccess(user.id), "finance.view");

  // Events whose finances this person can work on or review.
  const teamEvents = await db.event.findMany({
    where: { team: { isNot: null } },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true, settings: { select: { financeStatus: true } } },
  });
  const myEvents = [];
  for (const e of teamEvents) if ((await eventFinanceAccess(user.id, e.id)).view) myEvents.push(e);

  if (!canViewClub && myEvents.length === 0) {
    return (
      <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
        <p className="mx-auto max-w-3xl text-sm text-gray-600">{t("noAccess")}</p>
      </main>
    );
  }

  const summary = canViewClub ? await getClubFinanceSummary() : null;
  const { year } = await searchParams;
  const years = summary?.spendingByYear ?? [];
  const selected = years.find((y) => y.schoolYear === year) ?? years[years.length - 1];
  const categoryRows = selected
    ? Object.entries(selected.categories)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>

        {summary && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatTile label={t("confirmed")} value={cad(summary.balance.confirmed)} hint={t("confirmedHint")} />
              <StatTile
                label={t("including")}
                value={cad(summary.balance.includingPending)}
                hint={t("notYetApproved", { amount: `${summary.balance.pending >= 0 ? "+" : ""}${cad(summary.balance.pending)}` })}
              />
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                  {t("spendingByCategory")}{selected ? ` · ${selected.schoolYear}` : ""}
                </h2>
                {years.length > 1 && (
                  <nav className="flex gap-2 text-xs">
                    {years.map((y) => (
                      <Link
                        key={y.schoolYear}
                        href={`/portal/finance?year=${encodeURIComponent(y.schoolYear)}`}
                        className="rounded-full border px-2.5 py-1"
                        style={{ borderColor: y === selected ? PRIMARY : "#d6d4cc", color: PRIMARY }}
                      >
                        {y.schoolYear}
                      </Link>
                    ))}
                  </nav>
                )}
              </div>
              <BarList rows={categoryRows} label={t("spendingByCategory")} />
            </section>
          </>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{t("eventReports")}</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {myEvents.map((e) => {
              const result = summary?.events.find((s) => s.id === e.id);
              return (
                <li key={e.id}>
                  <Link href={`/portal/finance/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{e.title}</span>
                      <span className="text-xs text-gray-500">
                        {e.startAt.toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" })}
                        {result && ` · ${t("result", { income: cad(result.income), spent: cad(result.spent), net: cad(result.income - result.spent) })}`}
                      </span>
                    </span>
                    <StatusBadge status={e.settings?.financeStatus ?? "OPEN"} />
                  </Link>
                </li>
              );
            })}
            {myEvents.length === 0 && <li className="py-3 text-sm text-gray-500">{t("noReports")}</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
