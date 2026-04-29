import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import DepartmentMemberRow from "./DepartmentMemberRow";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { level } = await requireAuth(4);
  const { locale, slug } = await params;
  const isSuperAdmin = level >= 5;

  const t = await getTranslations("admin.departments");

  const department = await db.department.findUnique({
    where: { slug },
    include: {
      members: {
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (!department) notFound();

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={`/${locale}/admin/departments`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          {t("backToDepartments")}
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {department.name}
          </h1>
          {department.description && (
            <p className="text-sm text-gray-500 mt-1">{department.description}</p>
          )}
        </div>
        <span
          className="text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
        >
          {t("deptMemberCount", { count: department.members.length })}
        </span>
      </div>

      {!isSuperAdmin && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-xs"
          style={{ backgroundColor: `${SECONDARY}22`, color: PRIMARY }}
        >
          {t("viewModeNotice")}
        </div>
      )}

      {department.members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">{t("emptyDept")}</div>
      ) : (
        <div className="flex flex-col gap-2">
          {department.members.map((member) =>
            isSuperAdmin ? (
              <DepartmentMemberRow key={member.id} slug={slug} member={member} />
            ) : (
              <div
                key={member.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border"
                style={{ borderColor: `${SECONDARY}33`, backgroundColor: "white" }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
                    {member.name}
                  </p>
                  <p className="text-xs text-gray-400">{member.email}</p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
                >
                  {member.role}
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
