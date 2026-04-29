import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import SponsorsTable from "./SponsorsTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";

export default async function AdminSponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const t = await getTranslations("admin.sponsors");

  const sponsors = await db.sponsor.findMany({
    orderBy: { name: "asc" },
    include: {
      histories: { orderBy: { year: "desc" }, take: 1 },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("count", { count: sponsors.length })}</p>
        </div>
      </div>

      <SponsorsTable
        sponsors={sponsors.map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logoUrl,
          website: s.website,
          latestTier: s.histories[0]?.tier ?? null,
          latestYear: s.histories[0]?.year ?? null,
        }))}
        locale={locale}
      />
    </div>
  );
}
