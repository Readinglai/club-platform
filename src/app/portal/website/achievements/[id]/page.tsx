import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import WebsiteFrame from "../../WebsiteFrame";
import AchievementEditForm from "./AchievementEditForm";

export default async function AchievementPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("showcase.manage");
  const t = await getTranslations("admin.achievements");
  const { id } = await params;
  const achievement = await db.achievement.findUnique({ where: { id } });
  if (!achievement) notFound();

  return (
    <WebsiteFrame title={t("editTitle")} subtitle={`${achievement.title} · ${achievement.year}`}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8" style={{ borderColor: "#e5e7eb" }}>
        <AchievementEditForm
          id={id}
          initial={{
            title: achievement.title,
            year: achievement.year,
            description: achievement.description,
            imageUrl: achievement.imageUrl,
          }}
        />
      </div>
    </WebsiteFrame>
  );
}
