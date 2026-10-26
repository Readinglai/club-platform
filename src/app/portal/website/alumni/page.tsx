import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { db } from "@/lib/db";
import WebsiteFrame from "../WebsiteFrame";
import AlumniManager from "./AlumniManager";

export default async function AlumniPage() {
  await requirePagePermission("content.manage");
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
    <WebsiteFrame title={t("title")} subtitle={t("count", { count: alumni.length })} wide>
      <AlumniManager alumni={alumni} />
    </WebsiteFrame>
  );
}
