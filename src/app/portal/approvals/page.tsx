import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import ApprovalsList from "./ApprovalsList";

const PRIMARY = "#1a2744";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          Approvals 審核
        </h1>
        <ApprovalsList />
      </div>
    </main>
  );
}
