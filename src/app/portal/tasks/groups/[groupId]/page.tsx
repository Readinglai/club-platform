import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import GroupBoard from "./GroupBoard";

export default async function GroupBoardPage({ params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { groupId } = await params;

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <GroupBoard groupId={groupId} />
      </div>
    </main>
  );
}
