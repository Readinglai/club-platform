import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MembersTable from "./MembersTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;

  const members = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      department: { select: { slug: true, name: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            成員管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">共 {members.length} 位成員</p>
        </div>
        <Link
          href={`/${locale}/admin/members/import`}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          批次匯入
        </Link>
      </div>

      <MembersTable
        members={members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          departmentName: m.department?.name ?? null,
          createdAt: m.createdAt.toISOString(),
        }))}
        locale={locale}
        currentUserId={session.user.id ?? ""}
      />
    </div>
  );
}
