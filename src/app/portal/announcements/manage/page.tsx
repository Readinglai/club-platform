import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { canManageAnnouncements, listAllAnnouncements } from "@/lib/announcements/manage";
import AnnouncementsManager from "./AnnouncementsManager";

const PRIMARY = "#1a2744";

export default async function ManageAnnouncementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await canManageAnnouncements(user.id))) redirect("/portal/announcements");
  const [t, rows] = await Promise.all([getTranslations("portal.manageAnnouncementsPage"), listAllAnnouncements()]);

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("intro")}</p>
        <AnnouncementsManager
          initial={rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))}
        />
      </div>
    </main>
  );
}
