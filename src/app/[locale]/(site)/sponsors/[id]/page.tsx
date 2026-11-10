import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  platinum: { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
  gold:     { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  silver:   { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  bronze:   { bg: "#ffedd5", color: "#9a3412", border: "#fed7aa" },
};

export default async function SponsorPublicDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sponsors");

  let sponsorRows: Array<{ id: string; name: string; logoUrl: string | null; website: string | null; description: string | null }> = [];
  let histories: Array<{ id: string; year: number; tier: string }> = [];
  try {
    sponsorRows = await db.$queryRaw<
      Array<{ id: string; name: string; logoUrl: string | null; website: string | null; description: string | null }>
    >`SELECT id, name, "logoUrl", website, description FROM "Sponsor" WHERE id = ${id} LIMIT 1`;

    if (sponsorRows.length > 0) {
      histories = await db.$queryRaw<
        Array<{ id: string; year: number; tier: string }>
      >`SELECT id, year::int, tier FROM "SponsorHistory" WHERE "sponsorId" = ${id} ORDER BY year DESC`;
    }
  } catch {
    // DB unavailable — fall through to notFound
  }

  if (sponsorRows.length === 0) notFound();
  const sponsor = sponsorRows[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
      <section className="px-4 py-14 sm:py-18" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6" aria-label="breadcrumb">
            <Link
              href={`/${locale}/sponsors`}
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span style={{ color: `${SECONDARY}77` }} className="truncate max-w-xs">
              {sponsor.name}
            </span>
          </nav>

          <div className="flex items-center gap-6">
            {/* Logo */}
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{ width: 80, height: 80, backgroundColor: `${SECONDARY}22` }}
            >
              {sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                  {sponsor.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: SECONDARY }}>
                {sponsor.name}
              </h1>
              {sponsor.website && (
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm transition-opacity hover:opacity-70"
                  style={{ color: `${SECONDARY}bb` }}
                >
                  {sponsor.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Description */}
        {sponsor.description && (
          <div
            className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2 className="text-base font-semibold mb-4" style={{ color: PRIMARY }}>
              {t("descriptionTitle")}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{sponsor.description}</p>
          </div>
        )}

        {/* Visit website CTA */}
        {sponsor.website && (
          <a
            href={sponsor.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {t("visitWebsite")}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        {/* Sponsorship history */}
        {histories.length > 0 && (
          <div
            className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2 className="text-base font-semibold mb-6" style={{ color: PRIMARY }}>
              {t("historyTitle")}
            </h2>

            {/* Timeline */}
            <div className="flex flex-col gap-0">
              {histories.map((h, idx) => {
                const style = TIER_STYLE[h.tier] ?? { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
                const isLast = idx === histories.length - 1;
                return (
                  <div key={h.id} className="flex items-start gap-4">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                      <div
                        className="w-3 h-3 rounded-full border-2 flex-shrink-0 mt-1"
                        style={{ borderColor: style.color, backgroundColor: style.bg }}
                      />
                      {!isLast && (
                        <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#e5e7eb", minHeight: 28 }} />
                      )}
                    </div>

                    {/* Year + tier badge */}
                    <div className="flex items-center gap-3 pb-6">
                      <span className="text-sm font-bold" style={{ color: PRIMARY }}>
                        {Number(h.year)}
                      </span>
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                        style={{ backgroundColor: style.bg, color: style.color, borderColor: style.border }}
                      >
                        {t(h.tier as "platinum" | "gold" | "silver" | "bronze")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back button */}
        <div>
          <Link
            href={`/${locale}/sponsors`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToList")}
          </Link>
        </div>
      </div>
    </div>
  );
}
