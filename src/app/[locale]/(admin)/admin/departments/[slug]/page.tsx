import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
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
          ← 部門總覽
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
          {department.members.length} 位成員
        </span>
      </div>

      {!isSuperAdmin && (
        <div
          className="mb-6 px-4 py-3 rounded-xl text-xs"
          style={{ backgroundColor: `${SECONDARY}22`, color: PRIMARY }}
        >
          角色修改需要 SUPER_ADMIN 權限。目前以檢視模式顯示。
        </div>
      )}

      {department.members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">此部門尚無成員</div>
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
