import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import WebsiteFrame from "../WebsiteFrame";
import SponsorsTable from "./SponsorsTable";

export default async function SponsorsPage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("admin.sponsors");
  const sponsors = await db.sponsor.findMany({
    orderBy: { name: "asc" },
    include: { histories: { orderBy: { year: "desc" }, take: 1 } },
  });

  return (
    <WebsiteFrame title={t("title")} subtitle={t("count", { count: sponsors.length })} wide>
      <SponsorsTable
        sponsors={sponsors.map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logoUrl,
          website: s.website,
          latestTier: s.histories[0]?.tier ?? null,
          latestYear: s.histories[0]?.year ?? null,
        }))}
      />
    </WebsiteFrame>
  );
}
