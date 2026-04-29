import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAuth(4);
  const { locale } = await params;
  const t = await getTranslations("admin.departments");

  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        {t("title")}
      </h1>

      {departments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{t("emptyState")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/${locale}/admin/departments/${dept.slug}`}
              className="block rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
              style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold mb-1" style={{ color: PRIMARY }}>
                    {dept.name}
                  </h2>
                  {dept.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{dept.description}</p>
                  )}
                </div>
                <span
                  className="ml-4 shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
                >
                  {t("memberCount", { count: dept._count.members })}
                </span>
              </div>
              <div className="mt-4 text-xs font-medium" style={{ color: SECONDARY }}>
                {t("viewMembers")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
