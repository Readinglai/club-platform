"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"] as const;
type Tier = (typeof TIER_ORDER)[number];

const TIER_STYLE: Record<Tier, { bg: string; color: string; border: string }> = {
  platinum: { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
  gold:     { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  silver:   { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  bronze:   { bg: "#ffedd5", color: "#9a3412", border: "#fed7aa" },
};

interface HistoryRow {
  year: number;
  tier: string;
}

interface SponsorRow {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  histories: HistoryRow[];
}

interface Props {
  sponsors: SponsorRow[];
  years: number[];
  locale: string;
  defaultYear: number;
}

export default function SponsorsGrid({ sponsors, years, locale, defaultYear }: Props) {
  const t = useTranslations("sponsors");
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  // Filter sponsors that have a history record for the selected year, and get their tier
  const sponsorsForYear = sponsors
    .map((s) => {
      const h = s.histories.find((h) => h.year === selectedYear);
      return h ? { ...s, tier: h.tier } : null;
    })
    .filter((s): s is SponsorRow & { tier: string } => s !== null);

  // Group by tier in display order
  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    sponsors: sponsorsForYear.filter((s) => s.tier === tier),
  })).filter((g) => g.sponsors.length > 0);

  return (
    <div>
      {/* Year filter */}
      {years.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-10">
          <span className="text-sm font-medium mr-1" style={{ color: `${PRIMARY}88` }}>
            {t("filterByYear")}：
          </span>
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all border"
              style={
                selectedYear === y
                  ? { backgroundColor: PRIMARY, color: SECONDARY, borderColor: PRIMARY }
                  : { backgroundColor: "white", color: PRIMARY, borderColor: "#d1d5db" }
              }
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {grouped.length === 0 ? (
        <div
          className="text-center py-20 rounded-2xl"
          style={{ backgroundColor: "white", border: "1px solid #e5e7eb" }}
        >
          <p className="text-gray-400 text-sm">{t("noSponsors")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {grouped.map(({ tier, sponsors: tierSponsors }) => {
            const style = TIER_STYLE[tier as Tier];
            const tierLabel = t(tier as Tier);
            return (
              <section key={tier}>
                {/* Tier header */}
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="px-4 py-1 rounded-full text-sm font-bold border"
                    style={{ backgroundColor: style.bg, color: style.color, borderColor: style.border }}
                  >
                    {tierLabel}
                  </span>
                  <div className="flex-1 h-px" style={{ backgroundColor: "#e5e7eb" }} />
                </div>

                {/* Sponsor cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {tierSponsors.map((s) => (
                    <Link
                      key={s.id}
                      href={`/${locale}/sponsors/${s.id}`}
                      className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border transition-all hover:shadow-md hover:border-gray-300"
                      style={{ borderColor: "#e5e7eb" }}
                    >
                      {/* Logo or placeholder */}
                      <div
                        className="w-full flex items-center justify-center rounded-xl overflow-hidden"
                        style={{ height: "80px", backgroundColor: `${PRIMARY}06` }}
                      >
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.logoUrl}
                            alt={s.name}
                            className="max-h-full max-w-full object-contain px-2"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const parent = target.parentElement;
                              if (parent) {
                                parent.textContent = s.name.charAt(0).toUpperCase();
                                parent.style.fontSize = "2rem";
                                parent.style.fontWeight = "700";
                                parent.style.color = `${PRIMARY}66`;
                              }
                            }}
                          />
                        ) : (
                          <span
                            className="text-3xl font-bold select-none"
                            style={{ color: `${PRIMARY}55` }}
                          >
                            {s.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <p
                        className="text-sm font-semibold text-center leading-snug group-hover:opacity-80 transition-opacity"
                        style={{ color: PRIMARY }}
                      >
                        {s.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
