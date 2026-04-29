import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import AnnouncementsTable from "./AnnouncementsTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const t = await getTranslations("admin.announcements");

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      published: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("count", { count: announcements.length })}</p>
        </div>
        <Link
          href={`/${locale}/admin/announcements/new`}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {t("createButton")}
        </Link>
      </div>

      <AnnouncementsTable
        announcements={announcements.map((a) => ({
          id: a.id,
          title: a.title,
          published: a.published,
          createdAt: a.createdAt.toISOString(),
          authorName: a.author.name ?? "—",
        }))}
        locale={locale}
      />
    </div>
  );
}
