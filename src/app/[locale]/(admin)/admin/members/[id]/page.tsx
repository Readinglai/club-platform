import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import MemberEditForm from "./MemberEditForm";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;
  const t = await getTranslations("admin.members");

  const [member, departments] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        createdAt: true,
      },
    }),
    db.department.findMany({
      orderBy: { slug: "asc" },
      select: { id: true, slug: true, name: true },
    }),
  ]);

  if (!member) notFound();

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/members`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          {t("backToMembers")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: PRIMARY }}>
        {t("editTitle")}
      </h1>
      <p className="text-sm text-gray-400 mb-8">{member.email}</p>

      <MemberEditForm
        member={{
          id: member.id,
          name: member.name,
          role: member.role,
          departmentId: member.departmentId,
        }}
        departments={departments}
        locale={locale}
      />
    </div>
  );
}
