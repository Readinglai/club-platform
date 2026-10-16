import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import WebsiteFrame from "../../WebsiteFrame";
import SponsorEditForm from "./SponsorEditForm";

export default async function SponsorPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("content.manage");
  const t = await getTranslations("admin.sponsors");
  const sponsor = await db.sponsor.findUnique({
    where: { id: (await params).id },
    include: { histories: { orderBy: { year: "desc" } } },
  });
  if (!sponsor) notFound();

  return (
    <WebsiteFrame title={sponsor.name} subtitle={t("detailSubtitle")}>
      <SponsorEditForm
        sponsor={{
          id: sponsor.id,
          name: sponsor.name,
          logoUrl: sponsor.logoUrl,
          website: sponsor.website,
          description: sponsor.description,
          histories: sponsor.histories.map((h) => ({ id: h.id, year: h.year, tier: h.tier })),
        }}
      />
    </WebsiteFrame>
  );
}
