
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function PortalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* 頂部 Banner */}
      <section
        className="px-4 py-12"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: `${SECONDARY}99` }}
          >
            ROCSAUT
          </p>

          <h1
            className="text-2xl font-bold"
            style={{ color: SECONDARY }}
          >
            Portal
          </h1>

          <p
            className="mt-2 text-sm"
            style={{ color: "#ffffffaa" }}
          >
            歡迎回來，{session.user.name ?? "會員"}
          </p>
        </div>
      </section>

      {/* Portal 功能 */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="grid gap-4">
          <Link
            href="/portal/profile"
            className="rounded-2xl bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: PRIMARY }}
            >
              個人資料
            </h2>

            <p
              className="mt-1 text-sm"
              style={{ color: "#6b7280" }}
            >
              查看及編輯你的會員資料
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
