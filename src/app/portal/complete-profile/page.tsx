import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import { getProfileForForm } from "@/lib/membership/profile";
import CompleteProfileForm from "./CompleteProfileForm";

const PRIMARY = "#1a2744";

export default async function CompleteProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const initial = await getProfileForForm(user.id);

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          {initial.completed ? "Your profile 個人資料" : "Complete your profile 完成個人資料"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          We use this to fill in your event registrations and membership for you.
          <br />
          這些資料會自動帶入活動報名與會員申請。
        </p>
        <CompleteProfileForm email={user.email} initial={initial} />
      </div>
    </main>
  );
}
