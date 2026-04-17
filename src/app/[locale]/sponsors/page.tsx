import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import SponsorsGrid from "./SponsorsGrid";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("sponsors");

  let years: number[] = [];
  let sponsors: Array<{ id: string; name: string; logoUrl: string | null; website: string | null; histories: Array<{ year: number; tier: string }> }> = [];
  let defaultYear = new Date().getFullYear();
  let errorMsg: string | null = null;

  try {
    const yearRows = await db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT year FROM "SponsorHistory" ORDER BY year DESC
    `;
    years = yearRows.map((r) => Number(r.year));
    defaultYear = years.includes(new Date().getFullYear()) ? new Date().getFullYear() : (years[0] ?? new Date().getFullYear());

    const sponsorRows = await db.$queryRaw<
      Array<{ id: string; name: string; logoUrl: string | null; website: string | null }>
    >`SELECT id, name, "logoUrl", website FROM "Sponsor" ORDER BY name ASC`;

    const historyRows = await db.$queryRaw<
      Array<{ sponsorId: string; year: number; tier: string }>
    >`SELECT "sponsorId", year, tier FROM "SponsorHistory" ORDER BY year DESC`;

    sponsors = sponsorRows.map((s) => ({
      ...s,
      histories: historyRows
        .filter((h) => h.sponsorId === s.id)
        .map((h) => ({ year: Number(h.year), tier: h.tier })),
    }));
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : String(e);
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-xl w-full">
          <h1 className="text-red-700 font-bold mb-2">DB Error (debug)</h1>
          <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">{errorMsg}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
      <section className="px-4 py-16 sm:py-20 text-center" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wide" style={{ color: SECONDARY }}>
            {t("title")}
          </h1>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${SECONDARY}88` }} />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>
            {t("subtitle")}
          </p>
          <div className="flex items-center gap-8 mt-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                {sponsors.length}
              </span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                {t("title")}
              </span>
            </div>
            {years.length > 0 && (
              <>
                <div className="w-px h-10" style={{ backgroundColor: `${SECONDARY}44` }} />
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                    {years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0]}
                  </span>
                  <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                    {t("filterByYear")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <SponsorsGrid
          sponsors={sponsors}
          years={years}
          locale={locale}
          defaultYear={defaultYear}
        />
      </section>
    </div>
  );
}
