import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { can, getAccess } from "@/lib/access/can";
import { eventFinanceAccess, getClubFinanceSummary } from "@/lib/finance/reports";
import { BarList, cad, StatTile, StatusBadge } from "./charts";

const PRIMARY = "#1a2744";

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
        <p className="mx-auto max-w-3xl text-sm text-gray-600">You don&apos;t have access to finances. 你沒有財務權限。</p>
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
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>Finance 財務</h1>

        {summary && (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatTile label="Confirmed balance 確認餘額" value={cad(summary.balance.confirmed)} hint="Club-wide entries + approved events" />
              <StatTile
                label="Including events under way 含未結案活動"
                value={cad(summary.balance.includingPending)}
                hint={`${summary.balance.pending >= 0 ? "+" : ""}${cad(summary.balance.pending)} not yet approved`}
              />
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                  Spending by category 各類支出{selected ? ` · ${selected.schoolYear}` : ""}
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
              <BarList rows={categoryRows} label="Spending by category" />
            </section>
          </>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>Event reports 活動財務報告</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {myEvents.map((e) => {
              const result = summary?.events.find((s) => s.id === e.id);
              return (
                <li key={e.id}>
                  <Link href={`/portal/finance/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{e.title}</span>
                      <span className="text-xs text-gray-500">
                        {e.startAt.toLocaleDateString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium" })}
                        {result && ` · income ${cad(result.income)} · spent ${cad(result.spent)} · net ${cad(result.income - result.spent)}`}
                      </span>
                    </span>
                    <StatusBadge status={e.settings?.financeStatus ?? "OPEN"} />
                  </Link>
                </li>
              );
            })}
            {myEvents.length === 0 && <li className="py-3 text-sm text-gray-500">No event reports yet.</li>}
          </ul>
        </section>
      </div>
    </main>
  );
}
