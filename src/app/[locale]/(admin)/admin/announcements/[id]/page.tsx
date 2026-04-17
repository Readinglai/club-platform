import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import AnnouncementEditForm from "./AnnouncementEditForm";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminAnnouncementDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      published: true,
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  if (!announcement) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/announcements`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          ← 公告列表
        </Link>
      </div>

      <div className="flex items-start justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          編輯公告
        </h1>
        <span className="text-xs text-gray-400">
          作者：{announcement.author.name} ·{" "}
          {announcement.createdAt.toLocaleDateString("zh-TW")}
        </span>
      </div>

      <AnnouncementEditForm
        announcement={{
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          published: announcement.published,
        }}
        locale={locale}
      />
    </div>
  );
}
