import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getProfileForForm } from "@/lib/membership/profile";
import CompleteProfileForm from "./CompleteProfileForm";

const PRIMARY = "#1a2744";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial = await getProfileForForm(user.id);
  const t = await getTranslations("portal.completeProfile");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {initial.completed ? t("titleEdit") : t("titleNew")}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {t("intro")}
        </p>
        <CompleteProfileForm email={user.email} initial={initial} />
      </div>
    </main>
  );
}
