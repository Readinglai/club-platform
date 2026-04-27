/**
 * /[locale]/admin/alumni — 後台校友管理頁
 *
 * Server Component：讀取所有校友（含隱藏記錄），傳給 AlumniManager。
 * 需要登入，未登入導向 /login。
 * 不需另外驗證 role，API 層已驗證（EXEC 以上）。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import AlumniManager from "./AlumniManager";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";

export default async function AdminAlumniPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // 未登入導向登入頁
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;

  // 讀取全部校友（含 isPublic=false）
  const alumni = await db.alumni.findMany({
    orderBy: [{ graduationYear: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      graduationYear: true,
      position: true,
      department: true,
      bio: true,
      linkedinUrl: true,
      instagramUrl: true,
      photoUrl: true,
      isPublic: true,
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            校友管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {alumni.length} 筆記錄（含隱藏）
          </p>
        </div>
      </div>

      <AlumniManager alumni={alumni} locale={locale} />
    </div>
  );
}
