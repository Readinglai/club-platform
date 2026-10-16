import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import MyTasks from "./MyTasks";

export default async function TasksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getTranslations("portal.tasksPage");

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-bold" style={{ color: "#1a2744" }}>{t("title")}</h1>
        <MyTasks />
      </div>
    </main>
  );
}
