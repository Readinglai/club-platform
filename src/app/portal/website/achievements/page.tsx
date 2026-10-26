import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import WebsiteFrame from "../WebsiteFrame";
import AchievementsManager from "./AchievementsManager";

export default async function AchievementsPage() {
  await requirePagePermission("showcase.manage");
  const t = await getTranslations("admin.achievements");
  const achievements = await db.achievement.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, year: true, imageUrl: true },
  });

  return (
    <WebsiteFrame title={t("title")} subtitle={t("count", { count: achievements.length })}>
      <AchievementsManager achievements={achievements} />
    </WebsiteFrame>
  );
}
