import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import EventsList from "./EventsList";

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: "#1a2744" }}>Events 活動管理</h1>
        <EventsList />
      </div>
    </main>
  );
}
