import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SponsorsTable from "./SponsorsTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminSponsorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;

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
            贊助商管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">共 {sponsors.length} 家贊助商</p>
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
