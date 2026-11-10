import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getAchievementById, getAllAchievements } from "@/lib/data/achievements";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface AchievementDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AchievementDetailPage({ params }: AchievementDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("achievements");

  // Normalize to a common shape: try DB first, then mock
  let achievement: { id: string; title: string; year: number; description: string; image: string } | null = null;
  let allForNav: { id: string; title: string; year: number }[] = [];

  try {
    const row = await db.achievement.findUnique({ where: { id } });
    if (row) {
      achievement = {
        id: row.id,
        title: row.title,
        year: row.year,
        description: row.description,
        image: row.imageUrl ?? `https://placehold.co/800x450/1a2744/c9b99a?text=${row.year}`,
      };
      const allRows = await db.achievement.findMany({
        orderBy: [{ year: "desc" }, { createdAt: "desc" }],
        select: { id: true, title: true, year: true },
      });
      allForNav = allRows;
    }
  } catch {
    // DB unavailable — fall through to mock
  }

  if (!achievement) {
    const mock = getAchievementById(id);
    if (!mock) notFound();
    achievement = { ...mock, image: mock.image };
    allForNav = getAllAchievements().map((a) => ({ id: a.id, title: a.title, year: a.year }));
  }

  const currentIdx = allForNav.findIndex((a) => a.id === id);
  const prevAchievement = currentIdx > 0 ? allForNav[currentIdx - 1] : null;
  const nextAchievement = currentIdx < allForNav.length - 1 ? allForNav[currentIdx + 1] : null;

  const descParagraphs = achievement.description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-14 sm:py-18" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-4xl mx-auto">
          <nav className="flex items-center gap-2 text-sm mb-6" aria-label="麵包屑">
            <Link href={`/${locale}/achievements`} className="transition-opacity hover:opacity-70" style={{ color: `${SECONDARY}99` }}>
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span style={{ color: `${SECONDARY}77` }} className="truncate max-w-xs">{achievement.title}</span>
          </nav>
          <div className="flex flex-col gap-3">
            <span
              className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${SECONDARY}33`, color: SECONDARY }}
            >
              {achievement.year}
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight" style={{ color: SECONDARY }}>
              {achievement.title}
            </h1>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="w-full rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={achievement.image} alt={achievement.title} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
        </div>

        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
          <h2 className="text-base font-semibold mb-5" style={{ color: PRIMARY }}>{t("descriptionTitle")}</h2>
          <div className="flex flex-col gap-4">
            {descParagraphs.map((para, idx) => {
              if (para.startsWith("-")) {
                const items = para.split("\n").map((l) => l.replace(/^-\s*/, "").trim()).filter(Boolean);
                return (
                  <ul key={idx} className="list-none flex flex-col gap-1.5 pl-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span style={{ color: SECONDARY }} className="mt-1 flex-shrink-0">▸</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return <p key={idx} className="text-sm text-gray-600 leading-relaxed">{para}</p>;
            })}
          </div>
        </div>

        {(prevAchievement || nextAchievement) && (
          <div className="grid grid-cols-2 gap-4">
            {prevAchievement ? (
              <Link
                href={`/${locale}/achievements/${prevAchievement.id}`}
                className="group flex flex-col gap-1 p-4 rounded-xl border bg-white transition-all hover:shadow-sm hover:border-gray-300"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("prevAchievement")}
                </span>
                <span className="text-sm font-medium line-clamp-2 group-hover:opacity-80" style={{ color: PRIMARY }}>{prevAchievement.title}</span>
                <span className="text-xs" style={{ color: SECONDARY }}>{prevAchievement.year}</span>
              </Link>
            ) : <div />}

            {nextAchievement ? (
              <Link
                href={`/${locale}/achievements/${nextAchievement.id}`}
                className="group flex flex-col gap-1 p-4 rounded-xl border bg-white text-right transition-all hover:shadow-sm hover:border-gray-300"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                  {t("nextAchievement")}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="text-sm font-medium line-clamp-2 group-hover:opacity-80" style={{ color: PRIMARY }}>{nextAchievement.title}</span>
                <span className="text-xs" style={{ color: SECONDARY }}>{nextAchievement.year}</span>
              </Link>
            ) : <div />}
          </div>
        )}

        <div>
          <Link
            href={`/${locale}/achievements`}
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
