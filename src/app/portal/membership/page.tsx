import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { isProfileComplete } from "@/lib/membership/profile";
import MembershipPanel from "./MembershipPanel";

const PRIMARY = "#1a2744";

export default async function MembershipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isProfileComplete(user.id))) redirect("/portal/complete-profile");
  const t = await getTranslations("portal.membershipPage");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {t("title")}
        </h1>
        <MembershipPanel />
      </div>
    </main>
  );
}
