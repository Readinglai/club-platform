import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { canManageAnnouncements } from "@/lib/announcements/manage";
import AnnouncementForm from "../AnnouncementForm";

const PRIMARY = "#1a2744";

export default async function NewAnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await canManageAnnouncements(user.id))) redirect("/portal/announcements");
  const t = await getTranslations("portal.manageAnnouncementsPage");

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("newTitle")}</h1>
        <AnnouncementForm />
      </div>
    </main>
  );
}
