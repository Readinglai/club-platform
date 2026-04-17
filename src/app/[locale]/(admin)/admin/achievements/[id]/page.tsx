import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import AchievementEditForm from "./AchievementEditForm";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminAchievementEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;

  const achievement = await db.achievement.findUnique({ where: { id } });
  if (!achievement) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6 text-gray-500">
        <Link href={`/${locale}/admin/achievements`} className="hover:underline">
          過往成果
        </Link>
        <span>/</span>
        <span className="truncate max-w-xs" style={{ color: PRIMARY }}>{achievement.title}</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          編輯成果
        </h1>
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${SECONDARY}33`, color: PRIMARY }}
        >
          {achievement.year}
        </span>
      </div>

      <div className="bg-white rounded-2xl border p-6 sm:p-8 shadow-sm" style={{ borderColor: "#e5e7eb" }}>
        <AchievementEditForm
          id={id}
          locale={locale}
          initial={{
            title: achievement.title,
            year: achievement.year,
            description: achievement.description,
            imageUrl: achievement.imageUrl,
          }}
        />
      </div>
    </div>
  );
}
