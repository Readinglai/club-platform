import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { canManageAnnouncements, getAnnouncementForEditing } from "@/lib/announcements/manage";
import AnnouncementForm from "../AnnouncementForm";

const PRIMARY = "#1a2744";

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await canManageAnnouncements(user.id))) redirect("/portal/announcements");
  const [announcement, t] = await Promise.all([
    getAnnouncementForEditing((await params).id),
    getTranslations("portal.manageAnnouncementsPage"),
  ]);
  if (!announcement) notFound();

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("editTitle")}</h1>
        <AnnouncementForm
          initial={{ id: announcement.id, title: announcement.title, content: announcement.content, published: announcement.published }}
        />
      </div>
    </main>
  );
}
