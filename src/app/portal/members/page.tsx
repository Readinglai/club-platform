import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { memberAccess } from "@/lib/membership/admin";
import { termFor } from "@/lib/membership/term";
import MembersManager from "./MembersManager";

const PRIMARY = "#1a2744";

export default async function MembersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const rights = await memberAccess(user.id);
  if (!rights.view) redirect("/portal");
  const t = await getTranslations("portal.membersPage");

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("intro")}</p>
        <MembersManager canManage={rights.manage} currentYear={termFor().startYear} />
      </div>
    </main>
  );
}
