import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import LiveDashboard from "./LiveDashboard";

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <LiveDashboard eventId={id} />
      </div>
    </main>
  );
}
