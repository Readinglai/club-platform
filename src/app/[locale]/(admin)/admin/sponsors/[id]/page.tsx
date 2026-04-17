import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import SponsorEditForm from "./SponsorEditForm";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;

  const sponsor = await db.sponsor.findUnique({
    where: { id },
    include: { histories: { orderBy: { year: "desc" } } },
  });

  if (!sponsor) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link
          href={`/${locale}/admin/sponsors`}
          className="text-sm px-3 py-1.5 rounded-lg transition-all hover:opacity-70"
          style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
        >
          ← 返回列表
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {sponsor.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">贊助商詳情 / 編輯</p>
        </div>
      </div>

      <SponsorEditForm
        sponsor={{
          id: sponsor.id,
          name: sponsor.name,
          logoUrl: sponsor.logoUrl,
          website: sponsor.website,
          description: sponsor.description,
          histories: sponsor.histories.map((h) => ({
            id: h.id,
            year: h.year,
            tier: h.tier,
          })),
        }}
        locale={locale}
      />
    </div>
  );
}
