import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import { isProfileComplete } from "@/lib/membership/profile";
import MembershipPanel from "./MembershipPanel";

const PRIMARY = "#1a2744";

export default async function MembershipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await isProfileComplete(user.id))) redirect("/portal/complete-profile");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          Membership 會員
        </h1>
        <MembershipPanel />
      </div>
    </main>
  );
}
