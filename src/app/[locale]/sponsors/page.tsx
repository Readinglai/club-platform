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

  // Distinct years via groupBy (more compatible with pgBouncer than distinct)
  const yearGroups = await db.sponsorHistory.groupBy({
    by: ["year"],
    orderBy: { year: "desc" },
  });
  const years = yearGroups.map((g) => g.year);

  const currentYear = new Date().getFullYear();
  const defaultYear = years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);

  // All sponsors with all their histories (client will filter by year)
  const sponsors = await db.sponsor.findMany({
    orderBy: { name: "asc" },
    include: {
      histories: {
        orderBy: { year: "desc" },
      },
    },
  });

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
          sponsors={sponsors.map((s) => ({
            id: s.id,
            name: s.name,
            logoUrl: s.logoUrl,
            website: s.website,
            histories: s.histories.map((h) => ({ year: h.year, tier: h.tier })),
          }))}
          years={years}
          locale={locale}
          defaultYear={defaultYear}
        />
      </section>
    </div>
  );
}
