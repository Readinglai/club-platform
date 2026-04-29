import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AchievementsManager from "./AchievementsManager";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";

export default async function AdminAchievementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const t = await getTranslations("admin.achievements");

  const achievements = await db.achievement.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, year: true, imageUrl: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("count", { count: achievements.length })}</p>
        </div>
      </div>

      <AchievementsManager achievements={achievements} locale={locale} />
    </div>
  );
}
