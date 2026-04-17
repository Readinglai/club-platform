import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import SponsorsGrid from "./SponsorsGrid";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

async function querySponsors() {
  try {
    const yearRows = await db.$queryRaw<{ year: number }[]>`
      SELECT DISTINCT year FROM "SponsorHistory" ORDER BY year DESC
    `;
    const years = yearRows.map((r) => Number(r.year));

    const sponsorRows = await db.$queryRaw<
      Array<{ id: string; name: string; logoUrl: string | null; website: string | null }>
    >`SELECT id, name, "logoUrl", website FROM "Sponsor" ORDER BY name ASC`;

    const historyRows = await db.$queryRaw<
      Array<{ sponsorId: string; year: number; tier: string }>
    >`SELECT "sponsorId", year, tier FROM "SponsorHistory" ORDER BY year DESC`;

    const sponsors = sponsorRows.map((s) => ({
      ...s,
      histories: historyRows
        .filter((h) => h.sponsorId === s.id)
        .map((h) => ({ year: Number(h.year), tier: h.tier })),
    }));

    return { years, sponsors };
  } catch {
    return { years: [] as number[], sponsors: [] as Array<{ id: string; name: string; logoUrl: string | null; website: string | null; histories: Array<{ year: number; tier: string }> }> };
  }
}

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sponsors");

  const { years, sponsors } = await querySponsors();

  const currentYear = new Date().getFullYear();
  const defaultYear = years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);

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
