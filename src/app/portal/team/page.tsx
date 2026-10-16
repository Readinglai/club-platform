import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import TeamManager from "./TeamManager";

const PRIMARY = "#1a2744";

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          Team 團隊
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Add people to your groups by the email they log in with. They need to log in once first.
          <br />
          以登入信箱將成員加入群組，對方需先登入過一次。
        </p>
        <TeamManager />
      </div>
    </main>
  );
}
