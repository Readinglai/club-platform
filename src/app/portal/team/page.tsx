import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import TeamManager from "./TeamManager";

const PRIMARY = "#1a2744";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("portal.teamPage");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("intro")}
        </p>
        <TeamManager />
      </div>
    </main>
  );
}
