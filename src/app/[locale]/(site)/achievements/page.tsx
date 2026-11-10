import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAllAchievements } from "@/lib/data/achievements";
import AchievementsGrid from "@/components/AchievementsGrid";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface AchievementItem {
  id: string;
  title: string;
  year: number;
  description: string;
  imageUrl: string | null;
}

interface AchievementsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AchievementsPage({ params }: AchievementsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("achievements");

  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  let achievements: { id: string; title: string; year: number; description: string; image: string }[];
  try {
    const res = await fetch(`${baseUrl}/api/achievements`, { cache: "no-store" });
    if (res.ok) {
      const rows = (await res.json()) as AchievementItem[];
      if (rows.length > 0) {
        achievements = rows.map((r) => ({
          id: r.id,
          title: r.title,
          year: r.year,
          description: r.description,
          image: r.imageUrl ?? `https://placehold.co/800x450/1a2744/c9b99a?text=${r.year}`,
        }));
      } else {
        achievements = getAllAchievements();
      }
    } else {
      achievements = getAllAchievements();
    }
  } catch {
    achievements = getAllAchievements();
  }

  const years = [...new Set(achievements.map((a) => a.year))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-16 sm:py-20 text-center" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wide" style={{ color: SECONDARY }}>
            {t("title")}
          </h1>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${SECONDARY}88` }} />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>{t("subtitle")}</p>
          <div className="flex items-center gap-8 mt-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold" style={{ color: SECONDARY }}>{achievements.length}</span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>{t("totalAchievements")}</span>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: `${SECONDARY}44` }} />
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                {years.length > 0 ? `${years[years.length - 1]}–${years[0]}` : "—"}
              </span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>{t("yearSpan")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <AchievementsGrid achievements={achievements} years={years} locale={locale} />
      </section>
    </div>
  );
}
