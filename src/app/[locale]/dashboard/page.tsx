import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignOutButton } from "./SignOutButton";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { name, email, role } = session.user;
  const t = await getTranslations("dashboard");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#1a2744" }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#c9b99a33" }}
      >
        <span
          className="text-lg font-bold tracking-widest"
          style={{ color: "#c9b99a" }}
        >
          ROCSAUT
        </span>
        <SignOutButton />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col gap-6">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: "#c9b99a" }}
            >
              {t("welcomeBack")}
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#1a2744" }}
            >
              {name ?? t("defaultName")}
            </h1>
          </div>

          <div className="w-full h-px" style={{ backgroundColor: "#c9b99a" }} />

          <dl className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">Email</dt>
              <dd className="text-sm font-medium text-gray-700">{email}</dd>
            </div>

            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-gray-400 uppercase tracking-wide">
                {t("roleLabel")}
              </dt>
              <dd>
                <span
                  className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#1a274415", color: "#1a2744" }}
                >
                  {role ?? "MEMBER"}
                </span>
              </dd>
            </div>
          </dl>

          <div className="w-full h-px" style={{ backgroundColor: "#f0f0f0" }} />

          <p className="text-xs text-gray-400 text-center">
            {t("comingSoon")}
          </p>
        </div>
      </main>
    </div>
  );
}
