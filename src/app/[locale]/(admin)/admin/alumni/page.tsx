import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AlumniManager from "./AlumniManager";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";

export default async function AdminAlumniPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const t = await getTranslations("admin.alumni");

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
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("count", { count: alumni.length })}
          </p>
        </div>
      </div>

      <AlumniManager alumni={alumni} locale={locale} />
    </div>
  );
}
